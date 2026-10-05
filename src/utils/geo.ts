import {
  LatLngLiteral,
  Club,
  WindCondition,
  ClubRecommendation,
  GolfHole,
  ShotShape,
  PracticeShotResult,
} from '../types/golf';

/**
 * Calculates great-circle distance between two coordinates in Yards
 */
export function calculateDistanceYards(p1: LatLngLiteral | null | undefined, p2: LatLngLiteral | null | undefined): number {
  if (
    !p1 ||
    !p2 ||
    typeof p1.lat !== 'number' ||
    isNaN(p1.lat) ||
    typeof p2.lat !== 'number' ||
    isNaN(p2.lat)
  ) {
    return 0;
  }
  const R = 6371000; // Earth radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = R * c;
  return Math.round(meters * 1.09361); // convert to yards
}

/**
 * Calculates initial bearing from p1 to p2 in degrees (0-360)
 */
export function calculateBearing(p1: LatLngLiteral | null | undefined, p2: LatLngLiteral | null | undefined): number {
  if (
    !p1 ||
    !p2 ||
    typeof p1.lat !== 'number' ||
    isNaN(p1.lat) ||
    typeof p2.lat !== 'number' ||
    isNaN(p2.lat)
  ) {
    return 0;
  }
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Computes an intermediate point along the line between p1 and p2 at fraction t (0..1)
 */
export function interpolatePoint(p1: LatLngLiteral, p2: LatLngLiteral, fraction: number): LatLngLiteral {
  if (!p1 || typeof p1.lat !== 'number') return p2 || { lat: 0, lng: 0 };
  if (!p2 || typeof p2.lat !== 'number') return p1;
  return {
    lat: p1.lat + (p2.lat - p1.lat) * fraction,
    lng: p1.lng + (p2.lng - p1.lng) * fraction,
  };
}

/**
 * Standard golf club bag with typical carry distances, lofts, and flight characteristics
 */
export const DEFAULT_CLUBS: Club[] = [
  { id: 'driver', name: 'Driver', category: 'wood', typicalCarryYards: 250, loft: '10.5°', trajectory: 'High Launch / Low Spin', idealWindSpeed: '< 15 mph' },
  { id: '3wood', name: '3-Wood', category: 'wood', typicalCarryYards: 220, loft: '15°', trajectory: 'Mid-High Penetrating', idealWindSpeed: '< 20 mph' },
  { id: '5wood', name: '5-Wood', category: 'wood', typicalCarryYards: 200, loft: '18°', trajectory: 'High Arc', idealWindSpeed: '< 15 mph' },
  { id: '4hybrid', name: '4-Hybrid', category: 'hybrid', typicalCarryYards: 188, loft: '22°', trajectory: 'Mid-High Piercing', idealWindSpeed: 'Any' },
  { id: '4iron', name: '4-Iron', category: 'iron', typicalCarryYards: 185, loft: '21°', trajectory: 'Low-to-Mid Stinger', idealWindSpeed: '25-40 mph gale' },
  { id: '5iron', name: '5-Iron', category: 'iron', typicalCarryYards: 175, loft: '24°', trajectory: 'Low Punch / Flighted Stinger', idealWindSpeed: '20-35 mph gale' },
  { id: '6iron', name: '6-Iron', category: 'iron', typicalCarryYards: 162, loft: '28°', trajectory: 'Mid Punch (Tom Kite 1992 U.S. Open)', idealWindSpeed: '18-30 mph wind' },
  { id: '7iron', name: '7-Iron', category: 'iron', typicalCarryYards: 150, loft: '32°', trajectory: 'Knockdown Flight', idealWindSpeed: '15-25 mph wind' },
  { id: '8iron', name: '8-Iron', category: 'iron', typicalCarryYards: 138, loft: '36°', trajectory: 'Smooth Controlled 3/4 Swing', idealWindSpeed: '12-20 mph wind' },
  { id: '9iron', name: '9-Iron', category: 'iron', typicalCarryYards: 125, loft: '41°', trajectory: 'Flighted Mid-Trajectory', idealWindSpeed: '8-15 mph wind' },
  { id: 'pw', name: 'Pitching Wedge (46°)', category: 'wedge', typicalCarryYards: 114, loft: '46°', trajectory: 'Controlled Piercing Arc', idealWindSpeed: '5-12 mph wind' },
  { id: 'gw', name: 'Gap Wedge (50°/52°)', category: 'wedge', typicalCarryYards: 102, loft: '51°', trajectory: 'High Soft Arc / Smooth 3/4', idealWindSpeed: '0-8 mph calm' },
  { id: 'sw', name: 'Sand Wedge (56°)', category: 'wedge', typicalCarryYards: 90, loft: '56°', trajectory: 'High Drop & Stop Spinner', idealWindSpeed: '0-5 mph calm' },
  { id: 'lw', name: 'Lob Wedge (60°)', category: 'wedge', typicalCarryYards: 75, loft: '60°', trajectory: 'Ultra-High Flop / Soft Drop', idealWindSpeed: 'Downwind / Calm' },
  { id: 'pitch', name: 'Pitch / 1/2 Wedge', category: 'wedge', typicalCarryYards: 45, loft: '56°/60°', trajectory: 'Controlled Soft Landing', idealWindSpeed: 'Any' },
  { id: 'chip', name: 'Fringe Chip / Bump & Run', category: 'wedge', typicalCarryYards: 20, loft: '52°/56°', trajectory: 'Low Rollout to Cup', idealWindSpeed: 'Any' },
  { id: 'putter', name: 'Tour Blade Putter', category: 'putter', typicalCarryYards: 8, loft: '3.5°', trajectory: 'True Rolling Surface Glide', idealWindSpeed: 'Any' },
];

/**
 * Calculates effective playing yardage considering elevation and wind component
 */
export function calculateEffectiveYardage(
  actualYards: number,
  shotBearing: number,
  elevationYards: number,
  wind?: WindCondition
): { effectiveYards: number; windEffect: number; elevationEffect: number } {
  // Elevation rule of thumb: ~0.9 yard per yard of drop (downhill plays shorter)
  const elevationEffect = elevationYards * 0.9;

  let windEffect = 0;
  if (wind && wind.speedMph > 0) {
    // Relative angle between shot direction and wind blowing FROM direction
    const angleDiffRad = ((shotBearing - wind.directionDegrees) * Math.PI) / 180;
    // Headwind adds yardage, tailwind reduces yardage: cos(0) = direct headwind
    const headwindComponent = Math.cos(angleDiffRad) * wind.speedMph;
    // 1 mph headwind adds approx 0.8% to 1.1% effective yardage
    windEffect = (headwindComponent * 0.009) * actualYards;
  }

  const effectiveYards = Math.round(actualYards + elevationEffect + windEffect);

  return {
    effectiveYards: Math.max(10, effectiveYards),
    windEffect: Math.round(windEffect),
    elevationEffect: Math.round(elevationEffect),
  };
}

/**
 * Recommends the best club for a given target distance
 */
export function recommendClub(targetYards: number, clubs = DEFAULT_CLUBS): Club {
  let closest = clubs[0];
  let minDiff = Math.abs(clubs[0].typicalCarryYards - targetYards);

  for (const club of clubs) {
    const diff = Math.abs(club.typicalCarryYards - targetYards);
    if (diff < minDiff) {
      minDiff = diff;
      closest = club;
    }
  }
  return closest;
}

/**
 * Interpolates or extrapolates elevation (in feet) along the hole profile for a given distance in yards from the tee
 */
export function getElevationAtDistance(hole: GolfHole, distanceYards: number): { elevationFeet: number; label?: string } {
  const profile = hole.elevationProfile;
  if (!profile || profile.length === 0) {
    const totalDist = hole.yardage || 100;
    const netElevFeet = hole.elevationChangeYards * 3;
    const teeFeet = netElevFeet < 0 ? Math.abs(netElevFeet) : 0;
    const pinFeet = netElevFeet < 0 ? 0 : netElevFeet;
    const ratio = Math.min(Math.max(distanceYards / (totalDist || 1), 0), 1.5);
    const elev = teeFeet + (pinFeet - teeFeet) * ratio;
    return { elevationFeet: Math.round(elev * 10) / 10, label: 'Fairway Contour' };
  }

  if (distanceYards <= profile[0].distanceYards) {
    return { elevationFeet: profile[0].elevationFeet, label: profile[0].label };
  }

  const lastPoint = profile[profile.length - 1];
  if (distanceYards >= lastPoint.distanceYards) {
    const secondLast = profile[profile.length - 2] || profile[0];
    const dDist = lastPoint.distanceYards - secondLast.distanceYards || 1;
    const dElev = lastPoint.elevationFeet - secondLast.elevationFeet;
    const slope = dElev / dDist;
    const extraDist = distanceYards - lastPoint.distanceYards;
    const elev = lastPoint.elevationFeet + slope * extraDist;
    return { elevationFeet: Math.round(elev * 10) / 10, label: 'Past Green Fringe' };
  }

  // Find segment
  for (let i = 0; i < profile.length - 1; i++) {
    const p1 = profile[i];
    const p2 = profile[i + 1];
    if (distanceYards >= p1.distanceYards && distanceYards <= p2.distanceYards) {
      const segDist = p2.distanceYards - p1.distanceYards || 1;
      const t = (distanceYards - p1.distanceYards) / segDist;
      const elev = p1.elevationFeet + (p2.elevationFeet - p1.elevationFeet) * t;
      const label = t < 0.35 ? p1.label : t > 0.65 ? p2.label : `${p1.label} → ${p2.label}`;
      return { elevationFeet: Math.round(elev * 10) / 10, label };
    }
  }

  return { elevationFeet: lastPoint.elevationFeet, label: lastPoint.label };
}

/**
 * Comprehensive research-backed club recommendation with swing techniques and wind adjustments
 */
export function getDetailedClubAdvice(
  actualDistance: number,
  effectiveYards: number,
  wind?: WindCondition
): ClubRecommendation {
  const primaryClub = recommendClub(effectiveYards);
  const windSpeed = wind?.speedMph || 0;

  // Determine alternative club (clubbing up for punch / knockdown vs high full swing)
  let alternativeClub: Club | undefined;
  let shotTechnique = 'Full Swing';
  let trajectoryTip = 'Standard mid-high trajectory towards center bowl.';
  let caddieNote = 'Plays downhill. Aim for center of green.';

  if (windSpeed >= 25) {
    shotTechnique = 'Low Stinger / Punch Shot';
    trajectoryTip = 'Ball back in stance, hands forward, low follow-through to pierce coastal gusts.';
    caddieNote = 'Historic U.S. Open gale conditions! Club up 3–4 clubs (like Tom Kite hitting 6-iron in 1992) to keep ball below turbulent ocean air.';
    // Find club with ~10-15 more yards to allow smooth half-swing
    alternativeClub = recommendClub(effectiveYards + 15);
  } else if (windSpeed >= 15) {
    shotTechnique = 'Controlled 3/4 Knockdown';
    trajectoryTip = 'Choke down 1 inch, smooth tempo, avoid high spinning balloon flights into Carmel Bay winds.';
    caddieNote = 'Firm ocean headwind/crosswind. Club up 1–2 clubs and take a smooth three-quarter swing.';
    alternativeClub = recommendClub(effectiveYards + 10);
  } else if (windSpeed >= 8) {
    shotTechnique = 'Flighted Wedge / Smooth Iron';
    trajectoryTip = 'Favor the center green bowl. Account for left-to-right drift off the ocean bluffs.';
    caddieNote = 'Moderate coastal breeze. Pitching Wedge or 9-Iron flighted low will hold its line best.';
    alternativeClub = recommendClub(effectiveYards + 8);
  } else {
    shotTechnique = 'Standard Wedge Approach';
    trajectoryTip = 'High soft landing with backspin into receptive greens.';
    caddieNote = 'Calm conditions! Downhill 40-foot drop makes 106 yards play like ~92–95 yards. Sand Wedge (56°) or Gap Wedge (52°) directly at the flag.';
    alternativeClub = recommendClub(effectiveYards - 8);
  }

  return {
    primaryClub,
    alternativeClub: alternativeClub?.id !== primaryClub.id ? alternativeClub : undefined,
    shotTechnique,
    trajectoryTip,
    caddieNote,
  };
}

/**
 * Decodes a standard Google Maps encoded polyline string into an array of LatLngLiteral coordinates
 */
export function decodePolyline(encoded: string): LatLngLiteral[] {
  const points: LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: Number((lat / 1e5).toFixed(6)),
      lng: Number((lng / 1e5).toFixed(6)),
    });
  }

  return points;
}

/**
 * Computes destination coordinate given start point, distance in yards, and bearing in degrees
 */
export function computeDestinationPoint(
  start: LatLngLiteral | null | undefined,
  distanceYards: number,
  bearingDegrees: number
): LatLngLiteral {
  if (
    !start ||
    typeof start.lat !== 'number' ||
    isNaN(start.lat) ||
    typeof start.lng !== 'number' ||
    isNaN(start.lng)
  ) {
    return { lat: 0, lng: 0 };
  }
  const R = 6371000;
  const d = distanceYards * 0.9144;
  const brng = (bearingDegrees * Math.PI) / 180;
  const lat1 = (start.lat * Math.PI) / 180;
  const lng1 = (start.lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d / R) +
      Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
      Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: Number(((lat2 * 180) / Math.PI).toFixed(6)),
    lng: Number(((lng2 * 180) / Math.PI).toFixed(6)),
  };
}

/**
 * Checks if a geographic point lies in an Out of Bounds (OB) area or unplayable penalty hazard
 */
/**
 * Tests whether a geographic point lies inside a closed polygon using ray-casting
 */
export function isPointInPolygon(
  pt: LatLngLiteral,
  poly: LatLngLiteral[]
): boolean {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng;
    const yi = poly[i].lat;
    const xj = poly[j].lng;
    const yj = poly[j].lat;
    const intersect =
      yi > pt.lat !== yj > pt.lat &&
      pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks whether a ball position is Out-Of-Bounds (OB) or submerged in a water hazard
 */
export function isPositionOutOfBounds(
  position: LatLngLiteral | null | undefined,
  hole: GolfHole | null | undefined
): { isOB: boolean; reason?: string } {
  if (!position || !hole || typeof position.lat !== 'number') {
    return { isOB: false };
  }

  // 1. Water, Ocean, or Out-of-bounds hazards
  if (hole.hazards) {
    for (const h of hole.hazards) {
      if (h.type === 'ocean' || h.type === 'water' || h.type === 'out_of_bounds') {
        if (h.polyline) {
          const poly = decodePolyline(h.polyline);
          if (isPointInPolygon(position, poly)) {
            return { isOB: true, reason: `Submerged in ${h.name}` };
          }
        }
        const d = calculateDistanceYards(position, h.position);
        const hazardRadius = h.type === 'ocean' ? 14 : h.type === 'water' ? 12 : 14;
        if (d <= hazardRadius) {
          return { isOB: true, reason: `Submerged in ${h.name}` };
        }
      }
    }
  }

  // 2. Specific hole natural boundaries
  if (hole.id === 'pebble-beach-7') {
    // South / West coastal cliffs over the ocean
    if (position.lat < 36.56114 || position.lng < -121.94060) {
      return { isOB: true, reason: 'Tumbled off the rocky cliffs into the Pacific Ocean' };
    }
    // East coastal bluffs into Carmel Bay
    if (position.lng > -121.94005) {
      return { isOB: true, reason: 'Pushed right over the bluffs into Carmel Bay' };
    }
  }

  // 3. Extreme lateral dispersion off the hole corridor (> 42 yards offline)
  const teeToPinBearing = calculateBearing(hole.teeBox, hole.pinPosition);
  const teeToBallBearing = calculateBearing(hole.teeBox, position);
  const dist = calculateDistanceYards(hole.teeBox, position);
  const angleDiff = Math.abs(teeToPinBearing - teeToBallBearing);
  const lateralYds = dist * Math.sin((angleDiff * Math.PI) / 180);
  if (Math.abs(lateralYds) > 42) {
    return { isOB: true, reason: 'Sliced or hooked far beyond the course playing boundaries' };
  }

  return { isOB: false };
}

/**
 * Checks if a geographic point lies on or within the putting green complex of the hole
 */
export function isPositionOnGreen(
  position: LatLngLiteral | null | undefined,
  hole: GolfHole | null | undefined
): boolean {
  if (
    !position ||
    !hole ||
    !hole.pinPosition ||
    typeof position.lat !== 'number' ||
    typeof hole.pinPosition.lat !== 'number'
  ) {
    return false;
  }

  // 1. Water or Out of bounds is never on the green
  if (isPositionOutOfBounds(position, hole).isOB) {
    return false;
  }

  // 2. High-precision polygon check if green polygon is defined
  if (hole.polylines && hole.polylines.length > 0) {
    const greenPolyDef = hole.polylines.find(
      (p) => p.id.includes('green') || p.name.toLowerCase().includes('green')
    );
    if (greenPolyDef && greenPolyDef.encoded) {
      const greenCoords = decodePolyline(greenPolyDef.encoded);
      if (isPointInPolygon(position, greenCoords)) {
        return true;
      }
    }
  }

  const distanceToPinYards = calculateDistanceYards(position, hole.pinPosition);

  // Dimensions of putting green
  const depthYards = hole.greenDimensions?.depthYards || 24;
  const widthYards = hole.greenDimensions?.widthYards || 18;
  const halfDepth = depthYards / 2;
  const halfWidth = widthYards / 2;

  // Calculate oriented components along the hole line of play (depth = along hole axis, width = cross axis)
  const holeBearing = calculateBearing(hole.teeBox, hole.pinPosition);
  const ballBearing = calculateBearing(hole.pinPosition, position);
  const angleDiffRad = (((ballBearing - holeBearing + 180) % 360 - 180) * Math.PI) / 180;

  const longitudinalDist = Math.abs(distanceToPinYards * Math.cos(angleDiffRad));
  const lateralDist = Math.abs(distanceToPinYards * Math.sin(angleDiffRad));

  // Ellipse equation for green with 0.8 yard collar margin
  const normalizedDist =
    Math.pow(longitudinalDist / (halfDepth + 0.8), 2) +
    Math.pow(lateralDist / (halfWidth + 0.8), 2);

  // Ball is on green if within the elliptical green surface or inside the inner circular core
  const isWithinGreenTurf =
    normalizedDist <= 1.0 || distanceToPinYards <= Math.min(halfDepth, halfWidth) + 0.5;

  return isWithinGreenTurf;
}

/**
 * Checks if a geographic point lies inside any sand trap / bunker on the hole
 */
export function isPositionInSandTrap(
  position: LatLngLiteral | null | undefined,
  hole: GolfHole | null | undefined
): { inBunker: boolean; bunkerName?: string } {
  if (!position || !hole || !hole.hazards || typeof position.lat !== 'number') {
    return { inBunker: false };
  }

  // If the ball has landed on the green turf, it is on the green and cannot be in a sand trap
  if (isPositionOnGreen(position, hole)) {
    return { inBunker: false };
  }

  for (const h of hole.hazards) {
    if (h.type === 'bunker') {
      if (h.polyline) {
        const bunkerCoords = decodePolyline(h.polyline);
        if (isPointInPolygon(position, bunkerCoords)) {
          return { inBunker: true, bunkerName: h.name };
        }
      }
      const d = calculateDistanceYards(position, h.position);
      // Realistic greenside / pot bunker radius is 4.5 yards (approx 27 ft across)
      const bunkerRadius = (h as any).radiusYards || 4.5;
      if (d <= bunkerRadius) {
        return { inBunker: true, bunkerName: h.name };
      }
    }
  }
  return { inBunker: false };
}

/**
 * Simulates a practice golf shot taking into account aimed distance, power percentage,
 * shot shape (slice, fade, straight, draw, hook), wind, and hole hazard positions.
 */
export function simulatePracticeShot(
  startPos: LatLngLiteral,
  aimPos: LatLngLiteral,
  powerPercent: number,
  shape: ShotShape,
  hole: GolfHole,
  wind?: WindCondition,
  shotNumber: number = 1,
  startLie?: 'tee' | 'fairway' | 'green' | 'bunker' | 'rough' | 'out_of_bounds'
): PracticeShotResult {
  const aimedDistance = calculateDistanceYards(startPos, aimPos);
  const initialBearing = calculateBearing(startPos, aimPos);
  const isShotOnGreen =
    startLie === 'green' || isPositionOnGreen(startPos, hole);

  // Sand trap power penalty: Sand resistance diminishes power and carry by 30%
  const isHittingFromBunker =
    startLie === 'bunker' || isPositionInSandTrap(startPos, hole).inBunker;
  const bunkerPenaltyFactor = isHittingFromBunker ? 0.70 : 1.0;

  // Lateral curvature in yards (positive = right / slice, negative = left / hook)
  const shapeDispersionMap: Record<ShotShape, number> = {
    'heavy-hook': -26,
    hook: -16,
    draw: -7,
    straight: 0,
    fade: 7,
    slice: 16,
    'heavy-slice': 26,
  };

  // For shots on the green (putts / ground rolls), ball moves as a straight line with zero aerodynamic curve
  const rawCurveYards = isShotOnGreen ? 0 : shapeDispersionMap[shape] ?? 0;
  const distanceCurveScale = Math.min(1, Math.max(0.05, aimedDistance / 60));
  const curveYards = isShotOnGreen ? 0 : rawCurveYards * distanceCurveScale;

  // Aerodynamic carry loss/gain based on shape (only applies aloft)
  let spinCarryFactor = 1.0;
  if (!isShotOnGreen) {
    if (shape === 'heavy-slice') spinCarryFactor = 0.92;
    else if (shape === 'slice') spinCarryFactor = 0.95;
    else if (shape === 'fade') spinCarryFactor = 0.98;
    else if (shape === 'draw') spinCarryFactor = 1.02;
    else if (shape === 'hook') spinCarryFactor = 1.03;
    else if (shape === 'heavy-hook') spinCarryFactor = 1.04;
  }

  // Wind calculation (only affects airborne shots)
  let headwindEffect = 0;
  let crosswindEffectYards = 0;
  if (!isShotOnGreen && wind && wind.speedMph > 0 && aimedDistance > 20) {
    const angleDiffRad = ((initialBearing - wind.directionDegrees) * Math.PI) / 180;
    const headwindMph = Math.cos(angleDiffRad) * wind.speedMph;
    // Headwind reduces carry distance (~0.7% per mph), tailwind extends carry
    headwindEffect = -(headwindMph * 0.007);

    // Crosswind pushes ball laterally (positive = pushes right)
    const crosswindMph = Math.sin(angleDiffRad) * wind.speedMph;
    crosswindEffectYards = crosswindMph * 0.45 * (aimedDistance / 100);
  }

  // Final actual carry / roll distance with bunker power penalty
  const powerFactor = powerPercent / 100;
  // For putts and short rolls, allow precision down to 0.5 yard
  const minCarry = isShotOnGreen ? 0.5 : (aimedDistance <= 5 ? 0.5 : aimedDistance <= 20 ? 1 : 8);
  const calculatedCarry =
    aimedDistance * powerFactor * spinCarryFactor * bunkerPenaltyFactor * (1 + headwindEffect);
  const actualCarryYards = Math.max(
    minCarry,
    aimedDistance <= 15 ? Number(calculatedCarry.toFixed(1)) : Math.round(calculatedCarry)
  );

  const totalLateralYards = isShotOnGreen ? 0 : Number((curveYards + crosswindEffectYards).toFixed(1));

  // Generate trajectory points along the flight or ground line
  const steps = 36;
  const trajectory: LatLngLiteral[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const forwardDist = actualCarryYards * t;

    if (isShotOnGreen || Math.abs(totalLateralYards) < 0.1) {
      // Pure straight line along line of play
      const forwardPoint = computeDestinationPoint(startPos, forwardDist, initialBearing);
      trajectory.push(forwardPoint);
    } else {
      // Lateral curve increases aerodynamically as forward velocity slows down in late flight (t^2.1)
      const latOffset = totalLateralYards * Math.pow(t, 2.1);
      const forwardPoint = computeDestinationPoint(startPos, forwardDist, initialBearing);
      const offsetBearing =
        latOffset >= 0
          ? (initialBearing + 90) % 360
          : (initialBearing - 90 + 360) % 360;
      const curvedPoint = computeDestinationPoint(
        forwardPoint,
        Math.abs(latOffset),
        offsetBearing
      );
      trajectory.push(curvedPoint);
    }
  }

  const landingPos = trajectory[trajectory.length - 1];

  // Proximity to hole pin
  const distanceToPinYards = Number(calculateDistanceYards(landingPos, hole.pinPosition).toFixed(1));
  const distanceToPinFeet = Math.max(0, Math.round(distanceToPinYards * 3));

  // Determine lie & hazard detection accurately:
  // 1. Holed out
  // 2. Out of bounds
  // 3. Sand trap (bunker)
  // 4. Green
  // 5. Fairway
  let lie: PracticeShotResult['lie'] = 'fairway';
  let hazardName: string | undefined;
  let feedbackTitle = '⛳ Fairway Lie';
  let feedbackDescription =
    'Clean lie on the fairway. Your next shot has full power with a high arching trajectory.';
  let penalty = false;

  const greenRadius = Math.max(hole.greenDimensions.depthYards, hole.greenDimensions.widthYards) / 2;

  // 1. Check holed out (within 0.6 yards / 1.8 feet or distanceToPinFeet <= 1)
  if (distanceToPinYards <= 0.6 || distanceToPinFeet <= 1) {
    lie = 'holed';
    const scoreDiff = shotNumber - hole.par;
    const scoreName =
      shotNumber === 1
        ? 'HOLE-IN-ONE!'
        : scoreDiff === -2
        ? 'Eagle!'
        : scoreDiff === -1
        ? 'Birdie!'
        : scoreDiff === 0
        ? 'Par!'
        : scoreDiff === 1
        ? 'Bogey'
        : `${shotNumber} Strokes`;

    feedbackTitle = `IN THE CUP! ${scoreName}`;
    feedbackDescription = `Magnificent execution! Shot ${shotNumber} dropped straight into the bottom of the cup to finish Hole ${hole.holeNumber}.`;
  } else {
    // 2. Check Out of Bounds / Water penalty hazards
    const obCheck = isPositionOutOfBounds(landingPos, hole);
    const isGreen = isPositionOnGreen(landingPos, hole);
    const bunkerCheck = isPositionInSandTrap(landingPos, hole);

    if (obCheck.isOB) {
      lie = 'out_of_bounds';
      penalty = true;
      feedbackTitle = '⚠️ OUT OF BOUNDS!';
      feedbackDescription = `${obCheck.reason || 'Ball sailed out of bounds'}. Penalty: +1 stroke. Under golf rules, you must retake your shot from your previous lie.`;
    } else if (isGreen) {
      // 3. Check Putting Green (takes precedence when ball lands on putting surface)
      lie = 'green';
      feedbackTitle = isShotOnGreen
        ? distanceToPinFeet <= 3
          ? 'Tap-In Distance!'
          : distanceToPinFeet <= 8
          ? 'Clean Rolling Putt!'
          : 'Putt on the Green'
        : distanceToPinFeet <= 6
        ? 'Gimme Tap-In Distance!'
        : distanceToPinFeet <= 15
        ? 'Dart to the Pin!'
        : 'On the Green!';
      feedbackDescription = isShotOnGreen
        ? `Rolled smoothly in a straight line along the green surface to ${distanceToPinFeet} ft from the cup.`
        : `Landed cleanly on the green (${distanceToPinFeet} ft to pin). Your next stroke will be a ground roll putt.`;
    } else if (bunkerCheck.inBunker) {
      // 4. Check Sand Trap
      lie = 'bunker';
      hazardName = bunkerCheck.bunkerName;
      feedbackTitle = '🏖️ Sand Trap (Bunker Lie)';
      feedbackDescription = `The ball plugged into the sand in ${bunkerCheck.bunkerName || 'the bunker'}. A 30% power penalty will apply to your next shot out of the sand.`;
    } else {
      // 5. Fairway vs. Green Fringe / Rough
      if (distanceToPinYards <= greenRadius + 8) {
        lie = 'rough';
        feedbackTitle = 'Green Fringe / Collar';
        feedbackDescription = `Settled just off the green on the fringe apron (${distanceToPinFeet} ft to pin). Clean chip or bump-and-run approach.`;
      } else if (Math.abs(totalLateralYards) > 26) {
        lie = 'rough';
        feedbackTitle = 'Deep Rough';
        feedbackDescription = `Curved ${Math.abs(totalLateralYards)} yds offline into the thick rough.`;
      } else {
        lie = 'fairway';
        feedbackTitle = '⛳ Fairway Lie';
        feedbackDescription =
          'Clean contact on the fairway. Your next shot will launch with a majestic high arching flight.';
      }
    }
  }

  return {
    shotNumber,
    startPos,
    aimPos,
    landingPos,
    trajectory,
    aimedDistanceYards: aimedDistance,
    actualCarryYards,
    lateralDispersionYards: totalLateralYards,
    distanceToPinYards,
    distanceToPinFeet,
    lie,
    hazardName,
    feedbackTitle,
    feedbackDescription,
    penalty,
  };
}
