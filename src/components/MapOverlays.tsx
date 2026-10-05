import React, { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { LatLngLiteral, StrategyType, GolfHole } from '../types/golf';
import { decodePolyline } from '../utils/geo';

interface MapOverlaysProps {
  teePosition: LatLngLiteral;
  targetPosition: LatLngLiteral;
  pinPosition: LatLngLiteral;
  showRings: boolean;
  showFlightArc: boolean;
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
  strategy?: StrategyType;
  layupPosition?: LatLngLiteral;
  hole?: GolfHole;
  showHazards?: boolean;
}

export const MapOverlays: React.FC<MapOverlaysProps> = ({
  teePosition,
  targetPosition,
  pinPosition,
  showRings,
  showFlightArc,
  onMapClick,
  strategy = '2-shot',
  layupPosition,
  hole,
  showHazards = true,
}) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  // References to Google Maps polyline and polygon overlays
  const shot1LineRef = useRef<google.maps.Polyline | null>(null);
  const shot2LineRef = useRef<google.maps.Polyline | null>(null);
  const shot3LineRef = useRef<google.maps.Polyline | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const polylineOverlaysRef = useRef<(google.maps.Polygon | google.maps.Polyline)[]>([]);

  // Setup click listener on map for shot targeting
  useEffect(() => {
    if (!map || !onMapClick) return;
    const listener = map.addListener('click', onMapClick);
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onMapClick]);

  // Update Flight / Strategy Lines
  useEffect(() => {
    if (!map || !mapsLib) return;

    // Clean up previous polylines
    if (shot1LineRef.current) shot1LineRef.current.setMap(null);
    if (shot2LineRef.current) shot2LineRef.current.setMap(null);
    if (shot3LineRef.current) shot3LineRef.current.setMap(null);

    if (!showFlightArc) return;

    if (strategy === '3-shot' && layupPosition) {
      // 3-SHOT STRATEGY RUN
      // 1. Tee to Layup
      shot1LineRef.current = new google.maps.Polyline({
        path: [teePosition, layupPosition],
        geodesic: true,
        strokeColor: '#5A7A3A', // Olive Green
        strokeOpacity: 0.95,
        strokeWeight: 4.5,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#1B291A',
              fillColor: '#8FB062',
              fillOpacity: 1,
            },
            offset: '100%',
          },
        ],
        map,
      });

      // 2. Layup to Green Target
      shot2LineRef.current = new google.maps.Polyline({
        path: [layupPosition, targetPosition],
        geodesic: true,
        strokeColor: '#8FB062', // Sage Green
        strokeOpacity: 0.95,
        strokeWeight: 4,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#1B291A',
              fillColor: '#C2921D',
              fillOpacity: 1,
            },
            offset: '100%',
          },
        ],
        map,
      });

      // 3. Green Target to Pin (Putt)
      shot3LineRef.current = new google.maps.Polyline({
        path: [targetPosition, pinPosition],
        geodesic: true,
        strokeColor: '#C2921D', // Gold
        strokeOpacity: 0.9,
        strokeWeight: 3.5,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 2.5,
              strokeColor: '#C2921D',
            },
            offset: '0',
            repeat: '10px',
          },
        ],
        map,
      });
    } else {
      // 2-SHOT STRATEGY RUN
      // Shot 1: Tee to Green Target
      shot1LineRef.current = new google.maps.Polyline({
        path: [teePosition, targetPosition],
        geodesic: true,
        strokeColor: '#5A7A3A', // Forest Olive
        strokeOpacity: 0.95,
        strokeWeight: 4.5,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#1B291A',
              fillColor: '#8FB062',
              fillOpacity: 1,
            },
            offset: '100%',
          },
        ],
        map,
      });

      // Shot 2: Green Target to Pin (Birdie Putt)
      const isTargetDirectPin =
        Math.abs(targetPosition.lat - pinPosition.lat) < 0.00002 &&
        Math.abs(targetPosition.lng - pinPosition.lng) < 0.00002;

      if (!isTargetDirectPin) {
        shot2LineRef.current = new google.maps.Polyline({
          path: [targetPosition, pinPosition],
          geodesic: true,
          strokeColor: '#C2921D', // Sand Gold
          strokeOpacity: 0.9,
          strokeWeight: 3.5,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 2.5,
                strokeColor: '#C2921D',
              },
              offset: '0',
              repeat: '10px',
            },
            {
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 2.5,
                strokeColor: '#1B291A',
                fillColor: '#C2921D',
                fillOpacity: 1,
              },
              offset: '100%',
            },
          ],
          map,
        });
      }
    }

    return () => {
      if (shot1LineRef.current) shot1LineRef.current.setMap(null);
      if (shot2LineRef.current) shot2LineRef.current.setMap(null);
      if (shot3LineRef.current) shot3LineRef.current.setMap(null);
    };
  }, [map, mapsLib, teePosition, targetPosition, pinPosition, layupPosition, strategy, showFlightArc]);

  // Update Yardage Distance Arcs / Rings
  useEffect(() => {
    if (!map || !mapsLib) return;

    // Clean up old circles
    circlesRef.current.forEach((circle) => circle.setMap(null));
    circlesRef.current = [];

    if (!showRings) return;

    // Rings from Pin: 30, 60, 100, 150 yards in meters (1 yard = 0.9144 m)
    const pinDistancesYards = [30, 60, 100, 150];
    const ringColors = ['#8FB062', '#C2921D', '#5A7A3A', '#8FB062'];

    pinDistancesYards.forEach((distYards, idx) => {
      const radiusMeters = distYards * 0.9144;
      const circle = new google.maps.Circle({
        strokeColor: ringColors[idx % ringColors.length],
        strokeOpacity: 0.5,
        strokeWeight: 1.5,
        fillColor: ringColors[idx % ringColors.length],
        fillOpacity: 0.03,
        map,
        center: pinPosition,
        radius: radiusMeters,
        clickable: false,
      });
      circlesRef.current.push(circle);
    });

    return () => {
      circlesRef.current.forEach((circle) => circle.setMap(null));
      circlesRef.current = [];
    };
  }, [map, mapsLib, pinPosition, showRings]);

  // Render Hazard and Course Polylines / Contours (e.g. Encoded Bunker Boundaries)
  useEffect(() => {
    if (!map || !mapsLib) return;

    // Clean up previous overlays
    polylineOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    polylineOverlaysRef.current = [];

    if (!showHazards && !hole?.polylines?.length) return;

    // Collect all polylines to display
    const polylinesToRender: {
      id: string;
      name?: string;
      encoded: string;
      strokeColor?: string;
      fillColor?: string;
    }[] = [];

    if (hole?.polylines) {
      polylinesToRender.push(...hole.polylines);
    }

    if (showHazards && hole?.hazards) {
      hole.hazards.forEach((h) => {
        if (h.polyline && !polylinesToRender.some((p) => p.encoded === h.polyline)) {
          polylinesToRender.push({
            id: `hazard-poly-${h.id}`,
            name: `${h.name} Contour`,
            encoded: h.polyline,
            strokeColor: h.type === 'bunker' ? '#C2921D' : '#3B82F6',
            fillColor: h.type === 'bunker' ? '#F2E8CF' : '#93C5FD',
          });
        }
      });
    }

    polylinesToRender.forEach((item) => {
      try {
        const path = decodePolyline(item.encoded);
        if (path.length < 2) return;

        // Check if path forms a closed polygon (or has an explicit fill color)
        const isClosed =
          Boolean(item.fillColor) ||
          (path.length > 2 &&
            Math.abs(path[0].lat - path[path.length - 1].lat) < 0.00015 &&
            Math.abs(path[0].lng - path[path.length - 1].lng) < 0.00015);

        let zIndex = 15;
        let fillOpacity = 0.45;
        let strokeWeight = 2.5;

        if (item.id.includes('green')) {
          zIndex = 10;
          fillOpacity = 0.35;
          strokeWeight = 2;
        } else if (item.id.includes('creek') || item.id.includes('water')) {
          zIndex = 12;
          fillOpacity = 0.5;
          strokeWeight = 2.5;
        } else if (item.id.includes('bunker')) {
          zIndex = 16;
          fillOpacity = 0.55;
          strokeWeight = 2.5;
        } else if (item.id.includes('bridge')) {
          zIndex = 20;
          strokeWeight = 3.5;
        }

        if (isClosed && item.fillColor) {
          const polygon = new google.maps.Polygon({
            paths: path,
            strokeColor: item.strokeColor || '#C2921D',
            strokeOpacity: 0.95,
            strokeWeight,
            fillColor: item.fillColor || '#EBD8B0',
            fillOpacity,
            geodesic: true,
            map,
            zIndex,
          });
          polylineOverlaysRef.current.push(polygon);
        } else {
          const polyline = new google.maps.Polyline({
            path,
            strokeColor: item.strokeColor || '#C2921D',
            strokeOpacity: 0.95,
            strokeWeight,
            geodesic: true,
            map,
            zIndex,
          });
          polylineOverlaysRef.current.push(polyline);
        }
      } catch (err) {
        console.warn('Failed to render polyline overlay:', item.id, err);
      }
    });

    return () => {
      polylineOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      polylineOverlaysRef.current = [];
    };
  }, [map, mapsLib, hole, showHazards]);

  return null;
};
