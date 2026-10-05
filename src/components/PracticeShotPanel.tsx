import React, { useState, useEffect } from 'react';
import {
  GolfHole,
  LatLngLiteral,
  ShotShape,
  WindCondition,
  PracticeShotResult,
} from '../types/golf';
import { calculateDistanceYards, simulatePracticeShot } from '../utils/geo';
import {
  Zap,
  RotateCcw,
  Play,
  Crosshair,
  Wind,
  Shield,
  Flag,
  Target,
  X,
  Sparkles,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  ArrowRight,
  Trophy,
  History,
  AlertTriangle,
} from 'lucide-react';

interface PracticeShotPanelProps {
  hole: GolfHole;
  ballPosition: LatLngLiteral;
  aimPosition: LatLngLiteral;
  onSetAimPosition: (pos: LatLngLiteral) => void;
  shotNumber: number;
  shotHistory: PracticeShotResult[];
  wind: WindCondition;
  shotResult: PracticeShotResult | null;
  isHitting: boolean;
  onExecuteShot: (result: PracticeShotResult) => void;
  onPlayNextShot: () => void;
  onReplayShot: () => void;
  onResetCurrentShot: () => void;
  onRetakeOBShot?: () => void;
  onResetHole: () => void;
  onClose: () => void;
}

export const PracticeShotPanel: React.FC<PracticeShotPanelProps> = ({
  hole,
  ballPosition,
  aimPosition,
  onSetAimPosition,
  shotNumber,
  shotHistory,
  wind,
  shotResult,
  isHitting,
  onExecuteShot,
  onPlayNextShot,
  onReplayShot,
  onResetCurrentShot,
  onRetakeOBShot,
  onResetHole,
  onClose,
}) => {
  const [powerPercent, setPowerPercent] = useState<number>(100);
  const [shape, setShape] = useState<ShotShape>('straight');
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const aimedDistance = calculateDistanceYards(ballPosition, aimPosition);
  const distanceToPin = calculateDistanceYards(ballPosition, hole.pinPosition);
  const isAimedAtPin =
    Math.abs(aimPosition.lat - hole.pinPosition.lat) < 0.00003 &&
    Math.abs(aimPosition.lng - hole.pinPosition.lng) < 0.00003;

  // Determine shot context label
  const isShortGame = aimedDistance <= 35;
  const isPutting = aimedDistance <= 15;

  let shotTypeLabel = `Shot ${shotNumber}: Tee Shot`;
  if (shotNumber === 2) {
    shotTypeLabel = isShortGame ? 'Shot 2: Approach / Pitch' : 'Shot 2: Fairway Approach';
  } else if (shotNumber >= 3) {
    shotTypeLabel = isPutting ? `Shot ${shotNumber}: Putt` : `Shot ${shotNumber}: Recovery / Chip`;
  }

  // Pre-shot simulation forecast
  const forecastResult = simulatePracticeShot(
    ballPosition,
    aimPosition,
    powerPercent,
    shape,
    hole,
    wind,
    shotNumber
  );

  const handleHitBall = () => {
    if (isHitting) return;
    const result = simulatePracticeShot(
      ballPosition,
      aimPosition,
      powerPercent,
      shape,
      hole,
      wind,
      shotNumber
    );
    onExecuteShot(result);
  };

  const handleAimAtCup = () => {
    onSetAimPosition(hole.pinPosition);
  };

  const SHAPE_OPTIONS: {
    shape: ShotShape;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      shape: 'hook',
      label: 'Hook',
      description: 'Heavy Left Curve',
      icon: <CornerUpLeft className="w-4 h-4 text-[#A85832]" />,
    },
    {
      shape: 'draw',
      label: 'Draw',
      description: 'Gentle Left Turn',
      icon: <ArrowUpLeft className="w-4 h-4 text-[#8FB062]" />,
    },
    {
      shape: 'straight',
      label: 'Straight',
      description: 'True Center Flight',
      icon: <ArrowUp className="w-4 h-4 text-[#8FB062]" />,
    },
    {
      shape: 'fade',
      label: 'Fade',
      description: 'Gentle Right Turn',
      icon: <ArrowUpRight className="w-4 h-4 text-[#8FB062]" />,
    },
    {
      shape: 'slice',
      label: 'Slice',
      description: 'Heavy Right Curve',
      icon: <CornerUpRight className="w-4 h-4 text-[#A85832]" />,
    },
  ];

  return (
    <div
      id="practice-shot-panel"
      className="bg-[#1B291A]/95 backdrop-blur-md border border-[#8FB062]/50 text-white rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 max-w-full select-none animate-in fade-in zoom-in-95 duration-150 max-h-[58vh] md:max-h-none overflow-y-auto"
    >
      {/* Mobile Drawer Grab Pill */}
      <div className="md:hidden -mt-1 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#8FB062] text-[#1B291A] flex items-center justify-center font-black text-xs shadow-sm">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
              <span>Practice Shot Studio</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#8FB062]/20 text-[#8FB062] border border-[#8FB062]/30">
                Shot {shotNumber} • Par {hole.par}
              </span>
            </h2>
            <p className="text-[11px] text-[#DED9CC]/80">
              {shotTypeLabel} • Play out the full hole from every lie
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {shotHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                showHistory
                  ? 'bg-[#8FB062] text-[#1B291A] border-[#7CA352]'
                  : 'bg-white/10 hover:bg-white/20 text-[#DED9CC] hover:text-white border-white/15'
              }`}
              title="Toggle Shot History"
            >
              <History className="w-3.5 h-3.5" />
              <span className="text-[10px]">{shotHistory.length}</span>
            </button>
          )}

          <button
            id="btn-close-practice-shot"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#DED9CC] hover:text-white transition cursor-pointer border border-white/10"
            title="Exit Practice Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Shot History Drawer (when toggled) */}
      {showHistory && shotHistory.length > 0 && (
        <div className="bg-[#142314] border border-white/10 rounded-2xl p-3 space-y-2 text-xs text-white">
          <div className="flex items-center justify-between font-bold text-white border-b border-white/10 pb-1">
            <span>Hole {hole.holeNumber} Shot History</span>
            <span className="text-[11px] text-[#8FB062]">
              {shotHistory.length} shot{shotHistory.length > 1 ? 's' : ''} taken
            </span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {shotHistory.map((h) => (
              <div
                key={`h-${h.shotNumber}`}
                className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10"
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#8FB062] text-[#1B291A] text-[9px] font-black flex items-center justify-center">
                    {h.shotNumber}
                  </span>
                  <span className="font-semibold text-white">
                    {h.actualCarryYards} yds carry
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#DED9CC] text-[11px]">
                  <span className="capitalize font-medium">{h.lie}</span>
                  <span>•</span>
                  <span>{h.distanceToPinFeet} ft to pin</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Aim Info & Live Forecast */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 relative">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#8FB062]">
            Current Aim Target
          </span>
          <div className="text-xl font-black text-white leading-tight mt-0.5">
            {aimedDistance < 10 ? `${Math.round(aimedDistance * 3)} FT` : `${aimedDistance} YDS`}
          </div>
          <div className="text-[10px] text-[#A3E635] font-semibold truncate mt-0.5 flex items-center gap-1">
            {isAimedAtPin ? (
              <span className="flex items-center gap-1 text-[#A3E635]">
                <Flag className="w-3 h-3 text-[#D4A31C]" /> Aimed at Cup
              </span>
            ) : (
              <span className="text-[#DED9CC]/80">Custom Aim (Click map)</span>
            )}
          </div>

          {!isAimedAtPin && (
            <button
              onClick={handleAimAtCup}
              className="mt-1.5 text-[9px] font-bold text-[#142314] bg-[#8FB062] hover:bg-[#A3E635] px-2 py-0.5 rounded-lg border border-[#A2C775] flex items-center gap-1 transition cursor-pointer"
            >
              <Target className="w-2.5 h-2.5 text-[#142314]" /> Aim at Pin ({distanceToPin}y)
            </button>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#8FB062]">
            Simulated Carry
          </span>
          <div className="text-xl font-black text-white leading-tight mt-0.5">
            {forecastResult.actualCarryYards < 10 && aimedDistance < 10
              ? `${Math.round(forecastResult.actualCarryYards * 3)} FT`
              : `${forecastResult.actualCarryYards} YDS`}
          </div>
          <div className="text-[11px] text-[#DED9CC] font-medium flex items-center gap-1 mt-0.5">
            <Wind className="w-3 h-3 text-[#8FB062]" />
            <span>{wind.speedMph} mph wind</span>
          </div>
        </div>
      </div>

      {/* Pre-hit Setup: Power & Shape (Only when not viewing landed result) */}
      {!shotResult && (
        <>
          {/* Power Control Slider */}
          <div className="space-y-1.5 bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">
                {isPutting ? 'Putting Stroke Power:' : 'Swing Power:'}
              </span>
              <span className="font-black font-mono text-sm text-white bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/20">
                {powerPercent}%
              </span>
            </div>

            <input
              id="practice-power-slider"
              type="range"
              aria-label={isPutting ? "Putting stroke power percentage" : "Swing power percentage"}
              aria-valuemin={isPutting ? 20 : 50}
              aria-valuemax={120}
              aria-valuenow={powerPercent}
              min={isPutting ? '20' : '50'}
              max="120"
              step="1"
              value={powerPercent}
              disabled={isHitting}
              onChange={(e) => setPowerPercent(Number(e.target.value))}
              className="w-full accent-[#8FB062] cursor-pointer h-2 bg-white/20 rounded-lg"
            />

            {/* Quick Power Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: isPutting ? '50% Lag' : '75% Touch', val: isPutting ? 50 : 75 },
                { label: '90% Smooth', val: 90 },
                { label: '100% Full', val: 100 },
                { label: '115% Boost', val: 115 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  disabled={isHitting}
                  onClick={() => setPowerPercent(preset.val)}
                  className={`py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                    powerPercent === preset.val
                      ? 'bg-[#8FB062] text-[#1B291A] font-black border-[#7CA352] ring-1 ring-[#7CA352]/50 shadow-xs'
                      : 'bg-white/10 text-[#DED9CC] hover:text-white hover:bg-white/15 border-white/15'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shot Type / Shape Selector */}
          {!isPutting && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Shot Shape (Curvature):</span>
                <span className="text-[11px] font-semibold text-[#8FB062]">
                  {shape === 'straight'
                    ? 'Dead Straight'
                    : shape === 'fade' || shape === 'slice'
                    ? 'Curves Right'
                    : 'Curves Left'}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {SHAPE_OPTIONS.map((opt) => {
                  const isActive = shape === opt.shape;
                  return (
                    <button
                      key={opt.shape}
                      type="button"
                      disabled={isHitting}
                      onClick={() => setShape(opt.shape)}
                      className={`py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1 transition cursor-pointer border ${
                        isActive
                          ? 'bg-[#8FB062] text-[#1B291A] border-[#7CA352] ring-1 ring-[#7CA352]/50 shadow-md scale-102 font-black'
                          : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                      }`}
                    >
                      <span className="text-base">{opt.shape === 'hook' ? '↰' : opt.shape === 'draw' ? '↖' : opt.shape === 'straight' ? '↑' : opt.shape === 'fade' ? '↗' : '↱'}</span>
                      <span className={`text-[11px] font-black ${isActive ? 'text-[#1B291A]' : 'text-white'}`}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* HIT BALL BUTTON */}
          <button
            id="btn-hit-practice-shot"
            type="button"
            disabled={isHitting}
            onClick={handleHitBall}
            className={`w-full py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
              isHitting
                ? 'bg-[#8FB062]/50 text-[#1B291A] cursor-wait opacity-80'
                : 'bg-[#8FB062] hover:bg-[#9EC26E] text-[#1B291A] ring-2 ring-[#8FB062]/60 hover:ring-[#8FB062] hover:scale-[1.01] active:scale-[0.99] border border-[#729947]'
            }`}
          >
            {isHitting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#1B291A] border-t-transparent rounded-full animate-spin" />
                <span>Ball in Flight...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>
                  HIT SHOT {shotNumber} (
                  {forecastResult.actualCarryYards < 10 && aimedDistance < 10
                    ? `${Math.round(forecastResult.actualCarryYards * 3)} FT`
                    : `${forecastResult.actualCarryYards} YARDS`}
                  )
                </span>
              </>
            )}
          </button>
        </>
      )}

      {/* Result Card After Shot Lands */}
      {shotResult && (
        <div className="bg-white/5 border border-[#8FB062]/40 rounded-2xl p-3.5 space-y-3 shadow-inner backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                  shotResult.lie === 'holed'
                    ? 'bg-[#8FB062] text-[#1B291A] border-[#1B291A]'
                    : shotResult.lie === 'green'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : shotResult.lie === 'bunker'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : shotResult.lie === 'ocean'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-[#8FB062]/20 text-[#8FB062] border-[#8FB062]/30'
                }`}
              >
                Lie: {shotResult.lie}
              </span>
              <span className="text-xs font-black text-white">
                {shotResult.feedbackTitle}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs font-extrabold text-[#8FB062]">
                {shotResult.lie === 'holed' ? 'IN CUP' : `${shotResult.distanceToPinFeet} FT to Pin`}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#DED9CC] leading-relaxed">
            {shotResult.feedbackDescription}
          </p>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/5 p-1.5 rounded-xl border border-white/10">
              <span className="text-[9px] text-[#8FB062] block font-bold">CARRY</span>
              <span className="font-extrabold text-white">
                {shotResult.actualCarryYards} yds
              </span>
            </div>
            <div className="bg-white/5 p-1.5 rounded-xl border border-white/10">
              <span className="text-[9px] text-[#8FB062] block font-bold">LATERAL</span>
              <span className="font-extrabold text-white">
                {shotResult.lateralDispersionYards === 0
                  ? '0 yds'
                  : `${Math.abs(shotResult.lateralDispersionYards)}y ${
                      shotResult.lateralDispersionYards > 0 ? 'Right' : 'Left'
                    }`}
              </span>
            </div>
            <div className="bg-white/5 p-1.5 rounded-xl border border-white/10">
              <span className="text-[9px] text-[#8FB062] block font-bold">REMAINING</span>
              <span className="font-extrabold text-white">
                {shotResult.distanceToPinYards} yds
              </span>
            </div>
          </div>

          {/* SUBSEQUENT SHOT ADVANCEMENT OR OUT OF BOUNDS RETAKE */}
          {shotResult.lie === 'out_of_bounds' ? (
            <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Out of Bounds — Ball Lost</span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                Ball went out of course boundaries. Per golf rules, you must retake your shot from the previous position with a 1-stroke penalty.
              </p>
              <button
                type="button"
                id="btn-retake-ob-practice"
                onClick={onRetakeOBShot || onResetCurrentShot}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Shot (+1 Stroke Penalty)</span>
              </button>
            </div>
          ) : shotResult.lie !== 'holed' ? (
            <button
              id="btn-play-next-shot"
              type="button"
              onClick={onPlayNextShot}
              className="w-full py-3 px-4 rounded-xl text-sm font-black bg-[#8FB062] hover:bg-[#9EC26E] text-[#1B291A] flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.01] ring-2 ring-[#8FB062]/60"
            >
              <span>Play Next Shot (Shot {shotNumber + 1}) from Here</span>
              <ArrowRight className="w-4 h-4 text-[#1B291A]" />
            </button>
          ) : (
            <div className="bg-[#8FB062]/20 border border-[#8FB062]/40 rounded-xl p-3 text-center space-y-2 text-white">
              <div className="flex items-center justify-center gap-2 text-sm font-black text-[#A3E635]">
                <Trophy className="w-5 h-5 text-[#D4A31C]" />
                <span>Hole {hole.holeNumber} Finished in {shotNumber} Strokes!</span>
              </div>
              <p className="text-xs text-[#DED9CC]">
                {shotNumber <= hole.par
                  ? `Outstanding! Under par round with precision striking.`
                  : `Solid finish on this challenging hole.`}
              </p>
              <button
                type="button"
                onClick={onResetHole}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-[#8FB062] text-[#1B291A] hover:bg-[#9EC26E] transition cursor-pointer"
              >
                Play Hole Again from Tee ⛳
              </button>
            </div>
          )}

          {/* Secondary Actions: Retake, Replay, Reset */}
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <button
              id="btn-retake-shot"
              type="button"
              onClick={onResetCurrentShot}
              className="py-2 px-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-[#DED9CC] hover:text-white border border-white/15 flex items-center justify-center gap-1 transition cursor-pointer"
              title="Retake this shot from the same spot"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#DED9CC]" />
              <span>Retake</span>
            </button>
            <button
              id="btn-replay-shot"
              type="button"
              onClick={onReplayShot}
              className="py-2 px-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-[#DED9CC] hover:text-white border border-white/15 flex items-center justify-center gap-1 transition cursor-pointer"
              title="Replay ball flight animation"
            >
              <Play className="w-3.5 h-3.5 text-[#DED9CC]" />
              <span>Replay</span>
            </button>
            <button
              id="btn-reset-hole"
              type="button"
              onClick={onResetHole}
              className="py-2 px-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-rose-300 hover:text-white border border-white/15 flex items-center justify-center gap-1 transition cursor-pointer"
              title="Reset sequence and go back to Tee"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset Tee</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
