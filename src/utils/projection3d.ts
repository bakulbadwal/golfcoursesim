import { LatLngLiteral } from '../types/golf';

export interface Camera3DState {
  center: { lat: number; lng: number; altitude?: number };
  range: number;
  tilt: number;
  heading: number;
  fov?: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  scale: number; // depth scale relative to range
  distForward: number;
}

/**
 * Safely extracts current 3D camera state from a Google Maps 3D Map3DElement.
 */
export function getCameraStateFromElement(el: any, fallbackCenter: LatLngLiteral, fallbackHeading: number): Camera3DState {
  if (!el) {
    return {
      center: { lat: fallbackCenter.lat, lng: fallbackCenter.lng, altitude: 18 },
      range: 220,
      tilt: 68,
      heading: fallbackHeading,
      fov: 38,
    };
  }

  const rawCenter = el.center || fallbackCenter;
  const lat = typeof rawCenter.lat === 'function' ? rawCenter.lat() : Number(rawCenter.lat ?? fallbackCenter.lat);
  const lng = typeof rawCenter.lng === 'function' ? rawCenter.lng() : Number(rawCenter.lng ?? fallbackCenter.lng);
  const altitude = typeof rawCenter.altitude === 'function' ? rawCenter.altitude() : Number(rawCenter.altitude ?? 18);

  const range = typeof el.range === 'number' && el.range > 0 ? el.range : 220;
  const tilt = typeof el.tilt === 'number' ? el.tilt : 68;
  const heading = typeof el.heading === 'number' ? el.heading : fallbackHeading;
  const fov = typeof el.fov === 'number' && el.fov > 5 ? el.fov : 38;

  return {
    center: { lat, lng, altitude },
    range,
    tilt,
    heading,
    fov,
  };
}

/**
 * Projects a 3D geo point (lat, lng, altitude in meters) to 2D screen coordinates
 * based on Google Maps 3D (Map3DElement) camera parameters.
 */
export function project3DToScreen(
  point: { lat: number; lng: number; altitude?: number } | null | undefined,
  camera: Camera3DState | null | undefined,
  viewWidth: number,
  viewHeight: number
): ScreenPoint | null {
  if (
    !point ||
    typeof point.lat !== 'number' ||
    isNaN(point.lat) ||
    typeof point.lng !== 'number' ||
    isNaN(point.lng)
  ) {
    return null;
  }
  if (
    !camera ||
    !camera.center ||
    typeof camera.center.lat !== 'number' ||
    isNaN(camera.center.lat) ||
    typeof camera.center.lng !== 'number' ||
    isNaN(camera.center.lng)
  ) {
    return null;
  }
  const cLat = camera.center.lat;
  const cLng = camera.center.lng;
  const cAlt = camera.center.altitude || 0;
  const pAlt = point.altitude || 0;

  // Local tangent plane conversion (East-North-Up in meters)
  const latRad = (cLat * Math.PI) / 180;
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.cos(latRad);

  const E = (point.lng - cLng) * metersPerDegLng;
  const N = (point.lat - cLat) * metersPerDegLat;
  const U = pAlt - cAlt;

  // Camera orientation angles in radians
  const H = (camera.heading * Math.PI) / 180;
  const T = (camera.tilt * Math.PI) / 180;
  const R = camera.range || 200;

  // Camera eye position relative to center:
  // Camera sits opposite to heading (heading + 180 deg) at distance R*sin(tilt)
  // and elevated R*cos(tilt)
  const camE = -R * Math.sin(T) * Math.sin(H);
  const camN = -R * Math.sin(T) * Math.cos(H);
  const camU = R * Math.cos(T);

  // Vector from camera eye to target point
  const vE = E - camE;
  const vN = N - camN;
  const vU = U - camU;

  // Camera orthonormal basis vectors:
  // Forward vector (direction the camera looks)
  const fE = Math.sin(T) * Math.sin(H);
  const fN = Math.sin(T) * Math.cos(H);
  const fU = -Math.cos(T);

  // Right vector (camera right, horizontal)
  const rE = Math.cos(H);
  const rN = -Math.sin(H);
  const rU = 0;

  // Up vector (camera up, perpendicular to forward and right)
  const uE = Math.cos(T) * Math.sin(H);
  const uN = Math.cos(T) * Math.cos(H);
  const uU = Math.sin(T);

  // Decompose point vector onto camera coordinate system
  const distForward = vE * fE + vN * fN + vU * fU;
  const distRight = vE * rE + vN * rN + vU * rU;
  const distUp = vE * uE + vN * uN + vU * uU;

  // Behind camera or too close to lens
  if (distForward <= 2) {
    return null;
  }

  // Vertical field of view (Google Maps 3D default is ~35-38 deg)
  const fovDeg = camera.fov && camera.fov >= 10 ? camera.fov : 38;
  const fovRad = (fovDeg * Math.PI) / 180;
  const focalLengthY = (viewHeight * 0.5) / Math.tan(fovRad * 0.5);
  const focalLengthX = focalLengthY; // Square pixels

  const x = viewWidth * 0.5 + (distRight / distForward) * focalLengthX;
  const y = viewHeight * 0.5 - (distUp / distForward) * focalLengthY;

  // Depth scale (objects further away scale down naturally)
  const scale = Math.max(0.2, Math.min(2.5, R / distForward));

  return { x, y, scale, distForward };
}
