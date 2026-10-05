import React, { useEffect, useState } from 'react';
import { GolfHole } from '../types/golf';
import { Mountain, Map as MapIcon, Compass, CheckCircle2, Sparkles } from 'lucide-react';

interface GolfTransitionOverlayProps {
  isVisible: boolean;
  targetMode: '3d' | '2d';
  hole: GolfHole;
  is3DReady?: boolean;
  onTransitionComplete?: () => void;
}

export const GolfTransitionOverlay: React.FC<GolfTransitionOverlayProps> = ({
  isVisible,
  targetMode,
  hole,
  is3DReady = true,
  onTransitionComplete,
}) => {
  const [progress, setProgress] = useState<number>(15);
  const [statusMessage, setStatusMessage] = useState<string>('Locking GPS coordinates...');
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [shouldRender, setShouldRender] = useState<boolean>(isVisible);
  const [opacityClass, setOpacityClass] = useState<string>('opacity-0 pointer-events-none');

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Fast frame to trigger opacity transition
      const frame = requestAnimationFrame(() => {
        setOpacityClass('opacity-100 pointer-events-auto');
      });

      setProgress(25);
      setStatusMessage(
        targetMode === '3d'
          ? 'Acquiring Monterey Bay 3D mesh...'
          : 'Calibrating 2D satellite coordinates...'
      );
      setStepIndex(0);

      const t1 = setTimeout(() => {
        setProgress(65);
        setStepIndex(1);
        setStatusMessage(
          targetMode === '3d'
            ? 'Pre-fetching photorealistic elevation tiles...'
            : 'Loading tactical course overlays...'
        );
      }, 250);

      const t2 = setTimeout(() => {
        setProgress(90);
        setStepIndex(2);
        setStatusMessage(
          targetMode === '3d'
            ? 'Aligning tee-to-green camera trajectory...'
            : 'Synchronizing rangefinder pins...'
        );
      }, 500);

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isVisible, targetMode]);

  // When 3D is ready and min animation time elapsed, complete transition
  useEffect(() => {
    if (!isVisible) {
      setOpacityClass('opacity-0 pointer-events-none');
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 450);
      return () => clearTimeout(timer);
    }

    if (isVisible && is3DReady) {
      const finishTimer = setTimeout(() => {
        setProgress(100);
        setStepIndex(2);
        setStatusMessage('Perspective ready!');

        // Smooth fade out
        const fadeTimer = setTimeout(() => {
          setOpacityClass('opacity-0 pointer-events-none');
          const completeTimer = setTimeout(() => {
            onTransitionComplete?.();
            setShouldRender(false);
          }, 350);
          return () => clearTimeout(completeTimer);
        }, 200);

        return () => clearTimeout(fadeTimer);
      }, 650);

      return () => clearTimeout(finishTimer);
    }

    // Safety fallback: dismiss after 2.6s maximum even if ready signal was missed
    const fallbackTimer = setTimeout(() => {
      setProgress(100);
      setOpacityClass('opacity-0 pointer-events-none');
      const completeTimer = setTimeout(() => {
        onTransitionComplete?.();
        setShouldRender(false);
      }, 350);
      return () => clearTimeout(completeTimer);
    }, 2600);

    return () => clearTimeout(fallbackTimer);
  }, [isVisible, is3DReady, onTransitionComplete]);

  if (!shouldRender) return null;

  const is3D = targetMode === '3d';

  return (
    <div
      id="golf-mode-transition-curtain"
      role="status"
      aria-live="polite"
      aria-label={is3D ? 'Loading 3D Photorealistic Mesh' : 'Returning to Tactical 2D Overhead'}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#091108]/95 backdrop-blur-xl transition-opacity duration-350 ease-out select-none ${opacityClass}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 45%, rgba(143, 176, 98, 0.18) 0%, rgba(9, 17, 8, 0.98) 75%),
          radial-gradient(circle at 80% 20%, rgba(212, 163, 28, 0.08) 0%, transparent 50%)
        `,
      }}
    >
      {/* Subtle Background Contour Wireframe SVG */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
      >
        <path d="M0,150 Q250,50 500,160 T1000,120" fill="none" stroke="#A3E635" strokeWidth="1.5" />
        <path d="M0,250 Q300,180 600,280 T1000,220" fill="none" stroke="#A3E635" strokeWidth="1.5" />
        <path d="M0,350 Q200,420 500,340 T1000,390" fill="none" stroke="#A3E635" strokeWidth="1.5" />
        <path d="M0,450 Q350,380 700,490 T1000,440" fill="none" stroke="#A3E635" strokeWidth="1.5" />
      </svg>

      {/* Main Center Card */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm px-6 py-8">
        {/* Animated Golf Ball & Elevation Radar Centerpiece */}
        <div className="relative w-28 h-28 flex items-center justify-center mb-6">
          {/* Outer Pulse Rings simulating terrain laser scanner */}
          <div className="absolute inset-0 rounded-full border border-[#8FB062]/60 animate-golf-pulse" />
          <div className="absolute inset-2 rounded-full border border-[#A3E635]/40 animate-golf-pulse-delayed" />

          {/* Radar Sweep Ring */}
          <div className="absolute -inset-1.5 rounded-full border border-[#8FB062]/25 pointer-events-none">
            <div className="w-full h-full rounded-full border-t-2 border-r-2 border-[#A3E635] animate-golf-radar" />
          </div>

          {/* Rangefinder Corner Reticles */}
          <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#D4A31C]" />
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#D4A31C]" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#D4A31C]" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#D4A31C]" />

          {/* Themed Dimpled Golf Ball with Spin & Shadow */}
          <div className="relative w-18 h-18 rounded-full shadow-2xl flex items-center justify-center bg-gradient-to-br from-[#FFFFFF] via-[#F1EDE2] to-[#CBD5E1] border border-white/80 animate-golf-spin">
            <svg
              viewBox="0 0 100 100"
              className="w-16 h-16 opacity-85"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Dimple Lattice Pattern */}
              <g fill="#94A3B8" fillOpacity="0.45">
                {/* Center Cluster */}
                <circle cx="50" cy="50" r="4" />
                <circle cx="50" cy="36" r="3.5" />
                <circle cx="50" cy="64" r="3.5" />
                <circle cx="36" cy="50" r="3.5" />
                <circle cx="64" cy="50" r="3.5" />
                {/* Inner Ring */}
                <circle cx="40" cy="40" r="3.2" />
                <circle cx="60" cy="40" r="3.2" />
                <circle cx="40" cy="60" r="3.2" />
                <circle cx="60" cy="60" r="3.2" />
                {/* Middle Ring */}
                <circle cx="50" cy="24" r="3" />
                <circle cx="50" cy="76" r="3" />
                <circle cx="24" cy="50" r="3" />
                <circle cx="76" cy="50" r="3" />
                <circle cx="32" cy="32" r="3" />
                <circle cx="68" cy="32" r="3" />
                <circle cx="32" cy="68" r="3" />
                <circle cx="68" cy="68" r="3" />
                {/* Outer Ring */}
                <circle cx="50" cy="14" r="2.5" />
                <circle cx="50" cy="86" r="2.5" />
                <circle cx="14" cy="50" r="2.5" />
                <circle cx="86" cy="50" r="2.5" />
                <circle cx="24" cy="24" r="2.5" />
                <circle cx="76" cy="24" r="2.5" />
                <circle cx="24" cy="76" r="2.5" />
                <circle cx="76" cy="76" r="2.5" />
              </g>
              {/* Spherical Specular Highlight */}
              <circle cx="38" cy="38" r="8" fill="#FFFFFF" fillOpacity="0.8" />
            </svg>
          </div>

          {/* Floating Mode Icon Pill */}
          <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-[#162415] border border-[#8FB062] flex items-center gap-1 shadow-md">
            {is3D ? (
              <>
                <Mountain className="w-3 h-3 text-[#8FB062]" />
                <span className="text-[10px] font-bold tracking-wider text-[#A3E635] uppercase">3D Terrain</span>
              </>
            ) : (
              <>
                <MapIcon className="w-3 h-3 text-[#8FB062]" />
                <span className="text-[10px] font-bold tracking-wider text-[#F1EDE2] uppercase">2D Tactical</span>
              </>
            )}
          </div>
        </div>

        {/* Hole Information & Telemetry Badge */}
        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-[#1B291A] border border-[#2D3E2B] text-[#D4A31C]">
            <Compass className="w-3.5 h-3.5 text-[#D4A31C]" />
            {hole.courseName} • Hole #{hole.holeNumber}
          </span>
        </div>

        {/* Action Header */}
        <h2 className="text-xl font-bold text-[#F1EDE2] mb-1.5 tracking-tight flex items-center justify-center gap-2">
          {is3D ? 'Loading 3D Photorealistic Mesh' : 'Returning to Tactical 2D Overhead'}
        </h2>

        <p className="text-xs text-[#A8B89F] leading-relaxed mb-5">
          {statusMessage}
        </p>

        {/* Sleek Progress Track with Moving Marker */}
        <div className="w-full bg-[#152014] rounded-full h-2 p-0.5 border border-[#2D3E2B] mb-5 relative overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8FB062] via-[#A3E635] to-[#D4A31C] transition-all duration-300 ease-out shadow-xs"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Telemetry Status Checklist */}
        <div className="grid grid-cols-3 gap-2 w-full text-center text-[10px] text-[#A8B89F] border-t border-[#1F2D1E] pt-4">
          <div className="flex flex-col items-center gap-1">
            <span className="font-semibold text-[#F1EDE2]">Tee Elevation</span>
            <span className="text-[#8FB062] font-bold">107 ft MSL</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-x border-[#1F2D1E] px-1">
            <span className="font-semibold text-[#F1EDE2]">Green Drop</span>
            <span className="text-[#D4A31C] font-bold">-35 ft (-11 yds)</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-semibold text-[#F1EDE2]">3D Terrain</span>
            <span className="text-[#A3E635] font-bold flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              {stepIndex >= 2 ? 'Calibrated' : 'Streaming'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
