import React, { useEffect, useRef, useState } from 'react';
import { useMap, useMapsLibrary, AdvancedMarker } from '@vis.gl/react-google-maps';
import { LatLngLiteral, PracticeShotResult } from '../types/golf';
import { calculateDistanceYards } from '../utils/geo';
import { Crosshair, Target, Flag } from 'lucide-react';

interface PracticeShotOverlayProps {
  shotHistory: PracticeShotResult[];
  currentBallPos: LatLngLiteral;
  aimPos: LatLngLiteral;
  shotNumber: number;
  shotResult: PracticeShotResult | null;
  isHitting: boolean;
  onHitComplete: () => void;
  pinPosition: LatLngLiteral;
  isPracticeMode: boolean;
  onSetAimPos?: (pos: LatLngLiteral) => void;
}

export const PracticeShotOverlay: React.FC<PracticeShotOverlayProps> = ({
  shotHistory,
  currentBallPos,
  aimPos,
  shotNumber,
  shotResult,
  isHitting,
  onHitComplete,
  pinPosition,
  isPracticeMode,
}) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  const historyPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const aimPolylineRef = useRef<google.maps.Polyline | null>(null);
  const activeTracerRef = useRef<google.maps.Polyline | null>(null);
  const toPinLineRef = useRef<google.maps.Polyline | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [activeBallPos, setActiveBallPos] = useState<LatLngLiteral | null>(null);
  const [flightProgress, setFlightProgress] = useState<number>(0);
  const [hasLanded, setHasLanded] = useState<boolean>(false);

  // 1. Draw Historical Shots (Shot 1, Shot 2, etc. that were already played)
  useEffect(() => {
    if (!map || !mapsLib) return;

    // Clear old historical polylines
    historyPolylinesRef.current.forEach((p) => p.setMap(null));
    historyPolylinesRef.current = [];

    if (!isPracticeMode || shotHistory.length === 0) return;

    shotHistory.forEach((h, idx) => {
      const poly = new google.maps.Polyline({
        path: h.trajectory,
        geodesic: true,
        strokeColor: '#D4AF37', // Refined gold for historic shots
        strokeOpacity: 0.75,
        strokeWeight: 3.5,
        map,
        zIndex: 50 + idx,
      });
      historyPolylinesRef.current.push(poly);
    });

    return () => {
      historyPolylinesRef.current.forEach((p) => p.setMap(null));
      historyPolylinesRef.current = [];
    };
  }, [shotHistory, isPracticeMode, map, mapsLib]);

  // 2. Aim Line (from current ball lie to aim target before hitting)
  useEffect(() => {
    if (!map || !mapsLib || !isPracticeMode || isHitting || shotResult) {
      if (aimPolylineRef.current) {
        aimPolylineRef.current.setMap(null);
        aimPolylineRef.current = null;
      }
      return;
    }

    if (!aimPolylineRef.current) {
      aimPolylineRef.current = new google.maps.Polyline({
        path: [currentBallPos, aimPos],
        geodesic: true,
        strokeColor: '#8FB062',
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 2.5,
              strokeColor: '#8FB062',
            },
            offset: '0',
            repeat: '10px',
          },
        ],
        map,
        zIndex: 52,
      });
    } else {
      aimPolylineRef.current.setPath([currentBallPos, aimPos]);
      aimPolylineRef.current.setMap(map);
    }

    return () => {
      if (aimPolylineRef.current) {
        aimPolylineRef.current.setMap(null);
        aimPolylineRef.current = null;
      }
    };
  }, [currentBallPos, aimPos, isPracticeMode, isHitting, shotResult, map, mapsLib]);

  // 3. Active Shot Flight & Tracer Animation
  useEffect(() => {
    if (!map || !mapsLib || !isPracticeMode) {
      if (activeTracerRef.current) {
        activeTracerRef.current.setMap(null);
        activeTracerRef.current = null;
      }
      if (toPinLineRef.current) {
        toPinLineRef.current.setMap(null);
        toPinLineRef.current = null;
      }
      setActiveBallPos(null);
      setFlightProgress(0);
      setHasLanded(false);
      return;
    }

    if (!shotResult) {
      // No active hit: clear active tracer & toPin line
      if (activeTracerRef.current) {
        activeTracerRef.current.setMap(null);
        activeTracerRef.current = null;
      }
      if (toPinLineRef.current) {
        toPinLineRef.current.setMap(null);
        toPinLineRef.current = null;
      }
      setActiveBallPos(null);
      setFlightProgress(0);
      setHasLanded(false);
      return;
    }

    // Steady state after animation or replay
    if (!isHitting) {
      setActiveBallPos(shotResult.landingPos);
      setHasLanded(true);

      if (!activeTracerRef.current) {
        activeTracerRef.current = new google.maps.Polyline({
          path: shotResult.trajectory,
          geodesic: true,
          strokeColor: '#FFFFFF',
          strokeOpacity: 0.95,
          strokeWeight: 4,
          map,
          zIndex: 60,
        });
      } else {
        activeTracerRef.current.setPath(shotResult.trajectory);
        activeTracerRef.current.setMap(map);
      }

      // Draw dashed connector line to pin
      if (!toPinLineRef.current) {
        toPinLineRef.current = new google.maps.Polyline({
          path: [shotResult.landingPos, pinPosition],
          geodesic: true,
          strokeColor: '#C2921D',
          strokeOpacity: 0.85,
          strokeWeight: 2,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 2,
                strokeColor: '#C2921D',
              },
              offset: '0',
              repeat: '8px',
            },
          ],
          map,
          zIndex: 55,
        });
      } else {
        toPinLineRef.current.setPath([shotResult.landingPos, pinPosition]);
        toPinLineRef.current.setMap(map);
      }
      return;
    }

    // New hit initiated: start animation
    setHasLanded(false);
    setActiveBallPos(shotResult.startPos);
    setFlightProgress(0);

    if (toPinLineRef.current) {
      toPinLineRef.current.setMap(null);
    }

    if (activeTracerRef.current) {
      activeTracerRef.current.setMap(null);
    }
    activeTracerRef.current = new google.maps.Polyline({
      path: [shotResult.startPos],
      geodesic: true,
      strokeColor: '#FFFFFF',
      strokeOpacity: 0.95,
      strokeWeight: 4.5,
      map,
      zIndex: 65,
    });

    const startTime = performance.now();
    const durationMs = 1600; // 1.6 second ball flight
    const totalPoints = shotResult.trajectory.length;

    const animateFlight = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(1, elapsed / durationMs);
      const progress = 1 - Math.pow(1 - rawProgress, 2.5);

      setFlightProgress(progress);

      const targetIndex = Math.min(
        totalPoints - 1,
        Math.floor(progress * (totalPoints - 1))
      );

      const progressivePath = shotResult.trajectory.slice(0, targetIndex + 1);
      if (activeTracerRef.current) {
        activeTracerRef.current.setPath(progressivePath);
      }

      const activeCoord = shotResult.trajectory[targetIndex] || shotResult.landingPos;
      setActiveBallPos(activeCoord);

      if (rawProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animateFlight);
      } else {
        // Landing complete
        setActiveBallPos(shotResult.landingPos);
        setHasLanded(true);

        if (toPinLineRef.current) {
          toPinLineRef.current.setPath([shotResult.landingPos, pinPosition]);
          toPinLineRef.current.setMap(map);
        } else {
          toPinLineRef.current = new google.maps.Polyline({
            path: [shotResult.landingPos, pinPosition],
            geodesic: true,
            strokeColor: '#C2921D',
            strokeOpacity: 0.85,
            strokeWeight: 2,
            icons: [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 1,
                  scale: 2,
                  strokeColor: '#C2921D',
                },
                offset: '0',
                repeat: '8px',
              },
            ],
            map,
            zIndex: 55,
          });
        }

        onHitComplete();
      }
    };

    animFrameRef.current = requestAnimationFrame(animateFlight);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [shotResult, isHitting, isPracticeMode, map, mapsLib, pinPosition, onHitComplete]);

  // Clean up overlays on unmount
  useEffect(() => {
    return () => {
      if (activeTracerRef.current) activeTracerRef.current.setMap(null);
      if (toPinLineRef.current) toPinLineRef.current.setMap(null);
      if (aimPolylineRef.current) aimPolylineRef.current.setMap(null);
      historyPolylinesRef.current.forEach((p) => p.setMap(null));
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  if (!isPracticeMode) return null;

  const aimedDistance = calculateDistanceYards(currentBallPos, aimPos);

  return (
    <>
      {/* 1. Historical Shot Landing Badges */}
      {shotHistory.map((h) => (
        <AdvancedMarker
          key={`hist-${h.shotNumber}`}
          position={h.landingPos}
          zIndex={54}
          title={`Shot ${h.shotNumber} Landing`}
        >
          <div className="flex flex-col items-center -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-5 h-5 rounded-full bg-[#1B291A] border-2 border-[#D4AF37] text-[#D4AF37] text-[10px] font-black flex items-center justify-center shadow-md">
              {h.shotNumber}
            </div>
          </div>
        </AdvancedMarker>
      ))}

      {/* 2. Aim Target Marker (when not currently hitting) */}
      {!shotResult && !isHitting && (
        <AdvancedMarker
          position={aimPos}
          zIndex={58}
          title={`Practice Aim Target: ${aimedDistance} yards`}
        >
          <div className="flex flex-col items-center -translate-x-1/2 -translate-y-full -mt-1 pointer-events-auto cursor-pointer group">
            <div className="px-2.5 py-1 rounded-xl bg-[#1B291A]/95 text-[#8FB062] border border-[#8FB062]/50 shadow-lg text-[10px] font-black flex items-center gap-1 transition-transform group-hover:scale-105 backdrop-blur-xs whitespace-nowrap">
              <Crosshair className="w-3 h-3 text-[#8FB062]" />
              <span>
                AIM: {aimedDistance < 10 ? `${Math.round(aimedDistance * 3)} FT` : `${aimedDistance} YDS`}
              </span>
            </div>
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#1B291A]" />
          </div>
        </AdvancedMarker>
      )}

      {/* 3. Ball Marker at Current Lie (before shot is hit) */}
      {!shotResult && !isHitting && (
        <AdvancedMarker
          position={currentBallPos}
          zIndex={60}
          title={`Ball Lie for Shot ${shotNumber}`}
        >
          <div className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-4 h-4 rounded-full border-2 border-[#1B291A] bg-white shadow-lg flex items-center justify-center ring-2 ring-[#8FB062]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2C421C]" />
            </div>
            <div className="absolute -bottom-5.5 whitespace-nowrap px-2 py-0.5 rounded-md bg-[#1B291A]/90 text-white text-[9px] font-extrabold border border-white/20">
              Shot {shotNumber} Lie
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* 4. Animated Moving Ball (during flight) */}
      {isHitting && activeBallPos && (
        <AdvancedMarker position={activeBallPos} zIndex={75}>
          <div className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div
              className="absolute w-5 h-5 rounded-full bg-black/40 blur-xs transition-transform"
              style={{
                transform: `scale(${1 + Math.sin(flightProgress * Math.PI) * 0.8}) translateY(${
                  Math.sin(flightProgress * Math.PI) * 12
                }px)`,
              }}
            />
            <div
              className="w-4 h-4 rounded-full border border-gray-200 bg-white shadow-lg flex items-center justify-center scale-125"
              style={{
                boxShadow: '0 0 14px rgba(255, 255, 255, 0.95), 0 0 4px rgba(0,0,0,0.5)',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* 5. Ball Landed Marker & Result Lie Badge */}
      {shotResult && hasLanded && (
        <AdvancedMarker
          position={shotResult.landingPos}
          zIndex={80}
          title={`Shot ${shotResult.shotNumber} Result: ${shotResult.lie.toUpperCase()}`}
        >
          <div
            role="status"
            aria-live="polite"
            aria-label={`Shot ${shotResult.shotNumber} landed: ${shotResult.actualCarryYards} yards carry, ${shotResult.lie} lie, ${shotResult.distanceToPinFeet} feet to pin`}
            className="flex flex-col items-center -translate-x-1/2 -translate-y-full -mt-2.5 pointer-events-auto cursor-pointer group"
          >
            <div
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide text-white shadow-2xl border flex items-center gap-1.5 transition-transform group-hover:scale-105 whitespace-nowrap ${
                shotResult.lie === 'holed'
                  ? 'bg-[#8FB062] text-[#1B291A] border-white shadow-[0_0_20px_rgba(143,176,98,0.9)] animate-bounce'
                  : shotResult.lie === 'green'
                  ? 'bg-[#2C421C] border-[#8FB062]'
                  : shotResult.lie === 'bunker'
                  ? 'bg-[#73520A] border-[#C2921D]'
                  : shotResult.lie === 'ocean'
                  ? 'bg-[#1E3A5F] border-[#60A5FA]'
                  : 'bg-[#1B291A] border-white/40'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>
                {shotResult.lie === 'holed'
                  ? `HOLED OUT (SHOT ${shotResult.shotNumber})! ⛳`
                  : shotResult.lie === 'green'
                  ? `GREEN (${shotResult.distanceToPinFeet} FT TO CUP)`
                  : shotResult.lie === 'bunker'
                  ? `BUNKER (${shotResult.distanceToPinYards}Y TO PIN)`
                  : shotResult.lie === 'ocean'
                  ? `HAZARD (${shotResult.actualCarryYards}Y CARRY)`
                  : `SHOT ${shotResult.shotNumber}: ${shotResult.actualCarryYards}Y (${shotResult.distanceToPinYards}Y TO PIN)`}
              </span>
            </div>
            <div
              className={`w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${
                shotResult.lie === 'holed'
                  ? 'border-t-[#8FB062]'
                  : shotResult.lie === 'green'
                  ? 'border-t-[#2C421C]'
                  : shotResult.lie === 'bunker'
                  ? 'border-t-[#73520A]'
                  : shotResult.lie === 'ocean'
                  ? 'border-t-[#1E3A5F]'
                  : 'border-t-[#1B291A]'
              }`}
            />
          </div>
        </AdvancedMarker>
      )}
    </>
  );
};
