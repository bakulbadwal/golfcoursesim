export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface Hazard {
  id: string;
  name: string;
  type: 'bunker' | 'water' | 'ocean' | 'rough' | 'out_of_bounds' | 'building';
  position: LatLngLiteral;
  description: string;
  dangerLevel: 'high' | 'medium' | 'low';
  polyline?: string; // Encoded polyline boundary/contour
}

export interface HolePolyline {
  id: string;
  name?: string;
  encoded: string;
  strokeColor?: string;
  fillColor?: string;
}

export type ShotShape =
  | 'heavy-hook'
  | 'hook'
  | 'draw'
  | 'straight'
  | 'fade'
  | 'slice'
  | 'heavy-slice';

export interface PracticeShotConfig {
  shotIndex: 1 | 2;
  powerPercent: number; // 50 to 120
  shape: ShotShape;
}

export interface PracticeShotResult {
  shotNumber: number;
  startPos: LatLngLiteral;
  aimPos: LatLngLiteral;
  landingPos: LatLngLiteral;
  trajectory: LatLngLiteral[];
  aimedDistanceYards: number;
  actualCarryYards: number;
  lateralDispersionYards: number;
  distanceToPinYards: number;
  distanceToPinFeet: number;
  lie: 'green' | 'fairway' | 'bunker' | 'out_of_bounds' | 'rough' | 'ocean' | 'holed';
  hazardName?: string;
  feedbackTitle: string;
  feedbackDescription: string;
  penalty?: boolean;
}

export interface TeeOption {
  name: string;
  color: string;
  position: LatLngLiteral;
  yardageToPin: number;
}

export interface TargetWaypoint {
  id: string;
  name: string;
  position: LatLngLiteral;
  recommendedClub?: string;
  notes?: string;
}

export interface ElevationPoint {
  distanceYards: number;
  elevationFeet: number;
  label?: string;
}

export interface GreenContourData {
  fallLineHeading: number; // degrees (0-360) where gravitational break pulls
  slopePercent: number; // e.g. 2.8% slope
  fallLineDirection: string; // e.g. "Back-Right to Front-Left (toward Bay)"
  stimpRating: number; // e.g. 12.5 stimpmeter
  highSide: string;
  lowSide: string;
  ridgeDescription: string;
  tiers?: string[];
}

export interface GolfHole {
  id: string;
  courseName: string;
  holeNumber: number;
  holeName: string;
  par: number;
  yardage: number;
  handicap: number;
  description: string;
  history: string;
  caddieNotes: string;
  elevationChangeYards: number; // e.g. -12 for downhill, +10 for uphill
  elevationProfile?: ElevationPoint[];
  defaultHeading: number; // angle from tee to green
  defaultCenter: LatLngLiteral;
  defaultZoom: number;
  teeBox: LatLngLiteral;
  teeOptions: TeeOption[];
  pinPosition: LatLngLiteral;
  fairwayWaypoints: TargetWaypoint[];
  hazards: Hazard[];
  polylines?: HolePolyline[];
  greenDimensions: {
    depthYards: number;
    widthYards: number;
    slope: string;
  };
  greenContour?: GreenContourData;
  keyWindDirection: string; // e.g. "From Pacific Ocean (West-to-East)"
  defaultLayupPosition?: LatLngLiteral;
  strategies?: {
    twoShot: HoleStrategyInfo;
    threeShot: HoleStrategyInfo;
  };
}

export type StrategyType = '2-shot' | '3-shot';

export interface StrategyShot {
  shotNumber: number;
  title: string;
  subtitle: string;
  targetName: string;
  targetPosition: LatLngLiteral;
  estimatedYards: number;
  recommendedClub: string;
  technique: string;
  risk: string;
  notes: string;
}

export interface HoleStrategyInfo {
  type: StrategyType;
  name: string; // e.g. "2-Shot Run (Birdie Hunt)"
  subtitle: string;
  targetScore: string; // "Birdie (-1)" or "Par (E)"
  shotsCount: 2 | 3;
  caddieAdvice: string;
  idealConditions: string;
  recommendedLayup?: LatLngLiteral;
  layupPresets?: { id: string; name: string; position: LatLngLiteral; description: string }[];
  shots: StrategyShot[];
}

export interface Club {
  id: string;
  name: string;
  category: 'wood' | 'hybrid' | 'iron' | 'wedge' | 'putter';
  typicalCarryYards: number;
  loft: string;
  trajectory?: string;
  idealWindSpeed?: string;
}

export interface ClubRecommendation {
  primaryClub: Club;
  alternativeClub?: Club;
  shotTechnique: string;
  trajectoryTip: string;
  caddieNote: string;
}

export interface WindCondition {
  speedMph: number;
  directionDegrees: number; // 0 = North, 90 = East, 180 = South, 270 = West
  label: string;
}
