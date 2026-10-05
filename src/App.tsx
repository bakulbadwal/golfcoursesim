import React, { useState, useEffect } from 'react';
import { GOLF_HOLES } from './data/holes';
import {
  GolfHole,
  LatLngLiteral,
  TeeOption,
  WindCondition,
  Hazard,
  StrategyType,
  PracticeShotResult,
} from './types/golf';
import { GolfMap } from './components/GolfMap';
import { GolfMap3D } from './components/GolfMap3D';
import { HoleSelector } from './components/HoleSelector';
import { ShotPlanner } from './components/ShotPlanner';
import { HoleInfoPanel } from './components/HoleInfoPanel';
import { PracticeShotPanel } from './components/PracticeShotPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GolfTransitionOverlay } from './components/GolfTransitionOverlay';
import { ControlsGuideModal } from './components/ControlsGuideModal';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Flag, Sparkles, BookOpen, Target, LayoutGrid, Zap, Keyboard } from 'lucide-react';
import { useIsMobile, useIsTablet } from './utils/useIsMobile';

export default function App() {
  // State
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [showControlsGuide, setShowControlsGuide] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      sessionStorage.getItem('VITE_GOOGLE_MAPS_API_KEY') ||
      ''
    );
  });

  const handleUpdateApiKey = (newKey: string) => {
    setApiKey(newKey);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('VITE_GOOGLE_MAPS_API_KEY', newKey);
    }
  };

  const [selectedHole, setSelectedHole] = useState<GolfHole>(GOLF_HOLES[0]);
  const [selectedTee, setSelectedTee] = useState<TeeOption>(GOLF_HOLES[0].teeOptions[0]);
  const [targetPosition, setTargetPosition] = useState<LatLngLiteral>(GOLF_HOLES[0].pinPosition);
  const [mapTypeId, setMapTypeId] = useState<string>('hybrid');
  const [showRings, setShowRings] = useState<boolean>(true);
  const [showFlightArc, setShowFlightArc] = useState<boolean>(true);
  const [showHazards, setShowHazards] = useState<boolean>(true);
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionTargetMode, setTransitionTargetMode] = useState<'3d' | '2d'>('3d');
  const [is3DTilesReady, setIs3DTilesReady] = useState<boolean>(false);
  const [mobileOpenPanel, setMobileOpenPanel] = useState<'planner' | 'caddie' | 'camera' | 'overlays' | null>(null);

  // Responsive device orientation and view tracking
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isSinglePanelMode = isMobile || isTablet;

  // Pre-fetch Google Maps 3D library in the background as soon as API is initialized
  useEffect(() => {
    const win = typeof window !== 'undefined' ? (window as any).google : null;
    if (win?.maps?.importLibrary) {
      win.maps.importLibrary('maps3d').catch(() => { });
    }
  }, [apiKey]);

  const handleSwitchTo3D = () => {
    if (is3DMode) return;
    setTransitionTargetMode('3d');
    setIsTransitioning(true);
    setIsPracticeMode(false);
    setPracticeShotResult(null);
    setIs3DMode(true);
  };

  const handleSwitchTo2D = () => {
    if (!is3DMode) return;
    setTransitionTargetMode('2d');
    setIsTransitioning(true);
    setIs3DMode(false);
  };

  const handleToggle3DMode = () => {
    if (is3DMode) {
      handleSwitchTo2D();
    } else {
      handleSwitchTo3D();
    }
  };

  const handleTransitionComplete = () => {
    setIsTransitioning(false);
  };

  const [strategy, setStrategy] = useState<StrategyType>('2-shot');
  const [layupPosition, setLayupPosition] = useState<LatLngLiteral>(
    GOLF_HOLES[0].defaultLayupPosition || GOLF_HOLES[0].pinPosition
  );
  const [activeEditingShot, setActiveEditingShot] = useState<1 | 2>(1);

  // Practice Shot State (2D only)
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [practiceShotResult, setPracticeShotResult] = useState<PracticeShotResult | null>(null);
  const [isHittingPracticeShot, setIsHittingPracticeShot] = useState<boolean>(false);
  const [practiceShotNumber, setPracticeShotNumber] = useState<number>(1);
  const [practiceBallPos, setPracticeBallPos] = useState<LatLngLiteral | null>(null);
  const [practiceAimPos, setPracticeAimPos] = useState<LatLngLiteral | null>(null);
  const [practiceShotHistory, setPracticeShotHistory] = useState<PracticeShotResult[]>([]);

  const [wind, setWind] = useState<WindCondition>({
    speedMph: 9,
    directionDegrees: 280, // WNW
    label: 'WNW (Blue Ridge Breeze)',
  });

  // When changing hole, reset tee, target landing point, and strategy
  const handleSelectHole = (hole: GolfHole) => {
    setSelectedHole(hole);
    setSelectedTee(hole.teeOptions[0]);
    setTargetPosition(hole.pinPosition);
    if (hole.defaultLayupPosition) {
      setLayupPosition(hole.defaultLayupPosition);
    } else {
      setLayupPosition(hole.pinPosition);
    }
    setStrategy('2-shot');
    setActiveEditingShot(1);
    setIsPracticeMode(false);
    setPracticeShotResult(null);
    setIsHittingPracticeShot(false);
    setPracticeShotNumber(1);
    setPracticeBallPos(null);
    setPracticeAimPos(null);
    setPracticeShotHistory([]);

    if (hole.id.startsWith('birdwood')) {
      setWind({
        speedMph: 9,
        directionDegrees: 280,
        label: 'WNW (Blue Ridge Breeze)',
      });
    } else {
      setWind({
        speedMph: 12,
        directionDegrees: 270,
        label: 'West (Ocean Breeze)',
      });
    }
  };

  // Automatically exit practice mode if screen is in mobile orientation (vertical or landscape)
  useEffect(() => {
    if (isMobile && isPracticeMode) {
      setIsPracticeMode(false);
      setPracticeShotResult(null);
      setIsHittingPracticeShot(false);
      setPracticeShotHistory([]);
      setPracticeShotNumber(1);
      setPracticeBallPos(null);
      setPracticeAimPos(null);
    }
  }, [isMobile, isPracticeMode]);

  const currentHoleIndex = GOLF_HOLES.findIndex((h) => h.id === selectedHole.id);
  const nextHole = GOLF_HOLES[(currentHoleIndex + 1) % GOLF_HOLES.length];
  const handleNextHole = () => {
    handleSelectHole(nextHole);
  };

  const handleOpenPracticeShot = (startPos?: LatLngLiteral, aimPos?: LatLngLiteral) => {
    if (isMobile) return; // Completely disabled on mobile (both portrait and landscape orientations)
    setIsPracticeMode(true);
    setPracticeShotNumber(1);
    setPracticeBallPos(startPos || selectedTee.position);
    setPracticeAimPos(aimPos || selectedHole.pinPosition);
    setPracticeShotResult(null);
    setPracticeShotHistory([]);
    setIsHittingPracticeShot(false);
    setMobileOpenPanel('planner');
  };

  const handleTogglePracticeMode = () => {
    if (isMobile) return; // Completely disabled on mobile (both portrait and landscape orientations)
    if (!isPracticeMode) {
      handleOpenPracticeShot();
    } else {
      setIsPracticeMode(false);
      setPracticeShotResult(null);
      setIsHittingPracticeShot(false);
      setPracticeShotHistory([]);
      setPracticeShotNumber(1);
      setPracticeBallPos(null);
      setPracticeAimPos(null);
    }
  };

  const handleExecutePracticeShot = (result: PracticeShotResult) => {
    setPracticeShotResult(result);
    setIsHittingPracticeShot(true);
  };

  const handlePracticeHitComplete = () => {
    setIsHittingPracticeShot(false);
  };

  const handlePlayNextShot = () => {
    if (!practiceShotResult) return;
    setPracticeShotHistory((prev) => [...prev, practiceShotResult]);
    setPracticeBallPos(practiceShotResult.landingPos);
    setPracticeAimPos(selectedHole.pinPosition);
    setPracticeShotNumber((prev) => prev + 1);
    setPracticeShotResult(null);
    setIsHittingPracticeShot(false);
  };

  const handleReplayPracticeShot = () => {
    setIsHittingPracticeShot(true);
  };

  const handleResetCurrentShot = () => {
    setPracticeShotResult(null);
    setIsHittingPracticeShot(false);
  };

  const handleRetakeOBPracticeShot = () => {
    // 1-stroke penalty for Out of Bounds: retake from previous position
    setPracticeShotNumber((prev) => prev + 2); // 1 stroke taken + 1 penalty stroke
    setPracticeShotResult(null);
    setIsHittingPracticeShot(false);
  };

  const handleResetHolePractice = () => {
    setPracticeShotNumber(1);
    setPracticeBallPos(selectedTee.position);
    setPracticeAimPos(selectedHole.pinPosition);
    setPracticeShotResult(null);
    setPracticeShotHistory([]);
    setIsHittingPracticeShot(false);
  };

  const handleFocusHazard = (hazard: Hazard) => {
    setTargetPosition(hazard.position);
  };

  // Welcome Screen when first loading or requested by user
  if (showWelcome) {
    return (
      <WelcomeScreen
        holes={GOLF_HOLES}
        apiKey={apiKey}
        onUpdateApiKey={handleUpdateApiKey}
        onSelectHole={(hole) => {
          handleSelectHole(hole);
          setShowWelcome(false);
        }}
      />
    );
  }

  return (
    <div id="golf-app-root" className="flex flex-col h-screen w-screen bg-[#1B291A] text-[#2C3327] overflow-hidden font-sans select-none">
      {/* Single Consolidated Header Bar */}
      <header id="main-header" className="h-14 px-3 bg-[#152014] border-b border-[#2D3E2B] flex items-center justify-between gap-3 z-30 flex-shrink-0 text-[#F1EDE2]">
        {/* Brand Logo / Course Selection Button */}
        <button
          onClick={() => setShowWelcome(true)}
          title="Back to Course Welcome & Overview"
          className="flex items-center gap-2 flex-shrink-0 pr-2.5 border-r border-[#2D3E2B]/80 hover:opacity-90 transition-opacity cursor-pointer group text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-[#8FB062] flex items-center justify-center text-[#1B291A] shadow-xs group-hover:scale-105 transition-transform">
            <Flag className="w-4 h-4 text-[#1B291A]" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-[#F1EDE2] flex items-center gap-1.5 font-serif-natural">
              <span>CourseViz</span>
            </h1>
          </div>
        </button>

        {/* Holes Carousel & 3D Toggle */}
        <div className="flex-1 overflow-hidden">
          <HoleSelector
            holes={GOLF_HOLES}
            selectedHole={selectedHole}
            onSelectHole={handleSelectHole}
            is3DMode={is3DMode}
            onToggle3DMode={handleToggle3DMode}
          />
        </div>

        {/* Header Right Actions: Controls Guide & Course Guide */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            id="btn-controls-guide"
            onClick={() => setShowControlsGuide(true)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#243523] hover:bg-[#2F452E] text-[#BCC9B4] hover:text-[#F1EDE2] border border-[#364D34] cursor-pointer flex-shrink-0 transition-colors shadow-xs"
            title="View 2D & 3D Camera Controls & Navigation Guide"
            aria-label="View Controls & Navigation Guide"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#8FB062]" />
            <span className="hidden xs:inline sm:inline">Controls</span>
          </button>
          <button
            id="btn-header-home"
            onClick={() => setShowWelcome(true)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#243523] hover:bg-[#2F452E] text-[#BCC9B4] hover:text-[#F1EDE2] border border-[#364D34] cursor-pointer flex-shrink-0 transition-colors shadow-xs"
            title="Return to Welcome Screen & Course Selector"
            aria-label="Return to Welcome Screen & Course Selector"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#8FB062]" />
            <span className="hidden xs:inline sm:inline">Home</span>
          </button>
        </div>
      </header>

      {/* Main Map Viewport */}
      <main className="relative flex-1 w-full h-full overflow-hidden bg-[#EBE7DD]">
        <APIProvider apiKey={apiKey || ''} solutionChannel="gmp_mcp_codeassist_v1_aistudio">
          {/* 3D Photorealistic Mode Viewport (Pre-mounted & warmed in background for instant tile rendering) */}
          <div
            id="golf-3d-map-container"
            className={`absolute inset-0 transition-opacity duration-400 ease-in-out ${is3DMode ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
          >
            <GolfMap3D
              hole={selectedHole}
              selectedTee={selectedTee}
              targetPosition={targetPosition}
              onSetTarget={setTargetPosition}
              onSelectTee={setSelectedTee}
              wind={wind}
              onUpdateWind={setWind}
              onExit3D={handleSwitchTo2D}
              showHazards={showHazards}
              onToggleHazards={() => setShowHazards((prev) => !prev)}
              strategy={strategy}
              onSelectStrategy={setStrategy}
              layupPosition={layupPosition}
              onSetLayupPosition={setLayupPosition}
              activeEditingShot={activeEditingShot}
              onSetActiveEditingShot={setActiveEditingShot}
              onNextHole={handleNextHole}
              nextHoleNumber={nextHole.holeNumber}
              onReadyStateChange={(ready) => setIs3DTilesReady(ready)}
            />
          </div>

          {/* 2D Interactive Google Map Mode */}
          <div
            id="golf-2d-map-container"
            className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${!is3DMode ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
          >
            <GolfMap
              apiKey={apiKey}
              hole={selectedHole}
              selectedTee={selectedTee}
              targetPosition={targetPosition}
              onSetTarget={setTargetPosition}
              mapTypeId={mapTypeId}
              onMapTypeChange={setMapTypeId}
              showRings={showRings}
              onToggleRings={() => setShowRings(!showRings)}
              showFlightArc={showFlightArc}
              onToggleFlightArc={() => setShowFlightArc(!showFlightArc)}
              showHazards={showHazards}
              onToggleHazards={() => setShowHazards(!showHazards)}
              is3DMode={is3DMode}
              onToggle3DMode={handleSwitchTo3D}
              onSelectHazard={handleFocusHazard}
              strategy={strategy}
              layupPosition={layupPosition}
              onSetLayupPosition={setLayupPosition}
              activeEditingShot={activeEditingShot}
              practiceShotResult={practiceShotResult}
              isHittingPracticeShot={isHittingPracticeShot}
              onPracticeHitComplete={handlePracticeHitComplete}
              isPracticeMode={!isMobile && isPracticeMode}
              onTogglePracticeMode={!isMobile ? handleTogglePracticeMode : undefined}
              practiceBallPos={practiceBallPos || selectedTee.position}
              practiceAimPos={practiceAimPos || selectedHole.pinPosition}
              onSetPracticeAimPos={!isMobile ? setPracticeAimPos : undefined}
              practiceShotNumber={practiceShotNumber}
              practiceShotHistory={practiceShotHistory}
              activeMobilePanel={mobileOpenPanel}
              onSetActiveMobilePanel={setMobileOpenPanel}
              isSinglePanelMode={isSinglePanelMode}
            />

            {/* Backdrop click-catcher to dismiss any open panel when tapping outside on the map in single-panel mode */}
            {mobileOpenPanel && isSinglePanelMode && (
              <div
                id="panel-backdrop"
                aria-hidden="true"
                onClick={() => setMobileOpenPanel(null)}
                className="fixed inset-0 z-15 bg-transparent cursor-pointer pointer-events-auto"
              />
            )}

            {/* Bottom Floating Cards & Quick Access Navigation (Only active in 2D Mode) */}
            <div
              className={`absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex ${
                isSinglePanelMode ? 'flex-col items-stretch' : 'flex-row items-end'
              } justify-between gap-2 md:gap-3 max-h-[calc(100vh-100px)] overflow-hidden`}
            >
              {/* Shot Planner / Practice Shot Card */}
              <div
                className={`pointer-events-auto w-full md:w-[390px] max-w-full ${
                  isSinglePanelMode
                    ? (mobileOpenPanel === 'planner' ? 'block self-start' : 'hidden')
                    : 'block'
                }`}
              >
                {!isMobile && isPracticeMode ? (
                  <PracticeShotPanel
                    hole={selectedHole}
                    ballPosition={practiceBallPos || selectedTee.position}
                    aimPosition={practiceAimPos || selectedHole.pinPosition}
                    onSetAimPosition={setPracticeAimPos}
                    shotNumber={practiceShotNumber}
                    shotHistory={practiceShotHistory}
                    wind={wind}
                    shotResult={practiceShotResult}
                    isHitting={isHittingPracticeShot}
                    onExecuteShot={handleExecutePracticeShot}
                    onPlayNextShot={handlePlayNextShot}
                    onReplayShot={handleReplayPracticeShot}
                    onResetCurrentShot={handleResetCurrentShot}
                    onRetakeOBShot={handleRetakeOBPracticeShot}
                    onResetHole={handleResetHolePractice}
                    onClose={() => {
                      handleTogglePracticeMode();
                      setMobileOpenPanel(null);
                    }}
                  />
                ) : (
                  <ShotPlanner
                    hole={selectedHole}
                    teePosition={selectedTee.position}
                    targetPosition={targetPosition}
                    pinPosition={selectedHole.pinPosition}
                    selectedTee={selectedTee}
                    onSelectTee={setSelectedTee}
                    onSetTarget={setTargetPosition}
                    wind={wind}
                    onUpdateWind={setWind}
                    strategy={strategy}
                    onSelectStrategy={setStrategy}
                    layupPosition={layupPosition}
                    onSetLayupPosition={setLayupPosition}
                    activeEditingShot={activeEditingShot}
                    onSetActiveEditingShot={setActiveEditingShot}
                    onCloseMobile={isSinglePanelMode ? () => setMobileOpenPanel(null) : undefined}
                    onOpenPracticeShot={
                      !isMobile
                        ? () => {
                            let initialAim = targetPosition;
                            let initialBall = selectedTee.position;
                            if (strategy === '3-shot' && activeEditingShot === 2 && layupPosition) {
                              initialBall = layupPosition;
                              initialAim = targetPosition;
                            } else if (strategy === '3-shot' && activeEditingShot === 1 && layupPosition) {
                              initialAim = layupPosition;
                            }
                            handleOpenPracticeShot(initialBall, initialAim);
                          }
                        : undefined
                    }
                  />
                )}
              </div>

              {/* Hole Strategy & Hazards Card */}
              <div
                className={`pointer-events-auto w-full md:w-[390px] max-w-full ${
                  isSinglePanelMode
                    ? (mobileOpenPanel === 'caddie' ? 'block self-end' : 'hidden')
                    : 'block'
                }`}
              >
                <HoleInfoPanel
                  hole={selectedHole}
                  teePosition={selectedTee.position}
                  targetPosition={targetPosition}
                  pinPosition={selectedHole.pinPosition}
                  onSetTarget={setTargetPosition}
                  onFocusHazard={handleFocusHazard}
                  onCloseMobile={isSinglePanelMode ? () => setMobileOpenPanel(null) : undefined}
                  defaultExpanded={true}
                  onInspectGreen={() => {
                    const greenBtn = document.getElementById('btn-camera-green');
                    if (greenBtn) {
                      greenBtn.click();
                    } else {
                      setTargetPosition(selectedHole.pinPosition);
                    }
                  }}
                />
              </div>

              {/* Quick-Access Buttons: Bottom-Left (Shot Planner) & Lower-Right (Caddie Info) */}
              <div
                id="mobile-bottom-nav-bar"
                className={`items-center justify-between w-full pointer-events-none order-last pt-0.5 ${
                  isSinglePanelMode ? 'flex' : 'hidden'
                }`}
              >
                {/* Bottom Left Button: Shot Planner */}
                <button
                  type="button"
                  id="btn-mobile-shot-planner"
                  onClick={() => setMobileOpenPanel((prev) => (prev === 'planner' ? null : 'planner'))}
                  className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xl cursor-pointer active:scale-95 border ${
                    mobileOpenPanel === 'planner'
                      ? 'bg-[#8FB062] text-[#152014] border-[#8FB062] shadow-emerald-950/40'
                      : 'bg-[#1B291A]/95 backdrop-blur-md text-[#F1EDE2] hover:bg-[#253A23] border-[#364D34]'
                  }`}
                  aria-expanded={mobileOpenPanel === 'planner'}
                  aria-label="Shot Planner"
                >
                  <Target className="w-4 h-4 flex-shrink-0" />
                  <span>Shot Planner</span>
                </button>

                {/* Lower Right Button: Caddie Info */}
                <button
                  type="button"
                  id="btn-mobile-caddie-info"
                  onClick={() => setMobileOpenPanel((prev) => (prev === 'caddie' ? null : 'caddie'))}
                  className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xl cursor-pointer active:scale-95 border ${
                    mobileOpenPanel === 'caddie'
                      ? 'bg-[#8FB062] text-[#152014] border-[#8FB062] shadow-emerald-950/40'
                      : 'bg-[#1B291A]/95 backdrop-blur-md text-[#F1EDE2] hover:bg-[#253A23] border-[#364D34]'
                  }`}
                  aria-expanded={mobileOpenPanel === 'caddie'}
                  aria-label="Caddie Info"
                >
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  <span>Caddie Info</span>
                </button>
              </div>
            </div>
          </div>

          {/* Golf-Themed Cinematic Mode Transition & Elevation Scanning Curtain */}
          <GolfTransitionOverlay
            isVisible={isTransitioning}
            targetMode={transitionTargetMode}
            hole={selectedHole}
            is3DReady={is3DTilesReady}
            onTransitionComplete={handleTransitionComplete}
          />
        </APIProvider>
      </main>

      {/* Accessible Live Region for Screen Readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {`Now viewing Hole ${selectedHole.holeNumber}, Par ${selectedHole.par}, ${selectedHole.yardage} yards. Mode: ${is3DMode ? '3D Photorealistic Mesh' : '2D Tactical Overhead'}.`}
      </div>

      {/* 2D & 3D Interactive Controls & Keyboard Navigation Modal */}
      <ControlsGuideModal
        isOpen={showControlsGuide}
        onClose={() => setShowControlsGuide(false)}
        is3DMode={is3DMode}
      />
    </div>
  );
}
