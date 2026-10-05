import React, { useState } from 'react';
import {
  GolfHole,
  LatLngLiteral,
  Club,
  WindCondition,
  TeeOption,
  StrategyType,
} from '../types/golf';
import {
  calculateDistanceYards,
  calculateBearing,
  calculateEffectiveYardage,
  recommendClub,
  getDetailedClubAdvice,
  getElevationAtDistance,
} from '../utils/geo';
import {
  Wind,
  Shield,
  Zap,
  Crosshair,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  Flag,
  RotateCcw,
  CheckCircle2,
  X,
} from 'lucide-react';

interface ShotPlannerProps {
  hole: GolfHole;
  teePosition: LatLngLiteral;
  targetPosition: LatLngLiteral;
  pinPosition: LatLngLiteral;
  selectedTee: TeeOption;
  onSelectTee: (tee: TeeOption) => void;
  onSetTarget: (pos: LatLngLiteral) => void;
  wind: WindCondition;
  onUpdateWind: (wind: WindCondition) => void;
  strategy: StrategyType;
  onSelectStrategy: (strat: StrategyType) => void;
  layupPosition: LatLngLiteral;
  onSetLayupPosition: (pos: LatLngLiteral) => void;
  activeEditingShot: 1 | 2;
  onSetActiveEditingShot: (shot: 1 | 2) => void;
  onOpenPracticeShot?: () => void;
  onCloseMobile?: () => void;
}

export const ShotPlanner: React.FC<ShotPlannerProps> = ({
  hole,
  teePosition,
  targetPosition,
  pinPosition,
  selectedTee,
  onSelectTee,
  onSetTarget,
  wind,
  onUpdateWind,
  strategy,
  onSelectStrategy,
  layupPosition,
  onSetLayupPosition,
  activeEditingShot,
  onSetActiveEditingShot,
  onOpenPracticeShot,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [selectedClubOverride, setSelectedClubOverride] = useState<Club | null>(null);
  const [showWindControl, setShowWindControl] = useState(false);
  const [showClubGuide, setShowClubGuide] = useState(false);
  const [hoveredStrategy, setHoveredStrategy] = useState<'2-shot' | '3-shot' | null>(null);

  // Strategy Configurations from Hole Data
  const strategyInfo =
    strategy === '2-shot'
      ? hole.strategies?.twoShot
      : hole.strategies?.threeShot;

  // Distances for 2-Shot Run:
  // Shot 1: Tee -> Target (Green)
  // Shot 2: Target -> Pin (Putt)
  const teeToGreenYards = calculateDistanceYards(teePosition, targetPosition);
  const greenToPinYards = calculateDistanceYards(targetPosition, pinPosition);
  const greenToPinFeet = Math.max(3, Math.round(greenToPinYards * 3));

  // Distances for 3-Shot Run:
  // Shot 1: Tee -> Layup
  // Shot 2: Layup -> Target (Green)
  // Shot 3: Target -> Pin (Putt)
  const teeToLayupYards = calculateDistanceYards(teePosition, layupPosition);
  const layupToGreenYards = calculateDistanceYards(layupPosition, targetPosition);

  // Elevation and Effective calculations
  const teeElevFeet = getElevationAtDistance(hole, 0).elevationFeet;
  const pinElevFeet = getElevationAtDistance(hole, hole.yardage).elevationFeet;
  const layupElevFeet = getElevationAtDistance(hole, teeToLayupYards).elevationFeet;
  const targetElevFeet = getElevationAtDistance(hole, teeToGreenYards).elevationFeet;

  // Shot 1 in 2-shot mode (Tee to Green)
  const shot1Bearing2Shot = calculateBearing(teePosition, targetPosition);
  const shot1ElevDiffYards2Shot = (targetElevFeet - teeElevFeet) / 3;
  const shot1Effective2Shot = calculateEffectiveYardage(
    teeToGreenYards,
    shot1Bearing2Shot,
    shot1ElevDiffYards2Shot,
    wind
  );
  const shot1ClubAdvice2Shot = getDetailedClubAdvice(
    teeToGreenYards,
    shot1Effective2Shot.effectiveYards,
    wind
  );

  // Shot 1 in 3-shot mode (Tee to Layup)
  const shot1Bearing3Shot = calculateBearing(teePosition, layupPosition);
  const shot1ElevDiffYards3Shot = (layupElevFeet - teeElevFeet) / 3;
  const shot1Effective3Shot = calculateEffectiveYardage(
    teeToLayupYards,
    shot1Bearing3Shot,
    shot1ElevDiffYards3Shot,
    wind
  );
  const shot1ClubAdvice3Shot = getDetailedClubAdvice(
    teeToLayupYards,
    shot1Effective3Shot.effectiveYards,
    wind
  );

  // Shot 2 in 3-shot mode (Layup to Green)
  const shot2Bearing3Shot = calculateBearing(layupPosition, targetPosition);
  const shot2ElevDiffYards3Shot = (targetElevFeet - layupElevFeet) / 3;
  const shot2Effective3Shot = calculateEffectiveYardage(
    layupToGreenYards,
    shot2Bearing3Shot,
    shot2ElevDiffYards3Shot,
    wind
  );
  const shot2ClubAdvice3Shot = getDetailedClubAdvice(
    layupToGreenYards,
    shot2Effective3Shot.effectiveYards,
    wind
  );

  // Active Primary Shot Display values
  const is2Shot = strategy === '2-shot';
  const activeClub = selectedClubOverride || (is2Shot ? shot1ClubAdvice2Shot.primaryClub : shot1ClubAdvice3Shot.primaryClub);

  // Quick wind presets based on coastal conditions
  const windPresets = [
    { label: 'Calm Morning', speed: 2, deg: 270, icon: '☀️' },
    { label: 'Moderate Breeze', speed: 12, deg: 260, icon: '🌊' },
    { label: 'Carmel Bay Gusts', speed: 22, deg: 240, icon: '💨' },
    { label: 'Gale Warning', speed: 35, deg: 225, icon: '🌪️' },
  ];

  return (
    <div
      id="shot-planner-panel"
      className={`bg-[#FDFCF9]/95 backdrop-blur-md border border-[#DED9CC] text-[#2C3327] rounded-3xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
        isCollapsed ? '' : 'max-h-[58vh] md:max-h-[75vh]'
      }`}
    >
      {/* Mobile Drawer Grab Pill */}
      <div className="md:hidden pt-2 pb-0.5 flex justify-center cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="w-10 h-1 rounded-full bg-[#DED9CC]" />
      </div>

      {/* Header - Fixed at Top */}
      <div
        className={`flex items-start justify-between gap-2 p-4 sm:p-5 flex-shrink-0 z-10 transition-all ${isCollapsed
            ? 'pb-4 bg-transparent cursor-pointer'
            : 'pb-3 border-b border-[#DED9CC]/60 sticky top-0 bg-[#FDFCF9]/95 backdrop-blur-md'
          }`}
        onClick={() => {
          if (isCollapsed) setIsCollapsed(false);
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[#5A7A3A] text-[10px] font-bold uppercase tracking-[0.2em]">
            <Crosshair className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Shot Planner</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <h3 className="text-xl font-bold tracking-tight text-[#1B291A] font-serif-natural truncate">
              Hole #{hole.holeNumber} — {hole.holeName}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E0DBCF]/80 text-[#5C6353] border border-[#DED9CC]">
              Par {hole.par}
            </span>
          </div>

          {isCollapsed && (
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#5C6353] font-medium">
              <span className="font-bold text-[#1B291A] bg-[#5A7A3A]/15 text-[#2C421C] px-2 py-0.5 rounded-md border border-[#5A7A3A]/30">
                {is2Shot ? '2-Shot Run (Birdie)' : '3-Shot Run (Par)'}
              </span>
              <span>•</span>
              <span>
                {is2Shot ? `${teeToGreenYards}y to Green` : `${teeToLayupYards}y Layup + ${layupToGreenYards}y Pitch`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            id="btn-toggle-shot-planner"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="p-2 rounded-xl bg-[#EBE7DD]/80 hover:bg-[#E0DBCF] text-[#5C6353] hover:text-[#1B291A] transition border border-[#DED9CC] flex items-center justify-center cursor-pointer shadow-xs flex-shrink-0"
            title={isCollapsed ? 'Expand Shot Planner' : 'Hide / Fold Shot Planner'}
            aria-label={isCollapsed ? 'Expand Shot Planner' : 'Hide / Fold Shot Planner'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {onCloseMobile && (
            <button
              id="btn-close-shot-planner-mobile"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseMobile();
              }}
              className="p-2 rounded-xl bg-[#EBE7DD]/80 hover:bg-[#E0DBCF] text-[#5C6353] hover:text-[#1B291A] transition border border-[#DED9CC] flex items-center justify-center cursor-pointer shadow-xs flex-shrink-0"
              title="Close Shot Planner"
              aria-label="Close Shot Planner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="overflow-y-auto p-5 pt-3 space-y-4 flex-1 overscroll-contain">
          {/* Strategy Mode Switcher (2-Shot Birdie vs 3-Shot Par) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6353]">
                Select Hole Strategy:
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${is2Shot
                    ? 'bg-[#8FB062]/20 text-[#2C421C] border-[#8FB062]/40'
                    : 'bg-[#C2921D]/20 text-[#73520A] border-[#C2921D]/40'
                  }`}
              >
                Target: {strategyInfo?.targetScore || (is2Shot ? 'Birdie (-1)' : 'Par (E)')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#EBE7DD] p-1.5 rounded-2xl border border-[#DED9CC]">
              {/* Option 1: 2-Shot Run */}
              <div className="relative">
                <button
                  id="btn-strategy-2shot"
                  type="button"
                  onMouseEnter={() => setHoveredStrategy('2-shot')}
                  onMouseLeave={() => setHoveredStrategy(null)}
                  onClick={() => {
                    onSelectStrategy('2-shot');
                    setSelectedClubOverride(null);
                    onSetActiveEditingShot(1);
                    // Snap target to green pin
                    onSetTarget(hole.pinPosition);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer text-center border ${is2Shot
                      ? 'bg-[#1B291A] text-[#F1EDE2] border-transparent shadow-md'
                      : hoveredStrategy === '2-shot'
                        ? 'bg-[#8FB062]/20 text-[#1B291A] border-[#8FB062]/50'
                        : 'border-transparent text-[#5C6353] hover:text-[#1B291A] hover:bg-[#F1EDE2]'
                    }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Zap className={`w-3.5 h-3.5 ${is2Shot ? 'text-[#8FB062]' : 'text-[#8FB062]'}`} />
                    <span>2-Shot Run</span>
                  </div>
                  <span className={`text-[10px] font-medium ${is2Shot ? 'text-[#8FB062]' : 'text-[#7B8472]'}`}>
                    Birdie Hunt (-1)
                  </span>
                </button>

                {/* 2-Shot Tooltip on Hover */}
                {hoveredStrategy === '2-shot' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-[#1B291A] text-[#F1EDE2] rounded-xl shadow-xl border border-[#8FB062]/40 z-30 pointer-events-none text-center animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#8FB062]">
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      <span>Direct pin attack (High risk)</span>
                    </div>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1B291A] border-t border-l border-[#8FB062]/40 rotate-45" />
                  </div>
                )}
              </div>

              {/* Option 2: 3-Shot Run */}
              <div className="relative">
                <button
                  id="btn-strategy-3shot"
                  type="button"
                  onMouseEnter={() => setHoveredStrategy('3-shot')}
                  onMouseLeave={() => setHoveredStrategy(null)}
                  onClick={() => {
                    onSelectStrategy('3-shot');
                    setSelectedClubOverride(null);
                    onSetActiveEditingShot(1);
                    if (hole.defaultLayupPosition) {
                      onSetLayupPosition(hole.defaultLayupPosition);
                    }
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer text-center border ${!is2Shot
                      ? 'bg-[#1B291A] text-[#F1EDE2] border-transparent shadow-md'
                      : hoveredStrategy === '3-shot'
                        ? 'bg-[#C2921D]/20 text-[#1B291A] border-[#C2921D]/50'
                        : 'border-transparent text-[#5C6353] hover:text-[#1B291A] hover:bg-[#F1EDE2]'
                    }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Shield className={`w-3.5 h-3.5 ${!is2Shot ? 'text-[#C2921D]' : 'text-[#C2921D]'}`} />
                    <span>3-Shot Run</span>
                  </div>
                  <span className={`text-[10px] font-medium ${!is2Shot ? 'text-[#C2921D]' : 'text-[#7B8472]'}`}>
                    Tactical Par (Even)
                  </span>
                </button>

                {/* 3-Shot Tooltip on Hover */}
                {hoveredStrategy === '3-shot' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-[#1B291A] text-[#F1EDE2] rounded-xl shadow-xl border border-[#C2921D]/40 z-30 pointer-events-none text-center animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#C2921D]">
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      <span>Safe layup fairway (Low risk)</span>
                    </div>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1B291A] border-t border-l border-[#C2921D]/40 rotate-45" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Practice Shot Launch Banner - Desktop / Large screen only */}
          {onOpenPracticeShot && (
            <button
              id="btn-planner-practice-shot"
              type="button"
              onClick={onOpenPracticeShot}
              className="practice-shot-desktop-only hidden sm:flex w-full py-2.5 px-3.5 rounded-2xl bg-[#1B291A] hover:bg-[#2A3F28] text-white items-center justify-between shadow-md transition-all group cursor-pointer border border-[#8FB062]/40 hover:scale-[1.01]"
            >
              <div className="flex items-center gap-2 text-left">
                <div className="w-6 h-6 rounded-lg bg-[#8FB062]/20 flex items-center justify-center text-[#8FB062]">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </div>
                <div>
                  <span className="text-xs font-black tracking-tight block">
                    Practice Shot Simulator
                  </span>
                  <span className="text-[10px] text-[#A6B29B]">
                    Hit ball with custom power & slice / hook
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-[#8FB062] text-[#1B291A] group-hover:bg-[#9DC06F] transition">
                Hit Ball ⚡
              </span>
            </button>
          )}

          {/* 2-SHOT RUN DETAILS */}
          {is2Shot && (
            <div className="space-y-3">
              <div className="flex flex-col gap-2.5">
                {/* Shot 1: Tee to Green */}
                <div className="bg-[#F1EDE2]/90 border border-[#DED9CC] rounded-2xl p-3.5 shadow-xs hover:border-[#8FB062]/60 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8FB062] animate-pulse flex-shrink-0" />
                      <span className="text-[10px] font-bold text-[#5C6353] uppercase tracking-wider">
                        Shot 1: Tee to Green
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <div className="text-2xl font-black text-[#1B291A] tracking-tight flex items-baseline gap-1">
                        <span>{teeToGreenYards}</span>
                        <span className="text-xs font-bold text-[#5C6353]">YDS</span>
                      </div>
                      <div className="text-xs text-[#5A7A3A] font-semibold flex items-center gap-1">
                        <span>Plays:</span>
                        <span className="font-bold text-[#1B291A]">{shot1Effective2Shot.effectiveYards} yds</span>
                        {shot1Effective2Shot.elevationEffect !== 0 && (
                          <span className="text-[#5C6353] text-[11px] font-medium">
                            ({shot1Effective2Shot.elevationEffect > 0 ? `+${shot1Effective2Shot.elevationEffect}` : shot1Effective2Shot.elevationEffect}y elev)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shot 2: Birdie Putt */}
                <div className="bg-[#F1EDE2]/90 border border-[#DED9CC] rounded-2xl p-3.5 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C2921D] flex-shrink-0" />
                      <span className="text-[10px] font-bold text-[#5C6353] uppercase tracking-wider">
                        Shot 2: Birdie Putt
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <div className="text-2xl font-black text-[#1B291A] tracking-tight flex items-baseline gap-1">
                        <span>{greenToPinFeet}</span>
                        <span className="text-xs font-bold text-[#5C6353]">FEET</span>
                      </div>
                      <div className="text-xs text-[#5C6353] font-medium">
                        Target: 1-putt birdie window • {hole.greenContour?.slopePercent || '2.8'}% slope
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aim Points for 2-Shot Run */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#5C6353] font-bold">
                  Target Pin Position:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const isPinActive =
                      Math.abs(targetPosition.lat - hole.pinPosition.lat) < 0.00005 &&
                      Math.abs(targetPosition.lng - hole.pinPosition.lng) < 0.00005;
                    return (
                      <button
                        id="btn-aim-pin"
                        type="button"
                        onClick={() => onSetTarget(hole.pinPosition)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border shadow-xs ${isPinActive
                            ? 'bg-[#8FB062] text-[#1B291A] border-[#7CA352] ring-1 ring-[#7CA352]/50 font-bold'
                            : 'bg-[#F1EDE2] text-[#2C3327] hover:bg-[#EBE7DD] border-[#DED9CC]'
                          }`}
                      >
                        <Flag className={`w-3.5 h-3.5 ${isPinActive ? 'text-[#1B291A]' : 'text-[#5A7A3A]'}`} />
                        <span>Attack Center Pin ({hole.yardage}y)</span>
                      </button>
                    );
                  })()}
                  {hole.fairwayWaypoints
                    .filter((wp) => {
                      // Filter out waypoint if it has identical coordinates to pin position to prevent duplicates
                      const isIdenticalToPin =
                        Math.abs(wp.position.lat - hole.pinPosition.lat) < 0.00003 &&
                        Math.abs(wp.position.lng - hole.pinPosition.lng) < 0.00003;
                      return !isIdenticalToPin;
                    })
                    .map((wp) => {
                      const isWaypointActive =
                        Math.abs(targetPosition.lat - wp.position.lat) < 0.00005 &&
                        Math.abs(targetPosition.lng - wp.position.lng) < 0.00005;

                      return (
                        <button
                          key={wp.id}
                          type="button"
                          onClick={() => onSetTarget(wp.position)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border shadow-xs ${isWaypointActive
                              ? 'bg-[#8FB062] text-[#1B291A] border-[#7CA352] ring-1 ring-[#7CA352]/50 font-bold'
                              : 'bg-[#F1EDE2] text-[#2C3327] hover:bg-[#EBE7DD] border-[#DED9CC]'
                            }`}
                        >
                          <Target
                            className={`w-3.5 h-3.5 ${isWaypointActive ? 'text-[#1B291A]' : 'text-[#5A7A3A]'
                              }`}
                          />
                          <span>{wp.name}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* 3-SHOT RUN DETAILS */}
          {!is2Shot && (
            <div className="space-y-3">
              {/* Map Click Target Selector in 3-Shot Mode */}
              <div className="bg-[#EBE7DD] p-2 rounded-2xl border border-[#DED9CC] flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#5C6353] font-bold">
                  Click on map to adjust:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSetActiveEditingShot(1)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${activeEditingShot === 1
                        ? 'bg-[#1B291A] text-[#F1EDE2] border-[#1B291A] shadow-xs'
                        : 'bg-[#F1EDE2] text-[#5C6353] hover:text-[#1B291A] border-[#DED9CC]'
                      }`}
                  >
                    <Crosshair className="w-3.5 h-3.5 text-[#8FB062]" />
                    <span>1. Layup Spot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSetActiveEditingShot(2)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${activeEditingShot === 2
                        ? 'bg-[#1B291A] text-[#F1EDE2] border-[#1B291A] shadow-xs'
                        : 'bg-[#F1EDE2] text-[#5C6353] hover:text-[#1B291A] border-[#DED9CC]'
                      }`}
                  >
                    <Target className="w-3.5 h-3.5 text-[#C2921D]" />
                    <span>2. Green Pitch</span>
                  </button>
                </div>
              </div>

              {/* 3-Shot Cards: Shot 1, Shot 2, Shot 3 Stacked Vertically */}
              <div className="flex flex-col gap-2.5">
                {/* Shot 1: Safe Layup */}
                <div
                  onClick={() => onSetActiveEditingShot(1)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer shadow-xs ${activeEditingShot === 1
                      ? 'bg-[#8FB062]/20 border-[#8FB062] ring-2 ring-[#8FB062]/40 shadow-xs'
                      : 'bg-[#F1EDE2]/90 border-[#DED9CC] hover:bg-[#EBE7DD]'
                    }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8FB062] flex-shrink-0" />
                      <span className="text-[10px] font-bold text-[#5C6353] uppercase tracking-wider">
                        Shot 1: Tee Layup
                      </span>
                      {activeEditingShot === 1 ? (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[#8FB062] text-[#1B291A]">
                          Aiming
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-[#7B8472]">
                          Tap to aim
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <div className="text-2xl font-black text-[#1B291A] tracking-tight flex items-baseline gap-1">
                        <span>{teeToLayupYards}</span>
                        <span className="text-xs font-bold text-[#5C6353]">YDS</span>
                      </div>
                      <div className="text-xs text-[#5A7A3A] font-semibold flex items-center gap-1">
                        <span>Plays:</span>
                        <span className="font-bold text-[#1B291A]">~{shot1Effective3Shot.effectiveYards} yds</span>
                        {shot1Effective3Shot.elevationEffect !== 0 && (
                          <span className="text-[#5C6353] text-[11px] font-medium">
                            ({shot1Effective3Shot.elevationEffect > 0 ? `+${shot1Effective3Shot.elevationEffect}` : shot1Effective3Shot.elevationEffect}y elev)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shot 2: Pitch to Green */}
                <div
                  onClick={() => onSetActiveEditingShot(2)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer shadow-xs ${activeEditingShot === 2
                      ? 'bg-[#C2921D]/20 border-[#C2921D] ring-2 ring-[#C2921D]/40 shadow-xs'
                      : 'bg-[#F1EDE2]/90 border-[#DED9CC] hover:bg-[#EBE7DD]'
                    }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C2921D] flex-shrink-0" />
                      <span className="text-[10px] font-bold text-[#5C6353] uppercase tracking-wider">
                        Shot 2: Green Pitch
                      </span>
                      {activeEditingShot === 2 ? (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[#C2921D] text-[#1B291A]">
                          Aiming
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-[#7B8472]">
                          Tap to aim
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <div className="text-2xl font-black text-[#1B291A] tracking-tight flex items-baseline gap-1">
                        <span>{layupToGreenYards}</span>
                        <span className="text-xs font-bold text-[#5C6353]">YDS</span>
                      </div>
                      <div className="text-xs text-[#C2921D] font-semibold flex items-center gap-1">
                        <span>Plays:</span>
                        <span className="font-bold text-[#1B291A]">~{shot2Effective3Shot.effectiveYards} yds</span>
                        {shot2Effective3Shot.elevationEffect !== 0 && (
                          <span className="text-[#5C6353] text-[11px] font-medium">
                            ({shot2Effective3Shot.elevationEffect > 0 ? `+${shot2Effective3Shot.elevationEffect}` : shot2Effective3Shot.elevationEffect}y elev)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shot 3: Par Putt */}
                <div className="bg-[#F1EDE2]/90 border border-[#DED9CC] rounded-2xl p-3.5 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#5C6353] flex-shrink-0" />
                      <span className="text-[10px] font-bold text-[#5C6353] uppercase tracking-wider">
                        Shot 3: Par Putt
                      </span>
                      <span className="text-[9px] font-medium text-[#7B8472]">
                        Regulation 2-Putt
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <div className="text-2xl font-black text-[#1B291A] tracking-tight flex items-baseline gap-1">
                        <span>{greenToPinFeet}</span>
                        <span className="text-xs font-bold text-[#5C6353]">FEET</span>
                      </div>
                      <div className="text-xs text-[#5C6353] font-medium">
                        Target: Two-putt for par • {hole.greenContour?.slopePercent || '2.8'}% slope
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layup Presets Buttons */}
              {hole.strategies?.threeShot.layupPresets && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#5C6353] font-bold">
                    Preset Layup Zones:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {hole.strategies.threeShot.layupPresets.map((preset) => {
                      const isActive =
                        Math.abs(layupPosition.lat - preset.position.lat) < 0.00005 &&
                        Math.abs(layupPosition.lng - preset.position.lng) < 0.00005;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            onSetLayupPosition(preset.position);
                            onSetActiveEditingShot(1);
                          }}
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-between text-left transition cursor-pointer border ${isActive
                              ? 'bg-[#1B291A] text-[#F1EDE2] border-[#1B291A] shadow-xs'
                              : 'bg-[#F1EDE2] text-[#2C3327] hover:bg-[#EBE7DD] border-[#DED9CC]'
                            }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Shield className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#8FB062]' : 'text-[#8FB062]'}`} />
                            <span className="truncate">{preset.name}</span>
                          </div>
                          <span className="text-[10px] opacity-75 font-mono flex-shrink-0">
                            {calculateDistanceYards(teePosition, preset.position)} yds
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wind Simulator Toggle & Controls */}
          <div className="bg-[#EBE7DD]/60 border border-[#DED9CC] rounded-2xl p-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowWindControl(!showWindControl)}
              className="flex items-center justify-between text-xs font-bold text-[#1B291A] cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-[#5A7A3A]" />
                <span>Live Wind Influence: {wind.speedMph} mph ({wind.label})</span>
              </div>
              <span className="text-[#5C6353]">{showWindControl ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>
            </button>

            {showWindControl && (
              <div className="space-y-2 pt-1 border-t border-[#DED9CC]">
                <div className="grid grid-cols-2 gap-1.5">
                  {windPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        onUpdateWind({
                          speedMph: preset.speed,
                          directionDegrees: preset.deg,
                          label: preset.label,
                        })
                      }
                      className={`p-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition cursor-pointer ${wind.speedMph === preset.speed
                          ? 'bg-[#8FB062] text-[#1B291A] border-[#7CA352] font-bold'
                          : 'bg-[#F1EDE2] text-[#5C6353] hover:text-[#1B291A] border-[#DED9CC]'
                        }`}
                    >
                      <span>{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
