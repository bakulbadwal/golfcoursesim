import React from 'react';
import { GolfHole, LatLngLiteral, ShotShape, WindCondition, Club } from '../types/golf';
import { calculateDistanceYards, DEFAULT_CLUBS, recommendClub, isPositionOnGreen } from '../utils/geo';
import {
  Zap,
  Target,
  Flag,
  Sparkles,
  Wind,
  X,
  Play,
  RotateCcw,
  Compass,
} from 'lucide-react';

interface Shot3DPlannerProps {
  hole: GolfHole;
  ballPosition: LatLngLiteral;
  aimPosition: LatLngLiteral;
  onSetAimPosition: (pos: LatLngLiteral) => void;
  shotNumber: number;
  currentLie?: 'tee' | 'fairway' | 'green' | 'bunker' | 'rough' | 'out_of_bounds';
  selectedClub: Club;
  onSelectClub: (club: Club) => void;
  powerPercent: number;
  onChangePower: (power: number) => void;
  shape: ShotShape;
  onChangeShape: (shape: ShotShape) => void;
  wind: WindCondition;
  onHitBall: () => void;
  onClose: () => void;
  isHitting: boolean;
  onResetHole: () => void;
  onJumpToGreenPutt?: () => void;
}

const SHAPE_OPTIONS: { id: ShotShape; label: string; description: string }[] = [
  { id: 'straight', label: 'Straight', description: 'Direct flight line' },
  { id: 'draw', label: 'Draw', description: 'Gentle curve right-to-left' },
  { id: 'fade', label: 'Fade', description: 'Gentle curve left-to-right' },
  { id: 'hook', label: 'Hook', description: 'Hard left curvature' },
  { id: 'slice', label: 'Slice', description: 'Hard right curvature' },
];

export const Shot3DPlanner: React.FC<Shot3DPlannerProps> = ({
  hole,
  ballPosition,
  aimPosition,
  onSetAimPosition,
  shotNumber,
  currentLie = 'tee',
  selectedClub,
  onSelectClub,
  powerPercent,
  onChangePower,
  shape,
  onChangeShape,
  wind,
  onHitBall,
  onClose,
  isHitting,
  onResetHole,
  onJumpToGreenPutt,
}) => {
  const distanceToPinYards = calculateDistanceYards(ballPosition, hole.pinPosition);
  const distanceToAimYards = calculateDistanceYards(ballPosition, aimPosition);
  const isShotOnGreen = isPositionOnGreen(ballPosition, hole) || currentLie === 'green' || selectedClub.category === 'putter';
  const isBunkerLie = currentLie === 'bunker';
  const isFairwayLie = currentLie === 'fairway' || currentLie === 'tee';

  // Lie description
  let lieLabel = 'Tee Box';
  if (isShotOnGreen) {
    lieLabel = 'Putting Green (Roll Putt)';
  } else if (isBunkerLie) {
    lieLabel = 'Sand Trap (30% Penalty)';
  } else if (isFairwayLie) {
    lieLabel = 'Fairway Lie (High Arch)';
  } else if (currentLie === 'rough') {
    lieLabel = 'Rough Lie';
  } else if (shotNumber === 2) {
    lieLabel = distanceToPinYards <= 25 ? 'Green Fringe' : 'Fairway Lie';
  } else if (shotNumber >= 3) {
    lieLabel = distanceToPinYards <= 15 ? 'Putting Green' : 'Approach Lie';
  }

  // Calculate estimated carry yards based on club, power, and bunker penalty
  const bunkerPenaltyMultiplier = isBunkerLie ? 0.70 : 1.0;
  const baseCarry = selectedClub.typicalCarryYards;
  const estimatedCarry = Math.round(baseCarry * (powerPercent / 100) * bunkerPenaltyMultiplier);

  // Explicitly track selected target id so exactly one button is active at a time
  const [selectedTargetId, setSelectedTargetId] = React.useState<string>(() => {
    for (const wp of hole.fairwayWaypoints) {
      if (
        Math.abs(aimPosition.lat - wp.position.lat) < 0.00003 &&
        Math.abs(aimPosition.lng - wp.position.lng) < 0.00003
      ) {
        return wp.id;
      }
    }
    return 'pin';
  });

  // Sync if hole changes
  React.useEffect(() => {
    setSelectedTargetId('pin');
  }, [hole.id]);

  // Handle Escape key to close planner
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelectPin = () => {
    setSelectedTargetId('pin');
    onSetAimPosition(hole.pinPosition);
  };

  const handleSelectWaypoint = (wp: (typeof hole.fairwayWaypoints)[0]) => {
    setSelectedTargetId(wp.id);
    onSetAimPosition(wp.position);
  };

  const isAimAtPin = selectedTargetId === 'pin';

  return (
    <div
      id="shot-3d-planner-modal"
      role="region"
      aria-label="3D Shot Planning Controls"
      className="bg-[#1B291A]/95 backdrop-blur-md border border-[#8FB062]/50 text-white rounded-2xl shadow-2xl p-4 max-w-md w-full flex flex-col gap-3.5 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top Header: Shot number, lie, and close button */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#8FB062] flex items-center justify-center text-[#1B291A] font-black text-xs shadow-sm">
            #{shotNumber}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 leading-none">
              <span>{isShotOnGreen ? 'Green Putt' : shotNumber === 1 ? 'Tee Shot Plan' : `Shot ${shotNumber} Approach`}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isBunkerLie
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : isShotOnGreen
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#8FB062]/20 text-[#8FB062] border-[#8FB062]/30'
              }`}>
                {lieLabel}
              </span>
            </h3>
            <span className="text-[11px] text-[#DED9CC] font-medium">
              {Math.round(distanceToPinYards)} yards ({Math.round(distanceToPinYards * 3)} ft) to pin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isShotOnGreen && onJumpToGreenPutt && (
            <button
              type="button"
              onClick={onJumpToGreenPutt}
              title="Practice putting straight on the green"
              aria-label="Practice putting straight on the green"
              className="p-1.5 rounded-lg bg-[#8FB062]/20 hover:bg-[#8FB062]/30 text-[#8FB062] border border-[#8FB062]/40 transition cursor-pointer text-xs flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-[#A3E635]" />
              <span className="text-[10px] font-bold">Putt Green</span>
            </button>
          )}
          <button
            type="button"
            onClick={onResetHole}
            title="Restart Hole from Tee"
            aria-label="Restart Hole from Tee"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#DED9CC] hover:text-white transition cursor-pointer text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[10px]">Reset</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Minimize Planner (Return to 3D View)"
            aria-label="Minimize Planner (Return to 3D View)"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#DED9CC] hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Surface Lie Special Indicators */}
      {isBunkerLie && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-2.5 text-amber-200 text-xs flex items-start gap-2">
          <span className="text-base leading-none">🏖️</span>
          <div>
            <span className="font-extrabold text-amber-300 block">Sand Trap Lie • -30% Power Penalty</span>
            <span className="text-[11px] text-amber-200/90 leading-tight block">
              Heavy sand resistance reduces carry by 30%. Club up or swing with firm power to escape the bunker!
            </span>
          </div>
        </div>
      )}

      {isFairwayLie && !isShotOnGreen && (
        <div className="bg-[#8FB062]/15 border border-[#8FB062]/30 rounded-xl px-2.5 py-1.5 text-xs flex items-center justify-between text-[#8FB062]">
          <div className="flex items-center gap-1.5 font-bold">
            <span>⛳ Fairway Lie</span>
          </div>
          <span className="text-[10px] bg-[#8FB062]/20 text-[#A3E635] px-2 py-0.5 rounded-md font-extrabold border border-[#8FB062]/30">
            High Arching Flight
          </span>
        </div>
      )}

      {/* Target Selection Pills */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8FB062] uppercase tracking-wider">
            Target Aim Point
          </span>
          <span className="text-[10px] text-[#DED9CC]/80 font-medium">
            1 target active
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-target-pin"
            type="button"
            onClick={handleSelectPin}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer border select-none active:scale-95 ${
              isAimAtPin
                ? 'bg-[#8FB062] text-[#142314] font-black border-[#A2C775] shadow-md ring-2 ring-[#8FB062]/60'
                : 'bg-white/10 text-[#E8E4D9] hover:bg-white/20 hover:text-white border-white/20 font-medium'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 ${isAimAtPin ? 'text-[#142314] fill-current/30' : 'text-[#8FB062]'}`} />
            <span>Center Pin ({Math.round(distanceToPinYards)}y)</span>
            {isAimAtPin && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#142314] animate-pulse ml-0.5" />
            )}
          </button>

          {hole.fairwayWaypoints.map((wp) => {
            const isWp = selectedTargetId === wp.id;
            const wpDist = Math.round(calculateDistanceYards(ballPosition, wp.position));
            return (
              <button
                id={`btn-target-${wp.id}`}
                key={wp.id}
                type="button"
                onClick={() => handleSelectWaypoint(wp)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer border select-none active:scale-95 ${
                  isWp
                    ? 'bg-[#8FB062] text-[#142314] font-black border-[#A2C775] shadow-md ring-2 ring-[#8FB062]/60'
                    : 'bg-white/10 text-[#E8E4D9] hover:bg-white/20 hover:text-white border-white/20 font-medium'
                }`}
              >
                <Target className={`w-3.5 h-3.5 ${isWp ? 'text-[#142314] fill-current/30' : 'text-[#8FB062]'}`} />
                <span>{wp.name} ({wpDist}y)</span>
                {isWp && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142314] animate-pulse ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Club Selection Dropdown & Auto Recommendation */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8FB062] uppercase tracking-wider">
            Club in Hand
          </span>
          <span className="text-[11px] text-[#DED9CC]">
            Typical Carry: <strong className="text-white">{selectedClub.typicalCarryYards}y</strong>
          </span>
        </div>
        <select
          id="select-3d-club"
          aria-label="Select club"
          value={selectedClub.id}
          onChange={(e) => {
            const found = DEFAULT_CLUBS.find((c) => c.id === e.target.value);
            if (found) onSelectClub(found);
          }}
          className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#8FB062] cursor-pointer"
        >
          {DEFAULT_CLUBS.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#1B291A] text-white">
              {c.name} — {c.typicalCarryYards} yds ({c.loft})
            </option>
          ))}
        </select>
      </div>

      {/* Power Slider */}
      <div className="flex flex-col gap-1.5 bg-white/5 p-2.5 rounded-xl border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8FB062] uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#D4A31C]" />
            Swing Power: <span className="text-white font-black">{powerPercent}%</span>
          </span>
          <span className="text-xs font-extrabold text-[#8FB062]">
            Est. Carry ~{estimatedCarry} yds
          </span>
        </div>

        <input
          id="input-3d-power-slider"
          aria-label="Swing power percentage"
          aria-valuemin={50}
          aria-valuemax={115}
          aria-valuenow={powerPercent}
          type="range"
          min={50}
          max={115}
          step={1}
          value={powerPercent}
          onChange={(e) => onChangePower(Number(e.target.value))}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#8FB062]"
        />

        <div className="flex items-center justify-between text-[10px] text-[#DED9CC]/80 font-medium px-0.5">
          <span>50% Touch</span>
          <span>85% Smooth</span>
          <span>100% Full</span>
          <span>115% Max</span>
        </div>
      </div>

      {/* Shot Shape / Trajectory Section */}
      {isShotOnGreen ? (
        <div className="flex flex-col gap-1.5 bg-white/5 border border-[#8FB062]/30 rounded-xl p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8FB062] uppercase tracking-wider">
              Green Trajectory
            </span>
            <span className="text-[10px] text-[#A3E635] font-bold px-2 py-0.5 rounded-md bg-[#A3E635]/15 border border-[#A3E635]/30">
              Ground Clamped (Straight)
            </span>
          </div>
          <div className="text-[11px] text-[#DED9CC] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#A3E635] animate-pulse" />
            <span>Putt rolls as a true straight line clamped directly to the turf surface with zero arch.</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-[#8FB062] uppercase tracking-wider">
            Shot Shape
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {SHAPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeShape(opt.id)}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center border cursor-pointer text-center ${
                  shape === opt.id
                    ? 'bg-[#8FB062] text-[#1B291A] border-[#7CA352] ring-1 ring-[#7CA352]/50 shadow-xs'
                    : 'bg-white/10 text-white hover:bg-white/15 border-white/15'
                }`}
                title={opt.description}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wind Info Bar */}
      <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl text-[11px] border border-white/10">
        <div className="flex items-center gap-1.5 text-[#DED9CC]">
          <Wind className="w-3.5 h-3.5 text-[#8FB062]" />
          <span>Ocean Breeze: <strong>{wind.speedMph} mph</strong> ({wind.label.split('(')[0].trim()})</span>
        </div>
        <span className="text-[10px] text-[#D4A31C] font-semibold">
          {isShotOnGreen ? 'Turf roll unaffected' : wind.speedMph > 10 ? 'Compensate for drift' : 'Light breeze'}
        </span>
      </div>

      {/* Big Hit Ball / Roll Putt Button */}
      <button
        type="button"
        id="btn-3d-hit-ball"
        onClick={onHitBall}
        disabled={isHitting}
        className={`w-full py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer active:scale-98 ${
          isHitting
            ? 'bg-[#8FB062]/50 text-[#1B291A] cursor-not-allowed'
            : 'bg-[#8FB062] hover:bg-[#9EC26E] text-[#1B291A] ring-2 ring-[#8FB062]/60 hover:ring-[#8FB062]'
        }`}
      >
        <Play className="w-4 h-4 fill-current" />
        <span>{isShotOnGreen ? `Roll Putt (~${estimatedCarry} yds)` : `Hit Ball (~${estimatedCarry} yds)`}</span>
      </button>
    </div>
  );
};
