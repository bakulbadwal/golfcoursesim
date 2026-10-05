import React, { useState, useCallback, useEffect } from 'react';
import {
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import { GolfHole, LatLngLiteral, TeeOption, Hazard, StrategyType, PracticeShotResult } from '../types/golf';
import { MapOverlays } from './MapOverlays';
import { MapControls } from './MapControls';
import { CameraControls } from './CameraControls';
import { PracticeShotOverlay } from './PracticeShotOverlay';
import { Flag, Crosshair, Target, Shield, Zap } from 'lucide-react';
import { calculateDistanceYards } from '../utils/geo';
import { useIsMobile, useIsTablet } from '../utils/useIsMobile';

interface GolfMapProps {
  apiKey: string;
  hole: GolfHole;
  selectedTee: TeeOption;
  targetPosition: LatLngLiteral;
  onSetTarget: (pos: LatLngLiteral) => void;
  mapTypeId: string;
  onMapTypeChange: (type: string) => void;
  showRings: boolean;
  onToggleRings: () => void;
  showFlightArc: boolean;
  onToggleFlightArc: () => void;
  showHazards: boolean;
  onToggleHazards: () => void;
  is3DMode?: boolean;
  onToggle3DMode?: () => void;
  onSelectHazard?: (hazard: Hazard) => void;
  strategy?: StrategyType;
  layupPosition?: LatLngLiteral;
  onSetLayupPosition?: (pos: LatLngLiteral) => void;
  activeEditingShot?: 1 | 2;
  practiceShotResult?: PracticeShotResult | null;
  isHittingPracticeShot?: boolean;
  onPracticeHitComplete?: () => void;
  isPracticeMode?: boolean;
  onTogglePracticeMode?: () => void;
  practiceBallPos?: LatLngLiteral;
  practiceAimPos?: LatLngLiteral;
  onSetPracticeAimPos?: (pos: LatLngLiteral) => void;
  practiceShotNumber?: number;
  practiceShotHistory?: PracticeShotResult[];
  activeMobilePanel?: 'planner' | 'caddie' | 'camera' | 'overlays' | null;
  onSetActiveMobilePanel?: (panel: 'planner' | 'caddie' | 'camera' | 'overlays' | null) => void;
  isSinglePanelMode?: boolean;
}

// Controller component to handle camera fly-tos when hole changes
const CameraController: React.FC<{
  hole: GolfHole;
  selectedTee: TeeOption;
  mapTypeId: string;
}> = ({ hole, selectedTee, mapTypeId }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(hole.defaultCenter);
    map.setZoom(hole.defaultZoom);
    map.setHeading(hole.defaultHeading);
    map.setTilt(0); // 2D overhead view by default
  }, [map, hole]);

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapTypeId);
  }, [map, mapTypeId]);

  return null;
};

// Controller component for smooth WASD & Arrow key camera navigation in 2D view
const WASDCameraController: React.FC<{ is3DMode?: boolean }> = ({ is3DMode = false }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || is3DMode) return;

    const pressedKeys = new Set<string>();
    let animId: number | null = null;
    let lastTime = 0;

    const isInputFocused = () => {
      const active = document.activeElement;
      if (!active) return false;
      const tag = active.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (active as HTMLElement).isContentEditable
      );
    };

    const updatePan = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;

      // Throttle pan steps to ~25ms for fluid, responsive 2D Google Maps panning
      if (delta >= 25) {
        lastTime = time;

        const isShift = pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight');
        // Standard speed: 20px per 25ms (~800px/sec), Boost speed with Shift: 40px per 25ms
        const step = isShift ? 40 : 20;

        let dx = 0;
        let dy = 0;

        if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) dy -= step;
        if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) dy += step;
        if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) dx -= step;
        if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) dx += step;

        if (dx !== 0 || dy !== 0) {
          map.panBy(dx, dy);
        }
      }

      if (pressedKeys.size > 0) {
        animId = requestAnimationFrame(updatePan);
      } else {
        animId = null;
        lastTime = 0;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      const code = e.code;
      const key = e.key.toLowerCase();

      const isNavKey =
        code === 'KeyW' ||
        code === 'KeyS' ||
        code === 'KeyA' ||
        code === 'KeyD' ||
        key === 'w' ||
        key === 's' ||
        key === 'a' ||
        key === 'd' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'ShiftLeft' ||
        code === 'ShiftRight';

      if (!isNavKey) return;

      if (code.startsWith('Arrow')) {
        e.preventDefault();
      }

      const normalizedCode =
        key === 'w' ? 'KeyW' :
        key === 's' ? 'KeyS' :
        key === 'a' ? 'KeyA' :
        key === 'd' ? 'KeyD' : code;

      if (!pressedKeys.has(normalizedCode)) {
        pressedKeys.add(normalizedCode);

        // Immediate responsive nudge on first press
        let initialDx = 0;
        let initialDy = 0;
        const initialStep = e.shiftKey ? 45 : 25;
        if (normalizedCode === 'KeyW' || normalizedCode === 'ArrowUp') initialDy -= initialStep;
        if (normalizedCode === 'KeyS' || normalizedCode === 'ArrowDown') initialDy += initialStep;
        if (normalizedCode === 'KeyA' || normalizedCode === 'ArrowLeft') initialDx -= initialStep;
        if (normalizedCode === 'KeyD' || normalizedCode === 'ArrowRight') initialDx += initialStep;

        if (initialDx !== 0 || initialDy !== 0) {
          map.panBy(initialDx, initialDy);
        }
      }

      if (animId === null) {
        lastTime = performance.now();
        animId = requestAnimationFrame(updatePan);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();
      const normalizedCode =
        key === 'w' ? 'KeyW' :
        key === 's' ? 'KeyS' :
        key === 'a' ? 'KeyA' :
        key === 'd' ? 'KeyD' : code;

      pressedKeys.delete(normalizedCode);
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        pressedKeys.delete('ShiftLeft');
        pressedKeys.delete('ShiftRight');
      }

      if (pressedKeys.size === 0 && animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
        lastTime = 0;
      }
    };

    const handleBlur = () => {
      pressedKeys.clear();
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
        lastTime = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
    };
  }, [map, is3DMode]);

  return null;
};

export const GolfMap: React.FC<GolfMapProps> = ({
  apiKey,
  hole,
  selectedTee,
  targetPosition,
  onSetTarget,
  mapTypeId,
  onMapTypeChange,
  showRings,
  onToggleRings,
  showFlightArc,
  onToggleFlightArc,
  showHazards,
  onToggleHazards,
  is3DMode = false,
  onToggle3DMode,
  onSelectHazard,
  strategy = '2-shot',
  layupPosition,
  onSetLayupPosition,
  activeEditingShot = 1,
  practiceShotResult,
  isHittingPracticeShot = false,
  onPracticeHitComplete,
  isPracticeMode = false,
  onTogglePracticeMode,
  practiceBallPos,
  practiceAimPos,
  onSetPracticeAimPos,
  practiceShotNumber = 1,
  practiceShotHistory = [],
  activeMobilePanel = null,
  onSetActiveMobilePanel,
  isSinglePanelMode,
}) => {
  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const clickedPos = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };

        if (isPracticeMode && onSetPracticeAimPos) {
          onSetPracticeAimPos(clickedPos);
          return;
        }

        if (strategy === '3-shot') {
          if (activeEditingShot === 1 && onSetLayupPosition) {
            onSetLayupPosition(clickedPos);
          } else {
            onSetTarget(clickedPos);
          }
        } else {
          onSetTarget(clickedPos);
        }
      }
    },
    [isPracticeMode, onSetPracticeAimPos, strategy, activeEditingShot, onSetLayupPosition, onSetTarget]
  );

  const teeToLayupDist = layupPosition
    ? calculateDistanceYards(selectedTee.position, layupPosition)
    : 70;
  const teeToTargetDist = calculateDistanceYards(selectedTee.position, targetPosition);
  const layupToTargetDist = layupPosition
    ? calculateDistanceYards(layupPosition, targetPosition)
    : 35;

  const isTargetAtPin =
    Math.abs(targetPosition.lat - hole.pinPosition.lat) < 0.00002 &&
    Math.abs(targetPosition.lng - hole.pinPosition.lng) < 0.00002;

  // Track mobile and tablet viewports for layout and mutual panel exclusivity
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const shouldEnforceSinglePanel = isSinglePanelMode !== undefined ? isSinglePanelMode : (isMobile || isTablet);

  return (
    <div id="golf-map-viewport" className="relative w-full h-full min-h-[500px] bg-[#EBE7DD] overflow-hidden">
      <Map
        id="golf-main-map"
        mapId="DEMO_MAP_ID"
        defaultCenter={hole.defaultCenter}
        defaultZoom={hole.defaultZoom}
        mapTypeId={mapTypeId}
        tilt={0}
        gestureHandling="greedy"
        disableDefaultUI={true}
        clickableIcons={false}
        onClick={() => {
          if (shouldEnforceSinglePanel && activeMobilePanel && onSetActiveMobilePanel) {
            onSetActiveMobilePanel(null);
          }
        }}
        internalUsageAttributionIds={['gmp_aistudio_courseviz_v1.0.0']}
        className="w-full h-full"
      >
          <CameraController
            hole={hole}
            selectedTee={selectedTee}
            mapTypeId={mapTypeId}
          />
          <WASDCameraController is3DMode={is3DMode} />

          {/* Collapsible Camera Controls in Top Left */}
          <div className="absolute top-4 left-4 z-20 flex items-start gap-2">
            <CameraControls
              hole={hole}
              selectedTee={selectedTee}
              targetPosition={targetPosition}
              isExpanded={shouldEnforceSinglePanel ? activeMobilePanel === 'camera' : undefined}
              onToggleExpand={
                shouldEnforceSinglePanel && onSetActiveMobilePanel
                  ? () => onSetActiveMobilePanel(activeMobilePanel === 'camera' ? null : 'camera')
                  : undefined
              }
            />

            {/* Practice Shot Mode Launcher Button - Hidden on all mobile phone orientations */}
            {!is3DMode && onTogglePracticeMode && !isMobile && (
              <button
                id="btn-map-practice-shot"
                type="button"
                onClick={onTogglePracticeMode}
                className={`practice-shot-desktop-only hidden sm:flex px-3 py-2 rounded-2xl text-xs font-black items-center gap-1.5 shadow-lg border transition-all cursor-pointer backdrop-blur-md ${
                  isPracticeMode
                    ? 'bg-[#1B291A] text-[#8FB062] border-[#8FB062] ring-2 ring-[#8FB062]/50 scale-102'
                    : 'bg-[#1B291A]/90 hover:bg-[#1B291A] text-[#F1EDE2] hover:text-[#8FB062] border-[#DED9CC]/30 hover:scale-102'
                }`}
                title="Toggle Practice Shot Studio"
              >
                <Zap className="w-3.5 h-3.5 text-[#8FB062]" />
                <span>{isPracticeMode ? 'Practice Mode Active' : 'Practice Shot ⚡'}</span>
              </button>
            )}
          </div>

          {/* Floating Map Controls & Overlays in Top Right */}
          <div className="absolute top-4 right-4 z-20 max-w-sm">
            <MapControls
              mapTypeId={mapTypeId}
              onMapTypeChange={onMapTypeChange}
              showRings={showRings}
              onToggleRings={onToggleRings}
              showFlightArc={showFlightArc}
              onToggleFlightArc={onToggleFlightArc}
              showHazards={showHazards}
              onToggleHazards={onToggleHazards}
              is3DMode={is3DMode}
              onToggle3DMode={onToggle3DMode}
              isExpanded={shouldEnforceSinglePanel ? activeMobilePanel === 'overlays' : undefined}
              onToggleExpand={
                shouldEnforceSinglePanel && onSetActiveMobilePanel
                  ? () => onSetActiveMobilePanel(activeMobilePanel === 'overlays' ? null : 'overlays')
                  : undefined
              }
            />
          </div>

          {/* Polylines, Bunker Contours & Distance Rings */}
          <MapOverlays
            teePosition={selectedTee.position}
            targetPosition={targetPosition}
            pinPosition={hole.pinPosition}
            showRings={showRings}
            showFlightArc={isPracticeMode ? false : showFlightArc}
            onMapClick={handleMapClick}
            strategy={strategy}
            layupPosition={layupPosition}
            hole={hole}
            showHazards={showHazards}
          />

          {/* Practice Shot Flight Simulation, Ball Lie, Aim Vector & Historic Tracers */}
          <PracticeShotOverlay
            shotHistory={practiceShotHistory}
            currentBallPos={practiceBallPos || selectedTee.position}
            aimPos={practiceAimPos || targetPosition}
            shotNumber={practiceShotNumber}
            shotResult={practiceShotResult || null}
            isHitting={isHittingPracticeShot}
            onHitComplete={onPracticeHitComplete || (() => {})}
            pinPosition={hole.pinPosition}
            isPracticeMode={isPracticeMode}
            onSetAimPos={onSetPracticeAimPos}
          />

          {/* Hazard Markers & Labels */}
          {showHazards &&
            hole.hazards.map((hazard) => {
              const isWater = hazard.type === 'water' || hazard.type === 'ocean';
              const isBridge = hazard.type === 'building' || hazard.id.includes('bridge');
              const isAzalea = hazard.id.includes('azalea');
              const isBunker = hazard.type === 'bunker';

              let badgeBg = 'bg-[#C2B280] text-[#1B291A] border-[#8B6E30]/50';
              let dotBg = 'bg-[#C2B280]';
              let iconEmoji = '⚠️';

              if (isWater) {
                badgeBg = 'bg-[#1E40AF] text-white border-blue-300/60 shadow-blue-900/40';
                dotBg = 'bg-[#2563EB]';
                iconEmoji = '🌊';
              } else if (isBridge) {
                badgeBg = 'bg-[#44403C] text-stone-100 border-stone-300/50 shadow-stone-900/40';
                dotBg = 'bg-[#57534E]';
                iconEmoji = '🌉';
              } else if (isAzalea) {
                badgeBg = 'bg-[#831843] text-pink-100 border-pink-300/50 shadow-pink-900/40';
                dotBg = 'bg-[#9D174D]';
                iconEmoji = '🌸';
              } else if (isBunker) {
                badgeBg = 'bg-[#C2B280] text-[#1B291A] border-[#8B6E30]/60 shadow-amber-950/20';
                dotBg = 'bg-[#C2921D]';
                iconEmoji = '🏖️';
              } else if (hazard.dangerLevel === 'high') {
                badgeBg = 'bg-[#A85832] text-white border-white/60';
                dotBg = 'bg-[#A85832]';
              }

              return (
                <AdvancedMarker
                  key={hazard.id}
                  position={hazard.position}
                  title={`${hazard.name}: ${hazard.description}`}
                >
                  <div className="flex flex-col items-center cursor-pointer group pointer-events-auto">
                    <div
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md border flex items-center gap-1 transition-transform group-hover:scale-110 ${badgeBg}`}
                    >
                      <span className="text-[9px]">{iconEmoji}</span>
                      <span>{hazard.name}</span>
                    </div>
                    <div
                      className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm -mt-0.5 ${dotBg}`}
                    />
                  </div>
                </AdvancedMarker>
              );
            })}

          {/* Tee Box Marker */}
          <AdvancedMarker
            position={selectedTee.position}
            title={`${hole.courseName} - Tee Box (${selectedTee.name})`}
          >
            <div className="flex flex-col items-center group cursor-pointer">
              <div
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg border border-white/40 flex items-center gap-1"
                style={{ backgroundColor: selectedTee.color }}
              >
                <span>TEE</span>
              </div>
              <div
                className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md -mt-0.5"
                style={{ backgroundColor: selectedTee.color }}
              />
            </div>
          </AdvancedMarker>

          {/* 3-Shot Strategy: Shot 1 Layup Marker */}
          {!isPracticeMode && strategy === '3-shot' && layupPosition && (
            <AdvancedMarker
              position={layupPosition}
              title="Shot 1 Layup Target"
            >
              <div className="flex flex-col items-center cursor-pointer group">
                <div className="bg-[#1B291A] text-[#8FB062] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xl border border-[#8FB062]/60 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#8FB062]" />
                  <span>1. LAYUP ({teeToLayupDist}y)</span>
                </div>
                <div className="w-4 h-4 rounded-full bg-[#8FB062] border-2 border-[#1B291A] shadow-md flex items-center justify-center -mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1B291A]" />
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* Green Landing Target Marker (Shot 1 for 2-shot or Shot 2 for 3-shot) */}
          {!isPracticeMode && (!isTargetAtPin || strategy === '3-shot') && (
            <AdvancedMarker
              position={targetPosition}
              title={strategy === '3-shot' ? 'Shot 2 Pitch Target' : 'Shot 1 Landing Target'}
            >
              <div className="flex flex-col items-center cursor-pointer group">
                <div className="bg-[#1B291A] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xl border border-white/60 flex items-center gap-1">
                  <Target className="w-3 h-3 text-[#C2921D]" />
                  <span>
                    {strategy === '3-shot'
                      ? `2. PITCH (${layupToTargetDist}y)`
                      : `TARGET (${teeToTargetDist}y)`}
                  </span>
                </div>
                <div className="w-4 h-4 rounded-full bg-[#C2921D] border-2 border-[#1B291A] shadow-md flex items-center justify-center -mt-0.5 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* Green / Pin Marker */}
          <AdvancedMarker
            position={hole.pinPosition}
            title={`Hole #${hole.holeNumber} Pin`}
          >
            <div className="flex flex-col items-center cursor-pointer group">
              <div className="bg-[#A85832] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xl border border-white/60 flex items-center gap-1">
                <Flag className="w-3 h-3 text-white" />
                <span>
                  {strategy === '3-shot' ? '3. CUP (PAR)' : '2. CUP (BIRDIE)'}
                </span>
              </div>
              <div className="w-3 h-8 border-l-2 border-[#1B291A] flex items-start -mt-0.5">
                <div className="w-4 h-3 bg-[#A85832] rounded-sm shadow-md" />
              </div>
              <div className="w-3 h-3 rounded-full bg-[#8FB062] border border-white shadow-md -mt-2" />
            </div>
          </AdvancedMarker>
        </Map>
    </div>
  );
};
