import React, { useEffect, useRef } from 'react';
import { Camera3DState, project3DToScreen, ScreenPoint } from '../utils/projection3d';

interface FlightTracerOverlayProps {
  isActive: boolean;
  trajectory3D: { lat: number; lng: number; altitude: number }[] | null;
  getCamera: () => Camera3DState;
  peakAltitudeFt: number;
  actualCarryYards: number;
  ballSpeedMph: number;
  onFlightComplete: () => void;
  onProgressUpdate: (stats: {
    distanceSoFar: number;
    peakAltitude: number;
    progress: number;
    ballSpeedMph: number;
  }) => void;
}

export const FlightTracerOverlay: React.FC<FlightTracerOverlayProps> = ({
  isActive,
  trajectory3D,
  getCamera,
  peakAltitudeFt,
  actualCarryYards,
  ballSpeedMph,
  onFlightComplete,
  onProgressUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const flightStateRef = useRef<{
    startTime: number;
    progress: number;
    isCompleted: boolean;
    landingPoint: ScreenPoint | null;
    impactStart: number | null;
  }>({
    startTime: 0,
    progress: 0,
    isCompleted: false,
    landingPoint: null,
    impactStart: null,
  });

  const getCameraRef = useRef(getCamera);
  getCameraRef.current = getCamera;

  const onFlightCompleteRef = useRef(onFlightComplete);
  onFlightCompleteRef.current = onFlightComplete;

  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    if (!isActive || !trajectory3D || trajectory3D.length < 2) {
      // Clear any previous overlay immediately so no flat line or artifacts linger on screen
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return () => {
        window.removeEventListener('resize', updateCanvasSize);
      };
    }

    // Initialize in-flight animation
    flightStateRef.current = {
      startTime: performance.now(),
      progress: 0,
      isCompleted: false,
      landingPoint: null,
      impactStart: null,
    };

    const durationMs = 2400; // 2.4 seconds flight time
    const totalPts = trajectory3D.length;

    const render = (now: number) => {
      const elapsed = now - flightStateRef.current.startTime;
      const rawProgress = Math.min(1, elapsed / durationMs);
      // Realistic flight easing (initial high velocity, slight aerodynamic hang-time, drop)
      const progress = Math.min(1, Math.pow(rawProgress, 0.95));
      flightStateRef.current.progress = progress;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);

      const camera = getCameraRef.current();

      // Project all 3D trajectory points up to current flight point
      const currentIdx = Math.max(0, Math.min(totalPts - 1, Math.floor(progress * (totalPts - 1))));
      const activePts: ScreenPoint[] = [];

      for (let i = 0; i <= currentIdx; i++) {
        const pt = trajectory3D[i];
        if (pt) {
          const sp = project3DToScreen(pt, camera, width, height);
          if (sp) {
            activePts.push(sp);
          }
        }
      }

      // Interpolate leading head point between currentIdx and currentIdx + 1
      const fractional = progress * (totalPts - 1) - Math.floor(progress * (totalPts - 1));
      let headPt: ScreenPoint | null = null;
      if (currentIdx < totalPts - 1 && trajectory3D[currentIdx] && trajectory3D[currentIdx + 1]) {
        const p1 = trajectory3D[currentIdx];
        const p2 = trajectory3D[currentIdx + 1];
        if (p1 && p2 && typeof p1.lat === 'number' && typeof p2.lat === 'number') {
          const interpLat = p1.lat + (p2.lat - p1.lat) * fractional;
          const interpLng = p1.lng + (p2.lng - p1.lng) * fractional;
          const interpAlt = (p1.altitude || 0) + ((p2.altitude || 0) - (p1.altitude || 0)) * fractional;
          headPt = project3DToScreen({ lat: interpLat, lng: interpLng, altitude: interpAlt }, camera, width, height);
        }
      } else if (activePts.length > 0) {
        headPt = activePts[activePts.length - 1];
      }

      if (headPt && activePts.length > 0) {
        activePts.push(headPt);
      }

      // 1. Draw Apex Pill Indicator once ball reaches peak flight (only for airborne shots)
      if (peakAltitudeFt > 0 && progress > 0.35 && progress < 0.95 && activePts.length > 4) {
        const apexIdx = Math.max(0, Math.min(totalPts - 1, Math.floor(totalPts * 0.48)));
        const apexPoint = trajectory3D[apexIdx];
        if (apexPoint) {
          const apexPt = project3DToScreen(apexPoint, camera, width, height);
          if (apexPt) {
            ctx.save();
          // Subtle dashed altitude line to ground
          ctx.beginPath();
          ctx.setLineDash([3, 3]);
          ctx.moveTo(apexPt.x, apexPt.y);
          ctx.lineTo(apexPt.x, apexPt.y + 24);
          ctx.strokeStyle = 'rgba(212, 163, 28, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Apex label badge
          const label = `Apex ${peakAltitudeFt} ft`;
          ctx.font = 'bold 11px system-ui, sans-serif';
          const textWidth = ctx.measureText(label).width;
          const px = apexPt.x - textWidth / 2 - 8;
          const py = apexPt.y - 18;

          ctx.fillStyle = 'rgba(27, 41, 26, 0.9)';
          ctx.strokeStyle = '#D4A31C';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(px, py, textWidth + 16, 18, 6);
          } else {
            ctx.rect(px, py, textWidth + 16, 18);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FACC15';
          ctx.fillText(label, px + 8, py + 13);
          ctx.restore();
          }
        }
      }

      // 2. Note: Golf ball is rendered directly in Google Maps 3D space as a native 3D element 
      // synchronously attached to the leading tip of the green polyline trace, ensuring 100% geometric alignment.

      // 3. Update live telemetry stats for HUD
      const curDist = Math.round(actualCarryYards * progress);
      const curApexFt = peakAltitudeFt > 0 ? Math.round(Math.sin(progress * Math.PI) * peakAltitudeFt) : 0;
      onProgressUpdateRef.current({
        distanceSoFar: curDist,
        peakAltitude: curApexFt,
        progress,
        ballSpeedMph,
      });

      // 4. Flight Completion
      if (progress >= 1) {
        if (!flightStateRef.current.isCompleted) {
          flightStateRef.current.isCompleted = true;
          onFlightCompleteRef.current();
        }
      } else {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isActive, trajectory3D, peakAltitudeFt, actualCarryYards, ballSpeedMph]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Golf ball flight tracer animation, carry distance ${actualCarryYards} yards, peak altitude ${peakAltitudeFt} feet`}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
    />
  );
};
