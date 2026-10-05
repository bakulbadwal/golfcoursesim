import React, { useState, useMemo, useRef } from 'react';
import { GolfHole, LatLngLiteral, ElevationPoint } from '../types/golf';
import {
  calculateDistanceYards,
  getElevationAtDistance,
  interpolatePoint,
} from '../utils/geo';
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Mountain,
  Info,
  Crosshair,
  Flag,
  Target,
} from 'lucide-react';

interface ElevationProfileChartProps {
  hole: GolfHole;
  teePosition?: LatLngLiteral;
  targetPosition?: LatLngLiteral;
  pinPosition?: LatLngLiteral;
  onSetTarget?: (target: LatLngLiteral) => void;
}

export const ElevationProfileChart: React.FC<ElevationProfileChartProps> = ({
  hole,
  teePosition,
  targetPosition,
  pinPosition,
  onSetTarget,
}) => {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [unit, setUnit] = useState<'feet' | 'yards'>('feet');
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Resolved coordinates
  const tee = teePosition || hole.teeOptions[0]?.position || hole.teeBox;
  const pin = pinPosition || hole.pinPosition;
  const target = targetPosition || pin;

  // Distances in yards
  const totalPinDistance = calculateDistanceYards(tee, pin) || hole.yardage || 106;
  const targetDistance = calculateDistanceYards(tee, target);
  const targetToPinDistance = calculateDistanceYards(target, pin);

  // Elevation data along profile
  const baseProfile: ElevationPoint[] = useMemo(() => {
    if (hole.elevationProfile && hole.elevationProfile.length > 1) {
      return hole.elevationProfile;
    }
    const totalDist = totalPinDistance || 100;
    const netElevFeet = hole.elevationChangeYards * 3;
    const startFeet = netElevFeet < 0 ? Math.abs(netElevFeet) : 0;
    const endFeet = netElevFeet < 0 ? 0 : netElevFeet;

    return [
      { distanceYards: 0, elevationFeet: startFeet, label: 'Tee Box' },
      { distanceYards: Math.round(totalDist * 0.33), elevationFeet: startFeet - (startFeet - endFeet) * 0.25, label: 'Early Contour' },
      { distanceYards: Math.round(totalDist * 0.66), elevationFeet: startFeet - (startFeet - endFeet) * 0.7, label: 'Approach Apron' },
      { distanceYards: totalDist, elevationFeet: endFeet, label: 'Green / Pin' },
    ];
  }, [hole, totalPinDistance]);

  // Elevation values for key anchors
  const teeElevationData = getElevationAtDistance(hole, 0);
  const pinElevationData = getElevationAtDistance(hole, totalPinDistance);
  const targetElevationData = getElevationAtDistance(hole, targetDistance);

  const teeElevFeet = teeElevationData.elevationFeet;
  const pinElevFeet = pinElevationData.elevationFeet;
  const targetElevFeet = targetElevationData.elevationFeet;

  // Comparisons
  const deltaTargetVsTee = Math.round((targetElevFeet - teeElevFeet) * 10) / 10;
  const deltaTargetVsPin = Math.round((targetElevFeet - pinElevFeet) * 10) / 10;
  const deltaApproachToPin = Math.round((pinElevFeet - targetElevFeet) * 10) / 10;

  // Chart range: include target even if target is beyond the pin
  const maxChartDistance = Math.max(totalPinDistance * 1.12, targetDistance * 1.08, baseProfile[baseProfile.length - 1].distanceYards);

  // Sample points for high-fidelity SVG curve
  const chartPoints = useMemo(() => {
    const points: ElevationPoint[] = [];
    const stepCount = 30;
    for (let i = 0; i <= stepCount; i++) {
      const d = Math.round((i / stepCount) * maxChartDistance);
      const elev = getElevationAtDistance(hole, d);
      points.push({
        distanceYards: d,
        elevationFeet: elev.elevationFeet,
        label: elev.label,
      });
    }
    return points;
  }, [hole, maxChartDistance]);

  // Elevation scale calculation
  const allElevations = chartPoints.map((p) => (unit === 'feet' ? p.elevationFeet : p.elevationFeet / 3));
  const minElev = Math.min(...allElevations);
  const maxElev = Math.max(...allElevations);
  const elevRange = Math.max(maxElev - minElev, unit === 'feet' ? 12 : 4);

  const yPadding = elevRange * 0.22;
  const chartMinY = minElev - yPadding;
  const chartMaxY = maxElev + yPadding;
  const chartYRange = chartMaxY - chartMinY || 1;

  const svgWidth = 440;
  const svgHeight = 190;
  const paddingLeft = 40;
  const paddingRight = 28;
  const paddingTop = 28;
  const paddingBottom = 32;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (distYards: number) => paddingLeft + (Math.min(distYards, maxChartDistance) / maxChartDistance) * innerWidth;
  const getY = (elevVal: number) => paddingTop + innerHeight - ((elevVal - chartMinY) / chartYRange) * innerHeight;

  // Build SVG path
  const pointsString = chartPoints
    .map((p, i) => {
      const x = getX(p.distanceYards);
      const val = unit === 'feet' ? p.elevationFeet : p.elevationFeet / 3;
      const y = getY(val);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const firstPoint = chartPoints[0];
  const lastPoint = chartPoints[chartPoints.length - 1];
  const areaPathString = `${pointsString} L ${getX(lastPoint.distanceYards).toFixed(1)} ${(paddingTop + innerHeight).toFixed(1)} L ${getX(firstPoint.distanceYards).toFixed(1)} ${(paddingTop + innerHeight).toFixed(1)} Z`;

  // Key Coordinates on Chart
  const teeX = getX(0);
  const teeY = getY(unit === 'feet' ? teeElevFeet : teeElevFeet / 3);

  const targetX = getX(targetDistance);
  const targetY = getY(unit === 'feet' ? targetElevFeet : targetElevFeet / 3);

  const pinX = getX(totalPinDistance);
  const pinY = getY(unit === 'feet' ? pinElevFeet : pinElevFeet / 3);

  // Parabolic Shot Flight Arc from Tee to Target
  const shotArcMidX = (teeX + targetX) / 2;
  const peakHeightOffset = Math.min(Math.max(targetDistance * 0.28, 22), 48);
  const shotArcPeakY = Math.min(teeY, targetY) - peakHeightOffset;
  const shotArcPath = `M ${teeX.toFixed(1)} ${teeY.toFixed(1)} Q ${shotArcMidX.toFixed(1)} ${shotArcPeakY.toFixed(1)} ${targetX.toFixed(1)} ${targetY.toFixed(1)}`;

  // Handle clicking directly on the elevation chart
  const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onSetTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const chartRelativeX = (clickX / rect.width) * svgWidth;
    
    if (chartRelativeX < paddingLeft || chartRelativeX > svgWidth - paddingRight) return;
    
    const clickDistRatio = Math.max(0, Math.min(1.2, (chartRelativeX - paddingLeft) / innerWidth));
    const clickedDistance = clickDistRatio * maxChartDistance;
    
    // Project new target along the tee-to-pin vector
    const fraction = clickedDistance / (totalPinDistance || 1);
    const newTargetCoord = interpolatePoint(tee, pin, fraction);
    onSetTarget(newTargetCoord);
  };

  const isTargetAtPin = Math.abs(targetDistance - totalPinDistance) <= 2;
  const playsLikeDeltaYards = Math.round((deltaTargetVsTee / 3) * 0.9 * 10) / 10;
  const effectiveTargetYards = Math.round(targetDistance + playsLikeDeltaYards);

  return (
    <div id="elevation-profile-card" className="bg-[#F1EDE2]/95 border border-[#DED9CC] rounded-3xl p-4 shadow-sm flex flex-col gap-3.5">
      {/* Top Header with Dynamic Target Context and Unit Toggle */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#8FB062]/25 text-[#3B5424] flex items-center justify-center border border-[#8FB062]/40 shadow-xs">
            <Mountain className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-[#1B291A] flex items-center gap-1.5">
              <span>Interactive Elevation Profile</span>
              {isTargetAtPin ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8FB062]/20 text-[#2D451C] border border-[#8FB062]/35">
                  Target at Pin
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C2B280]/30 text-[#614E1B] border border-[#C2B280]/50">
                  Target: {targetDistance}y
                </span>
              )}
            </h4>
            <span className="text-[11px] text-[#5C6353] block">
              Elevation changes relative to Tee, Clicked Landing Point, and Pin
            </span>
          </div>
        </div>

        {/* Unit switch */}
        <div className="flex items-center bg-[#E0DBCF] p-0.5 rounded-xl border border-[#DED9CC] text-[10px] font-bold shadow-2xs">
          <button
            onClick={() => setUnit('feet')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              unit === 'feet' ? 'bg-[#1B291A] text-white shadow-xs' : 'text-[#5C6353] hover:text-[#1B291A]'
            }`}
          >
            FT
          </button>
          <button
            onClick={() => setUnit('yards')}
            className={`px-2 py-1 rounded-lg transition cursor-pointer ${
              unit === 'yards' ? 'bg-[#1B291A] text-white shadow-xs' : 'text-[#5C6353] hover:text-[#1B291A]'
            }`}
          >
            YDS
          </button>
        </div>
      </div>

      {/* 3-Way Comparative Elevation Matrix (Tee vs Clicked Target vs Pin) - Stacked Vertically */}
      <div className="flex flex-col gap-2.5 w-full">
        {/* Card 1: Tee Box Baseline */}
        <div className="bg-[#FDFCF9] border border-[#DED9CC] p-3 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#5C6353] tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#111827]" />
              1. Tee Box
            </span>
            <span className="text-[10px] font-bold text-[#5C6353] bg-[#EBE7DD]/80 px-2 py-0.5 rounded-full">0 yds</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-base font-extrabold text-[#1B291A]">
              {unit === 'feet' ? `${teeElevFeet} ft` : `${(teeElevFeet / 3).toFixed(1)} yds`}
            </div>
            <span className="text-[11px] text-[#5C6353] font-medium">
              {teeElevationData.label || 'Teeing Ground'}
            </span>
          </div>
        </div>

        {/* Card 2: Clicked Target (Landing Point) */}
        <div className="bg-[#C2B280]/15 border border-[#C2B280]/40 p-3 rounded-2xl shadow-2xs ring-1 ring-[#C2B280]/25">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#6B5A24] tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#A88B2A] animate-pulse" />
              2. Clicked Target
            </span>
            <span className="text-[10px] font-extrabold text-[#6B5A24] bg-[#C2B280]/25 px-2 py-0.5 rounded-full">
              {targetDistance} yds
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-[#1B291A]">
                {unit === 'feet' ? `${targetElevFeet} ft` : `${(targetElevFeet / 3).toFixed(1)} yds`}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  deltaTargetVsTee < 0
                    ? 'bg-[#A85832]/15 text-[#A85832]'
                    : deltaTargetVsTee > 0
                    ? 'bg-[#5A7A3A]/15 text-[#5A7A3A]'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {deltaTargetVsTee > 0 ? `+${deltaTargetVsTee} ft` : `${deltaTargetVsTee} ft`}
              </span>
            </div>
            <span className="text-[11px] text-[#6B5A24] font-medium text-right truncate">
              {deltaTargetVsTee < 0
                ? `${Math.abs(deltaTargetVsTee)} ft drop (~${effectiveTargetYards}y play)`
                : deltaTargetVsTee > 0
                ? `${deltaTargetVsTee} ft rise (~${effectiveTargetYards}y play)`
                : 'Level with tee box'}
            </span>
          </div>
        </div>

        {/* Card 3: Green Pin Target */}
        <div className="bg-[#FDFCF9] border border-[#DED9CC] p-3 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#3B5424] tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5A7A3A]" />
              3. Green Pin
            </span>
            <span className="text-[10px] font-bold text-[#3B5424] bg-[#8FB062]/20 px-2 py-0.5 rounded-full">
              {totalPinDistance} yds
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-[#1B291A]">
                {unit === 'feet' ? `${pinElevFeet} ft` : `${(pinElevFeet / 3).toFixed(1)} yds`}
              </span>
              <span className="text-[10px] font-semibold text-[#5C6353]">
                ({deltaTargetVsPin > 0 ? `+${deltaTargetVsPin} ft vs target` : `${deltaTargetVsPin} ft vs target`})
              </span>
            </div>
            <span className="text-[11px] text-[#5C6353] font-medium text-right truncate">
              {isTargetAtPin
                ? 'Target at pin'
                : `${targetToPinDistance}y rem (${deltaApproachToPin < 0 ? `${Math.abs(deltaApproachToPin)} ft drop` : `${deltaApproachToPin} ft climb`})`}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Elevation Cross-Section Visualizer */}
      <div className="relative bg-[#FDFCF9] border border-[#DED9CC] rounded-2xl p-2 shadow-inner overflow-hidden">
        <div className="flex items-center justify-between px-2 pt-1 text-[10px] text-[#5C6353]">
          <span className="font-semibold">Elevation Cross-Section Curve</span>
          <span className="font-medium text-[#8FB062] flex items-center gap-1">
            <Crosshair className="w-3 h-3 text-[#A88B2A]" />
            Click anywhere on the curve to reposition target
          </span>
        </div>

        <svg
          ref={svgRef}
          role="img"
          aria-label={`Hole ${hole.holeNumber} elevation cross-section profile. Total distance ${totalPinDistance} yards, elevation change from ${teeElevFeet} feet at tee to ${pinElevFeet} feet at pin.`}
          tabIndex={0}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          onClick={handleChartClick}
          className="w-full h-auto overflow-visible select-none cursor-crosshair focus:outline-none focus:ring-2 focus:ring-[#8FB062] rounded-xl"
        >
          <title>Elevation Cross-Section Profile for Hole #{hole.holeNumber}</title>
          <desc>Visual cross-section showing terrain elevation profile from tee box to green pin across distance in yards.</desc>
          <defs>
            {/* Terrain Gradient */}
            <linearGradient id="terrainAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8FB062" stopOpacity="0.45" />
              <stop offset="65%" stopColor="#8FB062" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#8FB062" stopOpacity="0.02" />
            </linearGradient>

            {/* Surface Line Gradient */}
            <linearGradient id="terrainStrokeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#223318" />
              <stop offset="50%" stopColor="#446127" />
              <stop offset="100%" stopColor="#6C8F3E" />
            </linearGradient>

            {/* Target Area Highlight Gradient */}
            <radialGradient id="targetGlowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#D4A31C" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#D4A31C" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#D4A31C" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Grid Lines & Elevation Labels */}
          {[0.2, 0.5, 0.8].map((factor, idx) => {
            const yVal = chartMinY + factor * chartYRange;
            const yPos = getY(yVal);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={svgWidth - paddingRight}
                  y2={yPos}
                  stroke="#EBE7DD"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 6}
                  y={yPos + 3}
                  textAnchor="end"
                  className="fill-[#5C6353] text-[9px] font-medium"
                >
                  {yVal.toFixed(0)}{unit === 'feet' ? '′' : 'y'}
                </text>
              </g>
            );
          })}

          {/* Baseline (Distance Axis) */}
          <line
            x1={paddingLeft}
            y1={paddingTop + innerHeight}
            x2={svgWidth - paddingRight}
            y2={paddingTop + innerHeight}
            stroke="#DED9CC"
            strokeWidth="1.5"
          />

          {/* Distance Ticks on Axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const dYards = Math.round(pct * maxChartDistance);
            const xPos = getX(dYards);
            return (
              <g key={idx}>
                <line
                  x1={xPos}
                  y1={paddingTop + innerHeight}
                  x2={xPos}
                  y2={paddingTop + innerHeight + 4}
                  stroke="#8C877A"
                  strokeWidth="1"
                />
                <text
                  x={xPos}
                  y={paddingTop + innerHeight + 15}
                  textAnchor={idx === 0 ? 'start' : idx === 4 ? 'end' : 'middle'}
                  className="fill-[#5C6353] text-[9px] font-bold"
                >
                  {dYards}y
                </text>
              </g>
            );
          })}

          {/* Terrain Area Fill */}
          <path d={areaPathString} fill="url(#terrainAreaGrad)" />

          {/* Surface Terrain Contour Path */}
          <path
            d={pointsString}
            fill="none"
            stroke="url(#terrainStrokeGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Ball Trajectory Shot Arc to Target */}
          <path
            d={shotArcPath}
            fill="none"
            stroke="#C2921D"
            strokeWidth="2"
            strokeDasharray="4 2.5"
            className="animate-pulse"
          />

          {/* Target to Pin Approach Connector Line (if target is before pin) */}
          {!isTargetAtPin && (
            <line
              x1={targetX}
              y1={targetY}
              x2={pinX}
              y2={pinY}
              stroke="#5A7A3A"
              strokeWidth="1.5"
              strokeDasharray="2 2"
              opacity="0.7"
            />
          )}

          {/* Vertical Drop-line from Target to Axis */}
          <line
            x1={targetX}
            y1={targetY}
            x2={targetX}
            y2={paddingTop + innerHeight}
            stroke="#C2921D"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.8"
          />

          {/* 1. TEE BOX MARKER (x = 0) */}
          <g transform={`translate(${teeX}, ${teeY})`}>
            <circle r="6" fill="#111827" stroke="#FFFFFF" strokeWidth="2" />
            <circle r="2" fill="#FFFFFF" />
            <text
              x="0"
              y="-12"
              textAnchor="middle"
              className="fill-[#111827] text-[10px] font-extrabold tracking-tight"
            >
              Tee ({teeElevFeet}′)
            </text>
          </g>

          {/* 2. GREEN PIN MARKER (x = totalPinDistance) */}
          <g transform={`translate(${pinX}, ${pinY})`}>
            <circle r="6" fill="#4B6B2F" stroke="#FFFFFF" strokeWidth="2" />
            {/* Mini flag graphic */}
            <path d="M -1 0 L -1 -14 L 6 -10 L -1 -6 Z" fill="#E11D48" stroke="#B91C1C" strokeWidth="0.5" />
            <line x1="-1" y1="0" x2="-1" y2="-14" stroke="#1B291A" strokeWidth="1.5" />
            <text
              x="0"
              y="-18"
              textAnchor="middle"
              className="fill-[#3B5424] text-[10px] font-extrabold"
            >
              Pin ({pinElevFeet}′)
            </text>
          </g>

          {/* 3. CLICKED TARGET MARKER (x = targetDistance) */}
          <g transform={`translate(${targetX}, ${targetY})`}>
            {/* Glowing background ring */}
            <circle r="12" fill="url(#targetGlowGrad)" />
            {/* Outer target ring */}
            <circle r="7.5" fill="#D4A31C" stroke="#FFFFFF" strokeWidth="2" />
            {/* Center bullseye */}
            <circle r="2.5" fill="#1B291A" />
            {/* Crosshair ticks */}
            <line x1="-9" y1="0" x2="-5" y2="0" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="5" y1="0" x2="9" y2="0" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="0" y1="-9" x2="0" y2="-5" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="0" y1="5" x2="0" y2="9" stroke="#FFFFFF" strokeWidth="1" />

            {/* Target Tooltip / Badge */}
            <g transform={`translate(0, ${targetY < paddingTop + 30 ? 22 : -18})`}>
              <rect
                x="-46"
                y="-11"
                width="92"
                height="19"
                rx="5"
                fill="#1B291A"
                stroke="#C2921D"
                strokeWidth="1"
              />
              <text
                x="0"
                y="2.5"
                textAnchor="middle"
                className="fill-[#FDFCF9] text-[9.5px] font-bold"
              >
                Target: {targetDistance}y • {targetElevFeet}′
              </text>
            </g>
          </g>

          {/* Checkpoint Nodes along the profile */}
          {baseProfile.map((cp, idx) => {
            const cx = getX(cp.distanceYards);
            const cy = getY(unit === 'feet' ? cp.elevationFeet : cp.elevationFeet / 3);
            const isHovered = hoveredPointIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredPointIndex(idx)}
                onMouseLeave={() => setHoveredPointIndex(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 4.5 : 2}
                  fill={isHovered ? '#1B291A' : '#5A7A3A'}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Feature / Hovered Topography Description */}
      {hoveredPointIndex !== null && baseProfile[hoveredPointIndex] ? (
        <div className="bg-[#E0DBCF]/90 border border-[#DED9CC] rounded-2xl p-2.5 flex items-center justify-between text-xs transition">
          <div>
            <div className="font-bold text-[#1B291A]">
              {baseProfile[hoveredPointIndex].label}
            </div>
            <div className="text-[11px] text-[#5C6353]">
              Distance from tee: <strong className="text-[#1B291A]">{baseProfile[hoveredPointIndex].distanceYards} yds</strong>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-extrabold text-[#1B291A] bg-white/80 px-2 py-0.5 rounded-md border border-[#DED9CC]">
              {baseProfile[hoveredPointIndex].elevationFeet} ft elev
            </span>
            <span className="block text-[10px] text-[#5C6353] mt-0.5">
              {baseProfile[hoveredPointIndex].elevationFeet - teeElevFeet >= 0
                ? `+${baseProfile[hoveredPointIndex].elevationFeet - teeElevFeet} ft vs tee`
                : `${baseProfile[hoveredPointIndex].elevationFeet - teeElevFeet} ft vs tee`}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-[#8FB062]/10 border border-[#8FB062]/25 rounded-2xl p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#3E4738]">
            <Info className="w-3.5 h-3.5 text-[#5A7A3A] flex-shrink-0" />
            <span>
              <strong>Slope Verdict:</strong>{' '}
              {deltaTargetVsTee < -3
                ? `Shot is ${Math.abs(deltaTargetVsTee)} ft downhill (hang-time increases, plays ${Math.abs(playsLikeDeltaYards)}y shorter).`
                : deltaTargetVsTee > 3
                ? `Shot is ${deltaTargetVsTee} ft uphill (plays ${playsLikeDeltaYards}y longer, club up).`
                : 'Shot is virtually flat level relative to tee elevation.'}
            </span>
          </div>
          {onSetTarget && (
            <button
              onClick={() => onSetTarget(pin)}
              className="text-[10px] font-bold text-[#5A7A3A] hover:text-[#1B291A] underline cursor-pointer ml-2 flex-shrink-0"
            >
              Reset to Pin
            </button>
          )}
        </div>
      )}
    </div>
  );
};
