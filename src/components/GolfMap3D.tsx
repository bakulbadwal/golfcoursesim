import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  GolfHole,
  LatLngLiteral,
  TeeOption,
  WindCondition,
  StrategyType,
  ShotShape,
  Club,
  PracticeShotResult,
} from '../types/golf';
import { Shot3DPlanner } from './Shot3DPlanner';
import { FlightTracerOverlay } from './FlightTracerOverlay';
import { getCameraStateFromElement } from '../utils/projection3d';
import {
  Eye,
  Flag,
  Layers,
  Video,
  RotateCw,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Target,
  RotateCcw,
  Play,
  CheckCircle2,
  Trophy,
  AlertTriangle,
  Map as MapIcon,
} from 'lucide-react';
import {
  calculateBearing,
  calculateDistanceYards,
  computeDestinationPoint,
  recommendClub,
  DEFAULT_CLUBS,
  simulatePracticeShot,
  isPositionOnGreen,
} from '../utils/geo';

// Web Audio API synthesizer: singleton AudioContext with user-gesture auto-unlock (WebKit/Blink compliant)
let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playGolfSound(type: 'strike' | 'land' | 'putt' | 'cup' | 'sand') {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (type === 'cup') {
      // Crisp resonant golf ball dropping into the bottom of the cup (double rattle)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(860, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.07);
      gain1.gain.setValueAtTime(0.35, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.09);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(580, ctx.currentTime + 0.06);
      osc2.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.14);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.06);
      osc2.stop(ctx.currentTime + 0.16);
      return;
    }

    if (type === 'putt') {
      // Crisp resonant putter click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      return;
    }

    if (type === 'sand') {
      // Deep muffled sand explosion thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.28);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.31);
      return;
    }

    if (type === 'strike') {
      // Crisp driver / iron 'thwack' sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);

      // White noise pop for ball compression
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();
    } else if (type === 'land') {
      // Soft turf touchdown thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    }
  } catch (e) {
    // Ignore audio failures if browser restricts audio autoplay
  }
}

function getScoreName(shots: number, par: number): string {
  if (shots === 1) return 'HOLE-IN-ONE! 🏆';
  const diff = shots - par;
  if (diff <= -3) return 'Albatross! 🦅';
  if (diff === -2) return 'Eagle! 🦅';
  if (diff === -1) return 'Birdie! 🐦';
  if (diff === 0) return 'Par 🎯';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double Bogey';
  return `${shots} Strokes (+${diff})`;
}

interface GolfMap3DProps {
  hole: GolfHole;
  selectedTee: TeeOption;
  targetPosition: LatLngLiteral;
  onSetTarget: (pos: LatLngLiteral) => void;
  onSelectTee: (tee: TeeOption) => void;
  wind: WindCondition;
  onUpdateWind: (wind: WindCondition) => void;
  onExit3D: () => void;
  showHazards?: boolean;
  onToggleHazards?: () => void;
  strategy?: StrategyType;
  onSelectStrategy?: (strat: StrategyType) => void;
  layupPosition?: LatLngLiteral;
  onSetLayupPosition?: (pos: LatLngLiteral) => void;
  activeEditingShot?: 1 | 2;
  onSetActiveEditingShot?: (shot: 1 | 2) => void;
  onNextHole?: () => void;
  nextHoleNumber?: number;
  onReadyStateChange?: (isReady: boolean) => void;
}

export const GolfMap3D: React.FC<GolfMap3DProps> = ({
  hole,
  selectedTee,
  targetPosition,
  onSetTarget,
  onSelectTee,
  wind,
  onUpdateWind,
  onExit3D,
  showHazards = true,
  onToggleHazards,
  onNextHole,
  nextHoleNumber,
  onReadyStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const map3dRef = useRef<any>(null);
  const targetMarkerRef = useRef<any>(null);
  const ballLieMarkerRef = useRef<any>(null);
  const pinMarkerRef = useRef<any>(null);
  const hazardMarkersRef = useRef<any[]>([]);
  const tracerPolylineRef = useRef<any>(null);
  const flyingBallMarkerRef = useRef<any>(null);
  const trajectory3DRef = useRef<{ lat: number; lng: number; altitude: number }[] | null>(null);
  const historyPolylinesRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const flightAnimFrameRef = useRef<number | null>(null);
  const lastStatsUpdateRef = useRef<number>(0);

  const cleanUpFlyingBall = useCallback(() => {
    if (flyingBallMarkerRef.current && map3dRef.current) {
      try {
        map3dRef.current.removeChild(flyingBallMarkerRef.current);
      } catch (e) {
        try {
          flyingBallMarkerRef.current.remove?.();
        } catch (err) {
          // ignore
        }
      }
    }
    flyingBallMarkerRef.current = null;
  }, []);

  // 3D Camera & View Controls
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [activeCameraView, setActiveCameraView] = useState<'tee' | 'flyover' | 'green' | 'birdseye' | 'putt'>('tee');
  const [tiltVal, setTiltVal] = useState<number>(68);
  const [headingVal, setHeadingVal] = useState<number>(() => {
    return Math.round(calculateBearing(selectedTee.position, hole.pinPosition));
  });
  const [isStatsCollapsed, setIsStatsCollapsed] = useState<boolean>(false);
  const [localHazardsVisible, setLocalHazardsVisible] = useState<boolean>(showHazards);

  // Synchronize localHazardsVisible when showHazards prop changes
  useEffect(() => {
    setLocalHazardsVisible(showHazards);
  }, [showHazards]);

  const hazardsVisible = onToggleHazards ? showHazards : localHazardsVisible;
  const toggleHazards = () => {
    if (onToggleHazards) {
      onToggleHazards();
    } else {
      setLocalHazardsVisible((prev) => !prev);
    }
  };

  // 3D Shot Play & Glowing Circle State
  const [ballLie, setBallLie] = useState<LatLngLiteral>(selectedTee.position);
  const [shotNumber, setShotNumber] = useState<number>(1);
  const [currentLie, setCurrentLie] = useState<'tee' | 'fairway' | 'green' | 'bunker' | 'rough' | 'out_of_bounds'>('tee');
  const [isPlanningShot, setIsPlanningShot] = useState<boolean>(false);
  const [powerPercent, setPowerPercent] = useState<number>(100);
  const [shape, setShape] = useState<ShotShape>('straight');
  const [selectedClub, setSelectedClub] = useState<Club>(() =>
    recommendClub(calculateDistanceYards(selectedTee.position, hole.pinPosition))
  );

  const [isHitting, setIsHitting] = useState<boolean>(false);
  const [activeTrajectory, setActiveTrajectory] = useState<LatLngLiteral[] | null>(null);
  const [activeTrajectory3D, setActiveTrajectory3D] = useState<{ lat: number; lng: number; altitude: number }[] | null>(null);
  const [currentFlightResult, setCurrentFlightResult] = useState<PracticeShotResult | null>(null);
  const [flightCameraMode, setFlightCameraMode] = useState<'chase' | 'tee' | 'green'>('chase');
  const [flightStats, setFlightStats] = useState<{
    distanceSoFar: number;
    peakAltitude: number;
    progress: number;
    ballSpeedMph: number;
  } | null>(null);
  const [shotResult, setShotResult] = useState<PracticeShotResult | null>(null);
  const [shotHistory, setShotHistory] = useState<PracticeShotResult[]>([]);
  const [isHoleCompleted, setIsHoleCompleted] = useState<boolean>(false);
  const [map3dError, setMap3dError] = useState<string | null>(null);

  const maps3dLib = useMapsLibrary('maps3d');
  const holeBearing = Math.round(calculateBearing(selectedTee.position, hole.pinPosition));

  // Reset ball lie and shot state when hole or tee changes
  useEffect(() => {
    setBallLie(selectedTee.position);
    setShotNumber(1);
    setCurrentLie('tee');
    setIsPlanningShot(false);
    setIsHitting(false);
    setIsHoleCompleted(false);
    setActiveTrajectory(null);
    setActiveTrajectory3D(null);
    setCurrentFlightResult(null);
    setShotResult(null);
    setFlightStats(null);
    setShotHistory([]);
    setSelectedClub(recommendClub(calculateDistanceYards(selectedTee.position, hole.pinPosition)));
    onSetTarget(hole.pinPosition);

    // Clear previous polylines and markers from 3D map
    cleanUpFlyingBall();
    if (map3dRef.current) {
      if (tracerPolylineRef.current) {
        try {
          map3dRef.current.removeChild(tracerPolylineRef.current);
        } catch (e) {
          // ignore
        }
        tracerPolylineRef.current = null;
      }
      historyPolylinesRef.current.forEach((poly) => {
        try {
          map3dRef.current.removeChild(poly);
        } catch (e) {
          // ignore
        }
      });
      historyPolylinesRef.current = [];
    }
  }, [hole.id, selectedTee.id]);

  // Initialize the Map3DElement
  useEffect(() => {
    let isMounted = true;

    async function init3DMap() {
      try {
        let maps3d = maps3dLib;
        if (!maps3d) {
          const winGoogle = typeof window !== 'undefined' ? (window as any).google : null;
          if (winGoogle?.maps?.importLibrary) {
            maps3d = await winGoogle.maps.importLibrary('maps3d');
          } else {
            // maps3dLib hook will trigger re-evaluation once library finishes loading
            return;
          }
        }
        if (!isMounted || !containerRef.current) return;
        setMap3dError(null);

        containerRef.current.innerHTML = '';

        // Create Map3D Element
        const map3dElement = new (maps3d as any).Map3DElement({
          center: {
            lat: selectedTee.position.lat,
            lng: selectedTee.position.lng,
            altitude: 18,
          },
          range: 220,
          tilt: 68,
          heading: holeBearing,
          mode: 'SATELLITE',
          defaultUIHidden: true,
        });

        map3dElement.style.width = '100%';
        map3dElement.style.height = '100%';
        map3dElement.style.display = 'block';

        containerRef.current.appendChild(map3dElement);
        map3dRef.current = map3dElement;

        // Click listener on 3D map to set target landing spot
        map3dElement.addEventListener('gmp-click', (e: any) => {
          let clickedLat: number | null = null;
          let clickedLng: number | null = null;

          if (e.position && typeof e.position.lat === 'number') {
            clickedLat = e.position.lat;
            clickedLng = e.position.lng;
          } else if (e.latLng) {
            clickedLat = typeof e.latLng.lat === 'function' ? e.latLng.lat() : e.latLng.lat;
            clickedLng = typeof e.latLng.lng === 'function' ? e.latLng.lng() : e.latLng.lng;
          }

          if (typeof clickedLat === 'number' && !isNaN(clickedLat) && typeof clickedLng === 'number' && !isNaN(clickedLng)) {
            onSetTarget({ lat: clickedLat, lng: clickedLng });
          }
        });

        // Track camera changes
        map3dElement.addEventListener('gmp-camerachange', () => {
          if (map3dElement.tilt !== undefined) {
            setTiltVal(Math.round(map3dElement.tilt));
          }
          if (map3dElement.heading !== undefined) {
            setHeadingVal(Math.round(map3dElement.heading));
          }
        });

        // Listen for native animation end
        map3dElement.addEventListener('gmp-animationend', () => {
          setIsRotating(false);
        });

        // Listen for steady state: all 3D mesh & photorealistic tiles finished loading
        const handleSteadyChange = (e: any) => {
          if (e?.isSteady !== false) {
            onReadyStateChange?.(true);
          }
        };
        map3dElement.addEventListener('gmp-steadystate', handleSteadyChange);

        // Fallback assurance timer in case gmp-steadystate is delayed or silent
        setTimeout(() => {
          if (isMounted) {
            onReadyStateChange?.(true);
          }
        }, 850);
      } catch (err: any) {
        console.error('Failed to initialize 3D Map Element:', err);
        if (isMounted) {
          setMap3dError(
            err?.message ||
              '3D Photorealistic Map Element could not be initialized. Your environment or browser may lack WebGL2 hardware acceleration.'
          );
        }
      }
    }

    init3DMap();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (flightAnimFrameRef.current) {
        cancelAnimationFrame(flightAnimFrameRef.current);
        flightAnimFrameRef.current = null;
      }
      if (targetMarkerRef.current && map3dRef.current) {
        try {
          map3dRef.current.removeChild(targetMarkerRef.current);
        } catch (e) {
          // ignore
        }
        targetMarkerRef.current = null;
      }
      if (ballLieMarkerRef.current && map3dRef.current) {
        try {
          map3dRef.current.removeChild(ballLieMarkerRef.current);
        } catch (e) {
          // ignore
        }
        ballLieMarkerRef.current = null;
      }
      if (pinMarkerRef.current && map3dRef.current) {
        try {
          map3dRef.current.removeChild(pinMarkerRef.current);
        } catch (e) {
          // ignore
        }
        pinMarkerRef.current = null;
      }
      if (hazardMarkersRef.current.length > 0 && map3dRef.current) {
        hazardMarkersRef.current.forEach((m) => {
          try {
            map3dRef.current?.removeChild(m);
          } catch (e) {
            // ignore
          }
        });
        hazardMarkersRef.current = [];
      }
      if (tracerPolylineRef.current && map3dRef.current) {
        try {
          map3dRef.current.removeChild(tracerPolylineRef.current);
        } catch (e) {
          // ignore
        }
        tracerPolylineRef.current = null;
      }
      if (map3dRef.current) {
        try {
          map3dRef.current.stopCameraAnimation?.();
        } catch (e) {
          // ignore
        }
        map3dRef.current = null;
      }
    };
  }, [maps3dLib, hole.id, selectedTee.id]);

  // Dynamically place & update 3D target landing marker
  useEffect(() => {
    if (!map3dRef.current) return;
    const maps3d = maps3dLib || (window.google?.maps as any)?.maps3d;
    if (!maps3d || !maps3d.Marker3DElement) return;

    try {
      // If target is at or near the pin (within green perimeter ~5 yards), do not duplicate marker on the green
      const isTargetAtPin =
        calculateDistanceYards(targetPosition, hole.pinPosition) < 5;

      if (isTargetAtPin) {
        if (targetMarkerRef.current) {
          try {
            map3dRef.current.removeChild(targetMarkerRef.current);
          } catch (e) {
            // ignore
          }
          targetMarkerRef.current = null;
        }
        return;
      }

      if (!targetMarkerRef.current) {
        const marker = new maps3d.Marker3DElement({
          position: {
            lat: targetPosition.lat,
            lng: targetPosition.lng,
          },
          label: '🎯 Target Landing Spot',
          altitudeMode: 'CLAMP_TO_GROUND',
          extruded: false,
        });
        map3dRef.current.appendChild(marker);
        targetMarkerRef.current = marker;
      } else {
        targetMarkerRef.current.position = {
          lat: targetPosition.lat,
          lng: targetPosition.lng,
        };
        targetMarkerRef.current.altitudeMode = 'CLAMP_TO_GROUND';
      }
    } catch (e) {
      console.warn('Error updating 3D target marker:', e);
    }
  }, [targetPosition, maps3dLib, hole.pinPosition]);

  // Dynamically place & update 3D Ball Lie Marker (the 3D glowing anchor)
  useEffect(() => {
    if (!map3dRef.current || isHitting) return;
    const maps3d = maps3dLib || (window.google?.maps as any)?.maps3d;
    if (!maps3d) return;

    try {
      if (ballLieMarkerRef.current) {
        try {
          map3dRef.current.removeChild(ballLieMarkerRef.current);
        } catch (e) {
          // ignore
        }
        ballLieMarkerRef.current = null;
      }

      const markerLabel = shotNumber === 1 ? '⛳ Tee Box (Click to Plan)' : `⛳ Shot ${shotNumber} Lie`;

      if (maps3d.Marker3DInteractiveElement) {
        const marker = new maps3d.Marker3DInteractiveElement({
          position: {
            lat: ballLie.lat,
            lng: ballLie.lng,
          },
          altitudeMode: 'CLAMP_TO_GROUND',
          label: markerLabel,
        });

        marker.addEventListener('gmp-click', () => {
          setIsPlanningShot(true);
        });

        map3dRef.current.appendChild(marker);
        ballLieMarkerRef.current = marker;
      } else if (maps3d.Marker3DElement) {
        const marker = new maps3d.Marker3DElement({
          position: {
            lat: ballLie.lat,
            lng: ballLie.lng,
          },
          altitudeMode: 'CLAMP_TO_GROUND',
          label: markerLabel,
        });
        map3dRef.current.appendChild(marker);
        ballLieMarkerRef.current = marker;
      }
    } catch (e) {
      console.warn('Error updating 3D ball marker:', e);
    }
  }, [ballLie, shotNumber, maps3dLib, isHitting]);

  // Dynamically place & update 3D Pin Flag and Hazard Markers
  useEffect(() => {
    if (!map3dRef.current) return;
    const maps3d = maps3dLib || (window.google?.maps as any)?.maps3d;
    if (!maps3d || !maps3d.Marker3DElement) return;

    try {
      // 1. 3D Pin Flag Marker
      const pinLabel = `🚩 Hole #${hole.holeNumber} Pin (${hole.holeName || 'Cup'})`;
      if (!pinMarkerRef.current) {
        const pinMarker = new maps3d.Marker3DElement({
          position: {
            lat: hole.pinPosition.lat,
            lng: hole.pinPosition.lng,
          },
          label: pinLabel,
          altitudeMode: 'CLAMP_TO_GROUND',
          extruded: false,
        });
        map3dRef.current.appendChild(pinMarker);
        pinMarkerRef.current = pinMarker;
      } else {
        pinMarkerRef.current.position = {
          lat: hole.pinPosition.lat,
          lng: hole.pinPosition.lng,
        };
        pinMarkerRef.current.label = pinLabel;
        pinMarkerRef.current.altitudeMode = 'CLAMP_TO_GROUND';
      }

      // 2. Clear old hazard markers
      hazardMarkersRef.current.forEach((m) => {
        try {
          map3dRef.current?.removeChild(m);
        } catch (e) {
          // ignore
        }
      });
      hazardMarkersRef.current = [];

      // 3. Render 3D Hazard & Landmark markers if hazardsVisible is enabled
      // Note: All markers located around the green complex (within 100 yards of the pin) are excluded
      // so the photorealistic 3D green surface and surroundings remain clean, open, and unobstructed.
      if (hazardsVisible && hole.hazards && hole.hazards.length > 0) {
        const hazardsAwayFromGreen = hole.hazards.filter((h) => {
          const distToPin = calculateDistanceYards(h.position, hole.pinPosition);
          return distToPin >= 100;
        });

        hazardsAwayFromGreen.forEach((h) => {
          let icon = '⚠️';
          if (h.type === 'bunker') icon = '🏖️';
          else if (h.type === 'water' || h.type === 'ocean') icon = '🌊';
          else if (h.type === 'building' || h.id.includes('bridge')) icon = '🌉';
          else if (h.id.includes('azalea')) icon = '🌸';
          else if (h.type === 'rough') icon = '🌲';

          const hazardMarker = new maps3d.Marker3DElement({
            position: {
              lat: h.position.lat,
              lng: h.position.lng,
            },
            label: `${icon} ${h.name}`,
            altitudeMode: 'CLAMP_TO_GROUND',
            extruded: false,
          });
          map3dRef.current.appendChild(hazardMarker);
          hazardMarkersRef.current.push(hazardMarker);
        });
      }
    } catch (err) {
      console.warn('Error creating 3D pin/hazard markers:', err);
    }
  }, [hole.id, hole.pinPosition, hole.hazards, hole.holeNumber, hole.holeName, hazardsVisible, maps3dLib]);

  // Stop all active rotations (both requestAnimationFrame loop and native SDK animation)
  const stopAllOrbitAnimations = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (map3dRef.current) {
      try {
        map3dRef.current.stopCameraAnimation?.();
      } catch (e) {
        // ignore
      }
    }
    setIsRotating(false);
  };

  // Continuous smooth fallback 360 Orbit Loop using heading updates
  const startFallbackOrbit = (
    centerTarget: { lat: number; lng: number; altitude: number },
    range: number,
    tilt: number
  ) => {
    if (!map3dRef.current) return;

    map3dRef.current.center = centerTarget;
    map3dRef.current.range = range;
    map3dRef.current.tilt = tilt;

    let lastTime = performance.now();
    const rotateSpeedDegPerSec = 16;

    const frame = (now: number) => {
      if (!map3dRef.current) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const currentHeading = map3dRef.current.heading || 0;
      const nextHeading = (currentHeading + rotateSpeedDegPerSec * dt) % 360;
      map3dRef.current.heading = nextHeading;
      setHeadingVal(Math.round(nextHeading));

      animationFrameRef.current = requestAnimationFrame(frame);
    };

    animationFrameRef.current = requestAnimationFrame(frame);
  };

  // Elevated Putting Camera: Glides smoothly into a clean broadcast perspective behind the ball looking toward the cup
  const flyToPuttingCamera = useCallback((ballPos: LatLngLiteral, pinPos: LatLngLiteral) => {
    setActiveCameraView('putt');
    stopAllOrbitAnimations();
    if (!map3dRef.current) return;

    try {
      const bearing = calculateBearing(ballPos, pinPos);
      const distYards = calculateDistanceYards(ballPos, pinPos);
      // Elevated distance behind ball to prevent near clipping plane intersecting ground mesh
      const range = Math.max(32, Math.min(65, distYards * 1.6 + 18));
      const targetHeading = Math.round(bearing);
      const targetTilt = 52; // Elevated perspective looking down at ball and hole without floor clipping

      // Frame slightly ahead of ball towards the hole so both ball and cup are nicely framed
      const centerLat = ballPos.lat * 0.75 + pinPos.lat * 0.25;
      const centerLng = ballPos.lng * 0.75 + pinPos.lng * 0.25;

      map3dRef.current.flyCameraTo({
        endCamera: {
          center: {
            lat: centerLat,
            lng: centerLng,
            altitude: 14,
          },
          range: range,
          tilt: targetTilt,
          heading: targetHeading,
        },
        durationMillis: 1800,
      });

      setHeadingVal(targetHeading);
      setTiltVal(targetTilt);
    } catch (e) {
      console.warn('flyToPuttingCamera failed:', e);
    }
  }, []);

  // Approach / Next Shot Camera: Glides camera to an elevated perspective behind the ball aimed at the pin
  const flyToApproachCamera = useCallback((ballPos: LatLngLiteral, pinPos: LatLngLiteral) => {
    stopAllOrbitAnimations();
    if (!map3dRef.current) return;

    try {
      const bearing = calculateBearing(ballPos, pinPos);
      const distYards = calculateDistanceYards(ballPos, pinPos);
      const targetHeading = Math.round(bearing);
      const targetTilt = 56; // Clean, elevated approach angle with zero ground clipping
      const range = Math.max(55, Math.min(150, distYards * 0.85 + 35));

      map3dRef.current.flyCameraTo({
        endCamera: {
          center: {
            lat: ballPos.lat,
            lng: ballPos.lng,
            altitude: 16,
          },
          range: range,
          tilt: targetTilt,
          heading: targetHeading,
        },
        durationMillis: 1800,
      });

      setHeadingVal(targetHeading);
      setTiltVal(targetTilt);
    } catch (e) {
      console.warn('flyToApproachCamera failed:', e);
    }
  }, []);

  // Camera preset navigation
  const setCameraView = (view: 'tee' | 'flyover' | 'green' | 'birdseye' | 'putt') => {
    setActiveCameraView(view);
    stopAllOrbitAnimations();
    if (!map3dRef.current) return;

    try {
      if (view === 'putt') {
        flyToPuttingCamera(ballLie, hole.pinPosition);
      } else if (view === 'tee') {
        map3dRef.current.flyCameraTo({
          endCamera: {
            center: {
              lat: selectedTee.position.lat,
              lng: selectedTee.position.lng,
              altitude: 18,
            },
            range: 190,
            tilt: 66,
            heading: holeBearing,
          },
          durationMillis: 1800,
        });
      } else if (view === 'green') {
        map3dRef.current.flyCameraTo({
          endCamera: {
            center: {
              lat: hole.pinPosition.lat,
              lng: hole.pinPosition.lng,
              altitude: 12,
            },
            range: 95,
            tilt: 58,
            heading: (holeBearing + 140) % 360,
          },
          durationMillis: 1800,
        });
      } else if (view === 'birdseye') {
        const midLat = (selectedTee.position.lat + hole.pinPosition.lat) / 2;
        const midLng = (selectedTee.position.lng + hole.pinPosition.lng) / 2;
        map3dRef.current.flyCameraTo({
          endCamera: {
            center: {
              lat: midLat,
              lng: midLng,
              altitude: 40,
            },
            range: 360,
            tilt: 35,
            heading: holeBearing,
          },
          durationMillis: 1800,
        });
      }
    } catch (e) {
      console.warn('flyCameraTo failed:', e);
    }
  };

  // 360 Orbit Handler
  const handleToggleRotation = () => {
    if (!map3dRef.current) return;

    if (isRotating) {
      stopAllOrbitAnimations();
    } else {
      setIsRotating(true);
      setActiveCameraView('flyover');

      const centerTarget = {
        lat: hole.pinPosition.lat,
        lng: hole.pinPosition.lng,
        altitude: 10,
      };
      const orbitRange = 160;
      const orbitTilt = 65;

      let nativeStarted = false;

      if (typeof map3dRef.current.flyCameraAround === 'function') {
        try {
          map3dRef.current.flyCameraAround({
            camera: {
              center: centerTarget,
              range: orbitRange,
              tilt: orbitTilt,
            },
            durationMillis: 24000,
            rounds: 2,
            repeatCount: 2,
          });
          nativeStarted = true;
        } catch (err1) {
          try {
            map3dRef.current.flyCameraAround({
              center: centerTarget,
              range: orbitRange,
              tilt: orbitTilt,
              durationMillis: 24000,
              rounds: 2,
            });
            nativeStarted = true;
          } catch (err2) {
            console.warn('flyCameraAround fallback:', err2);
          }
        }
      }

      if (!nativeStarted) {
        startFallbackOrbit(centerTarget, orbitRange, orbitTilt);
      }
    }
  };

  const adjustTilt = (delta: number) => {
    stopAllOrbitAnimations();
    if (!map3dRef.current) return;
    const newTilt = Math.min(Math.max((map3dRef.current.tilt || 60) + delta, 15), 85);
    map3dRef.current.tilt = newTilt;
    setTiltVal(Math.round(newTilt));
  };

  const adjustHeading = (delta: number) => {
    stopAllOrbitAnimations();
    if (!map3dRef.current) return;
    const newHeading = ((map3dRef.current.heading || 0) + delta + 360) % 360;
    map3dRef.current.heading = newHeading;
    setHeadingVal(Math.round(newHeading));
  };

  // Keyboard WASD & Arrow Camera Navigation for 3D View
  useEffect(() => {
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

    const update3DMovement = (time: number) => {
      if (!map3dRef.current) return;
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;

      // Run movement step every ~25ms
      if (delta >= 25) {
        lastTime = time;

        const isShift = pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight');
        const currentCenter = map3dRef.current.center;
        const currentHeading = map3dRef.current.heading ?? holeBearing;

        // 1. WASD Translation (Forward/Backward/Strafe)
        let moveX = 0; // -1 left, +1 right
        let moveY = 0; // -1 backward, +1 forward

        if (pressedKeys.has('KeyW')) moveY += 1;
        if (pressedKeys.has('KeyS')) moveY -= 1;
        if (pressedKeys.has('KeyA')) moveX -= 1;
        if (pressedKeys.has('KeyD')) moveX += 1;

        if (currentCenter && (moveX !== 0 || moveY !== 0)) {
          const angleRad = Math.atan2(moveX, moveY);
          const angleDeg = (angleRad * 180) / Math.PI;
          const moveBearing = ((currentHeading + angleDeg) % 360 + 360) % 360;

          // Standard speed: ~2.5 yards/25ms, Shift speed: ~6.0 yards/25ms
          const stepYards = isShift ? 6.0 : 2.5;

          const centerLat = typeof currentCenter.lat === 'function' ? currentCenter.lat() : currentCenter.lat;
          const centerLng = typeof currentCenter.lng === 'function' ? currentCenter.lng() : currentCenter.lng;
          const centerAlt = typeof currentCenter.altitude === 'number' ? currentCenter.altitude : 18;

          if (typeof centerLat === 'number' && typeof centerLng === 'number') {
            const nextPoint = computeDestinationPoint(
              { lat: centerLat, lng: centerLng },
              stepYards,
              moveBearing
            );
            map3dRef.current.center = {
              lat: nextPoint.lat,
              lng: nextPoint.lng,
              altitude: centerAlt,
            };
          }
        }

        // 2. Heading Rotation (Q / E or ArrowLeft / ArrowRight)
        let rotateDelta = 0;
        if (pressedKeys.has('KeyQ') || pressedKeys.has('ArrowLeft')) rotateDelta -= (isShift ? 2.5 : 1.2);
        if (pressedKeys.has('KeyE') || pressedKeys.has('ArrowRight')) rotateDelta += (isShift ? 2.5 : 1.2);

        if (rotateDelta !== 0) {
          const curHead = map3dRef.current.heading || 0;
          const nextHead = (curHead + rotateDelta + 360) % 360;
          map3dRef.current.heading = nextHead;
          setHeadingVal(Math.round(nextHead));
        }

        // 3. Tilt / Pitch (ArrowUp / ArrowDown or R / F)
        let tiltDelta = 0;
        if (pressedKeys.has('ArrowUp') || pressedKeys.has('KeyR')) tiltDelta += (isShift ? 1.5 : 0.8);
        if (pressedKeys.has('ArrowDown') || pressedKeys.has('KeyF')) tiltDelta -= (isShift ? 1.5 : 0.8);

        if (tiltDelta !== 0) {
          const curTilt = map3dRef.current.tilt || 68;
          const nextTilt = Math.min(Math.max(curTilt + tiltDelta, 15), 85);
          map3dRef.current.tilt = nextTilt;
          setTiltVal(Math.round(nextTilt));
        }

        // 4. Altitude / Zoom Range (KeyZ / KeyX or PageUp / PageDown)
        let rangeDelta = 0;
        if (pressedKeys.has('KeyZ') || pressedKeys.has('PageUp')) rangeDelta -= (isShift ? 12 : 5);
        if (pressedKeys.has('KeyX') || pressedKeys.has('PageDown')) rangeDelta += (isShift ? 12 : 5);

        if (rangeDelta !== 0) {
          const curRange = map3dRef.current.range || 200;
          const nextRange = Math.min(Math.max(curRange + rangeDelta, 25), 800);
          map3dRef.current.range = nextRange;
        }
      }

      if (pressedKeys.size > 0) {
        animId = requestAnimationFrame(update3DMovement);
      } else {
        animId = null;
        lastTime = 0;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused() || !map3dRef.current) return;

      const code = e.code;
      const key = e.key.toLowerCase();

      const isNavKey =
        code === 'KeyW' ||
        code === 'KeyS' ||
        code === 'KeyA' ||
        code === 'KeyD' ||
        code === 'KeyQ' ||
        code === 'KeyE' ||
        code === 'KeyR' ||
        code === 'KeyF' ||
        code === 'KeyZ' ||
        code === 'KeyX' ||
        key === 'w' ||
        key === 's' ||
        key === 'a' ||
        key === 'd' ||
        key === 'q' ||
        key === 'e' ||
        key === 'r' ||
        key === 'f' ||
        key === 'z' ||
        key === 'x' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'PageUp' ||
        code === 'PageDown' ||
        code === 'ShiftLeft' ||
        code === 'ShiftRight';

      if (!isNavKey) return;

      if (code.startsWith('Arrow') || code.startsWith('Page')) {
        e.preventDefault();
      }

      const normalizedCode =
        key === 'w' ? 'KeyW' :
        key === 's' ? 'KeyS' :
        key === 'a' ? 'KeyA' :
        key === 'd' ? 'KeyD' :
        key === 'q' ? 'KeyQ' :
        key === 'e' ? 'KeyE' :
        key === 'r' ? 'KeyR' :
        key === 'f' ? 'KeyF' :
        key === 'z' ? 'KeyZ' :
        key === 'x' ? 'KeyX' : code;

      stopAllOrbitAnimations();

      if (!pressedKeys.has(normalizedCode)) {
        pressedKeys.add(normalizedCode);
      }

      if (animId === null) {
        lastTime = performance.now();
        animId = requestAnimationFrame(update3DMovement);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();
      const normalizedCode =
        key === 'w' ? 'KeyW' :
        key === 's' ? 'KeyS' :
        key === 'a' ? 'KeyA' :
        key === 'd' ? 'KeyD' :
        key === 'q' ? 'KeyQ' :
        key === 'e' ? 'KeyE' :
        key === 'r' ? 'KeyR' :
        key === 'f' ? 'KeyF' :
        key === 'z' ? 'KeyZ' :
        key === 'x' ? 'KeyX' : code;

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
  }, [holeBearing]);

  const getCamera = useCallback(() => {
    return getCameraStateFromElement(map3dRef.current, ballLie, holeBearing);
  }, [ballLie, holeBearing]);

  // Execute 3D Practice Shot & Launch Flight
  const handleHitBall = () => {
    setIsPlanningShot(false);
    setShotResult(null);

    const isShotOnGreen = isPositionOnGreen(ballLie, hole) || currentLie === 'green' || selectedClub.category === 'putter';
    const isBunker = currentLie === 'bunker';
    const isFairway = currentLie === 'fairway' || currentLie === 'tee';

    // Compute physics, dispersion, and aerodynamic trajectory with current lie rules
    const result = simulatePracticeShot(
      ballLie,
      targetPosition,
      powerPercent,
      shape,
      hole,
      wind,
      shotNumber,
      currentLie
    );

    setActiveTrajectory(result.trajectory);
    setCurrentFlightResult(result);

    // Create altitude profile:
    // - On green: 0 (roll putt clamped to ground)
    // - On fairway: high majestic arching trajectory (apex up to 52m, higher launch angle)
    // - Out of bunker / rough: punchier trajectory (apex up to 32m)
    const apexHeightMeters = isShotOnGreen
      ? 0
      : isFairway
      ? Math.min(52, Math.max(16, result.actualCarryYards * 0.42))
      : Math.min(32, Math.max(8, result.actualCarryYards * 0.28));

    const validTrajectory = (result.trajectory || []).filter(
      (pt): pt is LatLngLiteral => !!pt && typeof pt.lat === 'number' && !isNaN(pt.lat) && typeof pt.lng === 'number' && !isNaN(pt.lng)
    );

    const path3D = validTrajectory.map((pt, idx) => {
      const t = validTrajectory.length > 1 ? idx / (validTrajectory.length - 1) : 0;
      const alt = isShotOnGreen ? 0 : Math.sin(t * Math.PI) * apexHeightMeters;
      return {
        lat: pt.lat,
        lng: pt.lng,
        altitude: isShotOnGreen ? 0 : Math.max(1, Math.round(alt)),
      };
    });

    setActiveTrajectory3D(path3D);
    trajectory3DRef.current = path3D;
    setIsHitting(true);

    // Play appropriate sound: clean putter click for green shots, muffled thump for sand, thwack for airborne swings
    playGolfSound(isShotOnGreen ? 'putt' : isBunker ? 'sand' : 'strike');

    // Keep camera STATIC - do NOT follow along with the ball!
    stopAllOrbitAnimations();

    // Clean up any existing 3D polyline and in-flight ball marker so only the current shot is drawn
    cleanUpFlyingBall();
    const maps3d = maps3dLib || (window.google?.maps as any)?.maps3d;
    if (tracerPolylineRef.current && map3dRef.current) {
      try {
        map3dRef.current.removeChild(tracerPolylineRef.current);
      } catch (e) {
        try {
          tracerPolylineRef.current.remove?.();
        } catch (err) {
          // ignore
        }
      }
      tracerPolylineRef.current = null;
    }

    // Immediately create native 3D Polyline anchored in Google Maps 3D space
    // For shots from the green, CLAMP_TO_GROUND ensures the straight line adheres directly to the 3D green terrain surface
    if (maps3d?.Polyline3DElement && map3dRef.current && path3D.length >= 2) {
      try {
        const initialSegment = path3D.slice(0, 2);
        const poly = new maps3d.Polyline3DElement({
          path: initialSegment,
          coordinates: initialSegment,
          strokeColor: '#A3E635',
          outerColor: '#FFFFFF',
          strokeWidth: isShotOnGreen ? 5 : 6,
          outerWidth: 0.25,
          altitudeMode: isShotOnGreen ? 'CLAMP_TO_GROUND' : 'RELATIVE_TO_GROUND',
          drawsOccludedSegments: true,
        });
        if (typeof map3dRef.current.append === 'function') {
          map3dRef.current.append(poly);
        } else {
          map3dRef.current.appendChild(poly);
        }
        tracerPolylineRef.current = poly;
      } catch (e) {
        console.warn('Initial Polyline3D creation failed:', e);
      }
    }

    // Create native 3D Golf Ball element inside Google Maps 3D space
    // It shares the EXACT same altitudeMode and coordinates as the green trace tip
    if (maps3d?.Marker3DElement && map3dRef.current && path3D.length >= 1 && path3D[0] && typeof path3D[0].lat === 'number') {
      try {
        const startPoint = path3D[0];
        const ballMarker = new maps3d.Marker3DElement({
          position: {
            lat: startPoint.lat,
            lng: startPoint.lng,
            altitude: startPoint.altitude,
          },
          altitudeMode: isShotOnGreen ? 'CLAMP_TO_GROUND' : 'RELATIVE_TO_GROUND',
          drawsWhenOccluded: true,
          sizePreserved: true,
          extruded: false,
          label: '⚪',
        });

        try {
          const template = document.createElement('template');
          template.innerHTML = `
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="13" cy="13" r="12" fill="#A3E635" fill-opacity="0.35"/>
              <circle cx="13" cy="13" r="8" fill="url(#ballGlow)" stroke="#1B291A" stroke-width="1.5"/>
              <circle cx="10.5" cy="10.5" r="2.2" fill="#FFFFFF" fill-opacity="0.9"/>
              <defs>
                <radialGradient id="ballGlow" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stop-color="#FFFFFF"/>
                  <stop offset="55%" stop-color="#F8FAFC"/>
                  <stop offset="100%" stop-color="#94A3B8"/>
                </radialGradient>
              </defs>
            </svg>
          `;
          ballMarker.appendChild(template);
        } catch (err) {
          // fallback to standard label
        }

        if (typeof map3dRef.current.append === 'function') {
          map3dRef.current.append(ballMarker);
        } else {
          map3dRef.current.appendChild(ballMarker);
        }
        flyingBallMarkerRef.current = ballMarker;
      } catch (e) {
        console.warn('Initial flying ball 3D marker creation failed:', e);
      }
    }

    // Ensure the target reticle marker is clamped to ground
    if (targetMarkerRef.current) {
      try {
        targetMarkerRef.current.position = {
          lat: result.landingPos.lat,
          lng: result.landingPos.lng,
        };
        targetMarkerRef.current.altitudeMode = 'CLAMP_TO_GROUND';
        targetMarkerRef.current.label = '🎯 Landing Target Reticle';
      } catch (e) {
        // ignore
      }
    }

    // Remove stationary ball lie pin while ball is airborne
    if (ballLieMarkerRef.current && map3dRef.current) {
      try {
        map3dRef.current.removeChild(ballLieMarkerRef.current);
      } catch (e) {
        // ignore
      }
      ballLieMarkerRef.current = null;
    }
  };

  // Dynamically grow the native 3D polyline and advance the flying ball in 100% synchronization
  const handleProgressUpdate = useCallback(
    (stats: {
      distanceSoFar: number;
      peakAltitude: number;
      progress: number;
      ballSpeedMph: number;
    }) => {
      const now = performance.now();
      if (now - lastStatsUpdateRef.current > 40 || stats.progress >= 1) {
        lastStatsUpdateRef.current = now;
        setFlightStats(stats);
      }

      const trajectory = trajectory3DRef.current;
      const rawProgress = typeof stats?.progress === 'number' && !isNaN(stats.progress) ? stats.progress : 0;
      const progress = Math.max(0, Math.min(1, rawProgress));

      if (trajectory && trajectory.length >= 2) {
        const total = trajectory.length;
        const exactIndex = Math.max(0, Math.min(total - 1, progress * (total - 1)));
        const floorIdx = Math.max(0, Math.min(total - 2, Math.floor(exactIndex)));
        const ceilIdx = Math.max(1, Math.min(total - 1, floorIdx + 1));
        const frac = exactIndex - floorIdx;
        const p1 = trajectory[floorIdx];
        const p2 = trajectory[ceilIdx];

        if (p1 && p2 && typeof p1.lat === 'number' && typeof p2.lat === 'number') {
          const currentHead = {
            lat: p1.lat + (p2.lat - p1.lat) * frac,
            lng: p1.lng + (p2.lng - p1.lng) * frac,
            altitude: (p1.altitude || 0) + ((p2.altitude || 0) - (p1.altitude || 0)) * frac,
          };

          const currentSegment = [...trajectory.slice(0, floorIdx + 1), currentHead];

          if (tracerPolylineRef.current) {
            try {
              tracerPolylineRef.current.path = currentSegment;
              tracerPolylineRef.current.coordinates = currentSegment;
            } catch (e) {
              // ignore
            }
          }

          // Align the flying 3D ball marker with 100% precision to the exact leading tip of the green line
          if (flyingBallMarkerRef.current) {
            try {
              flyingBallMarkerRef.current.position = currentHead;
            } catch (e) {
              // ignore
            }
          }
        }
      }
    },
    []
  );

  // Callback when ball finishes rolling or touches down on turf
  const handleFlightFinished = () => {
    const isShotOnGreen = isPositionOnGreen(ballLie, hole) || selectedClub.category === 'putter';
    if (!currentFlightResult || !currentFlightResult.landingPos || typeof currentFlightResult.landingPos.lat !== 'number') {
      setIsHitting(false);
      return;
    }

    const isHoled =
      currentFlightResult.lie === 'holed' ||
      currentFlightResult.distanceToPinFeet <= 1 ||
      Boolean(currentFlightResult.feedbackTitle?.includes('IN THE CUP'));

    if (isHoled) {
      setIsHoleCompleted(true);
      setIsPlanningShot(false);
      playGolfSound('cup');
    } else if (!isShotOnGreen) {
      playGolfSound('land');
    }

    setIsHitting(false);
    setShotResult(currentFlightResult);

    const maps3d = maps3dLib || (window.google?.maps as any)?.maps3d;
    const trajectory = trajectory3DRef.current || activeTrajectory3D;

    // Ensure native 3D Polyline tracer has the complete completed flight arc or straight ground-clamped line
    if (tracerPolylineRef.current && trajectory) {
      try {
        tracerPolylineRef.current.path = trajectory;
        tracerPolylineRef.current.coordinates = trajectory;
      } catch (e) {
        // ignore
      }
    } else if (maps3d && maps3d.Polyline3DElement && map3dRef.current && trajectory) {
      try {
        const poly = new maps3d.Polyline3DElement({
          path: trajectory,
          coordinates: trajectory,
          strokeColor: '#A3E635',
          outerColor: '#FFFFFF',
          strokeWidth: isShotOnGreen ? 5 : 6,
          outerWidth: 0.25,
          altitudeMode: isShotOnGreen ? 'CLAMP_TO_GROUND' : 'RELATIVE_TO_GROUND',
          drawsOccludedSegments: true,
        });
        if (typeof map3dRef.current.append === 'function') {
          map3dRef.current.append(poly);
        } else {
          map3dRef.current.appendChild(poly);
        }
        tracerPolylineRef.current = poly;
      } catch (e) {
        console.warn('Polyline3D creation failed:', e);
      }
    }

    // Remove in-flight ball marker when landing completes
    cleanUpFlyingBall();

    // Place ball lie marker at landed spot clamped to ground
    if (maps3d && map3dRef.current) {
      const isOB = currentFlightResult.lie === 'out_of_bounds';
      const isBunkerLanded = currentFlightResult.lie === 'bunker';
      const isFairwayLanded = currentFlightResult.lie === 'fairway';
      const isGreenLanded = currentFlightResult.lie === 'green' || isShotOnGreen;

      const landedLabel = isHoled
        ? `🏆 In the Cup! (Hole Completed in ${shotNumber} ${shotNumber === 1 ? 'stroke' : 'strokes'})`
        : isOB
        ? `⚠️ Out of Bounds (+1 Penalty Stroke • Retake Required)`
        : isBunkerLanded
        ? `🏖️ Sand Trap Lie (${Math.round(currentFlightResult.distanceToPinYards)}y • 30% Power Penalty)`
        : isGreenLanded
        ? `🟢 Putting Green (${Math.round(currentFlightResult.distanceToPinYards * 3)} ft • Roll Putt)`
        : isFairwayLanded
        ? `⛳ On Fairway (${Math.round(currentFlightResult.distanceToPinYards)}y to cup)`
        : `⚪ Ball Landed (${Math.round(currentFlightResult.distanceToPinYards)}y to cup)`;
      try {
        if (maps3d.Marker3DInteractiveElement) {
          const marker = new maps3d.Marker3DInteractiveElement({
            position: {
              lat: currentFlightResult.landingPos.lat,
              lng: currentFlightResult.landingPos.lng,
            },
            altitudeMode: 'CLAMP_TO_GROUND',
            label: landedLabel,
          });
          if (!isHoled && !isOB) {
            marker.addEventListener('gmp-click', () => {
              setIsPlanningShot(true);
            });
          }
          map3dRef.current.appendChild(marker);
          ballLieMarkerRef.current = marker;
        } else if (maps3d.Marker3DElement) {
          const marker = new maps3d.Marker3DElement({
            position: {
              lat: currentFlightResult.landingPos.lat,
              lng: currentFlightResult.landingPos.lng,
            },
            altitudeMode: 'CLAMP_TO_GROUND',
            label: landedLabel,
          });
          map3dRef.current.appendChild(marker);
          ballLieMarkerRef.current = marker;
        }
      } catch (e) {
        // ignore
      }
    }
  };

  // Retake / Try Again: reset ball back to current lie, clear tracer, and re-open Shot Planner
  const handleRetakeShot = () => {
    setIsHitting(false);
    setActiveTrajectory3D(null);
    setFlightStats(null);
    setShotResult(null);
    setIsHoleCompleted(false);

    // Remove the current tracer polyline and in-flight ball from 3D map
    cleanUpFlyingBall();
    if (tracerPolylineRef.current && map3dRef.current) {
      try {
        map3dRef.current.removeChild(tracerPolylineRef.current);
      } catch (e) {
        // ignore
      }
      tracerPolylineRef.current = null;
    }

    // Reset ball marker back to current lie clamped to ground
    const maps3d = maps3dLib || (window.google?.maps as any)?.maps3d;
    if (maps3d && map3dRef.current) {
      const markerLabel =
        shotNumber === 1 ? '⛳ Tee Box (Click to Plan)' : `⛳ Shot ${shotNumber} Lie`;
      try {
        if (ballLieMarkerRef.current) {
          ballLieMarkerRef.current.position = {
            lat: ballLie.lat,
            lng: ballLie.lng,
          };
          ballLieMarkerRef.current.altitudeMode = 'CLAMP_TO_GROUND';
          ballLieMarkerRef.current.label = markerLabel;
        } else if (maps3d.Marker3DInteractiveElement) {
          const marker = new maps3d.Marker3DInteractiveElement({
            position: {
              lat: ballLie.lat,
              lng: ballLie.lng,
            },
            altitudeMode: 'CLAMP_TO_GROUND',
            label: markerLabel,
          });
          marker.addEventListener('gmp-click', () => {
            setIsPlanningShot(true);
          });
          map3dRef.current.appendChild(marker);
          ballLieMarkerRef.current = marker;
        }
      } catch (e) {
        // ignore
      }
    }

    // Immediately open Shot Planner so user can adjust club, power, or shape and try again
    setIsPlanningShot(true);
  };

  // Forced Retake on Out of Bounds (+1 stroke penalty assessed)
  const handleRetakeOBShot = () => {
    setIsHitting(false);
    setActiveTrajectory3D(null);
    setFlightStats(null);
    setShotResult(null);
    setIsHoleCompleted(false);

    // 1-stroke penalty applied for Out of Bounds: next stroke is shotNumber + 1
    const penaltyStroke = shotNumber + 1;
    setShotNumber(penaltyStroke);

    // Remove the current tracer polyline and in-flight ball from 3D map
    cleanUpFlyingBall();
    if (tracerPolylineRef.current && map3dRef.current) {
      try {
        map3dRef.current.removeChild(tracerPolylineRef.current);
      } catch (e) {
        // ignore
      }
      tracerPolylineRef.current = null;
    }

    // Reset ball marker back to current lie clamped to ground with OB penalty label
    const maps3d = maps3dLib || (window.google?.maps as any)?.maps3d;
    if (maps3d && map3dRef.current) {
      const markerLabel = `⛳ Shot ${penaltyStroke} Lie (After Out of Bounds Penalty)`;
      try {
        if (ballLieMarkerRef.current) {
          ballLieMarkerRef.current.position = {
            lat: ballLie.lat,
            lng: ballLie.lng,
          };
          ballLieMarkerRef.current.altitudeMode = 'CLAMP_TO_GROUND';
          ballLieMarkerRef.current.label = markerLabel;
        } else if (maps3d.Marker3DInteractiveElement) {
          const marker = new maps3d.Marker3DInteractiveElement({
            position: {
              lat: ballLie.lat,
              lng: ballLie.lng,
            },
            altitudeMode: 'CLAMP_TO_GROUND',
            label: markerLabel,
          });
          marker.addEventListener('gmp-click', () => {
            setIsPlanningShot(true);
          });
          map3dRef.current.appendChild(marker);
          ballLieMarkerRef.current = marker;
        }
      } catch (e) {
        // ignore
      }
    }

    // Immediately re-open Shot Planner for the forced retake
    setIsPlanningShot(true);
  };

  // Advance to Next Shot (The "Repeat" loop)
  const handlePlayNextShot = () => {
    if (!shotResult) return;
    if (
      isHoleCompleted ||
      shotResult.lie === 'holed' ||
      shotResult.lie === 'out_of_bounds' ||
      shotResult.distanceToPinFeet <= 1
    ) {
      // Hole is completed or out of bounds requires retake
      return;
    }

    // Archive current shot into history
    setShotHistory((prev) => [...prev, shotResult]);
    if (tracerPolylineRef.current) {
      historyPolylinesRef.current.push(tracerPolylineRef.current);
      tracerPolylineRef.current = null;
    }

    const newBallLie = shotResult.landingPos;
    const nextShotNum = shotNumber + 1;

    // Update lie state based on landing location
    const newLie =
      shotResult.lie === 'bunker'
        ? 'bunker'
        : shotResult.lie === 'green'
        ? 'green'
        : shotResult.lie === 'fairway'
        ? 'fairway'
        : 'rough';

    setCurrentLie(newLie);
    setBallLie(newBallLie);
    setShotNumber(nextShotNum);
    setActiveTrajectory3D(null);
    setShotResult(null);
    setIsHitting(false);
    setIsPlanningShot(false);

    // Recommend appropriate club based on lie and remaining distance
    const distToPin = calculateDistanceYards(newBallLie, hole.pinPosition);
    if (newLie === 'green') {
      const putter = DEFAULT_CLUBS.find((c) => c.category === 'putter') || recommendClub(distToPin);
      setSelectedClub(putter);
      // Automatically glide 3D camera to elevated putting perspective looking towards the cup
      setTimeout(() => {
        flyToPuttingCamera(newBallLie, hole.pinPosition);
      }, 150);
    } else if (newLie === 'bunker') {
      const sandWedge =
        DEFAULT_CLUBS.find((c) => c.name.toLowerCase().includes('sand wedge')) ||
        DEFAULT_CLUBS.find((c) => c.category === 'wedge') ||
        recommendClub(distToPin);
      setSelectedClub(sandWedge);
      setTimeout(() => {
        flyToApproachCamera(newBallLie, hole.pinPosition);
      }, 150);
    } else {
      setSelectedClub(recommendClub(distToPin));
      setTimeout(() => {
        flyToApproachCamera(newBallLie, hole.pinPosition);
      }, 150);
    }
    setPowerPercent(100);
    onSetTarget(hole.pinPosition);
  };

  // Reset Hole back to Tee Box
  const handleResetHole = () => {
    stopAllOrbitAnimations();

    const teePos = selectedTee.position;
    setBallLie(teePos);
    setShotNumber(1);
    setCurrentLie('tee');
    setIsPlanningShot(true);
    setIsHitting(false);
    setIsHoleCompleted(false);
    setActiveTrajectory(null);
    setActiveTrajectory3D(null);
    setCurrentFlightResult(null);
    setShotResult(null);
    setFlightStats(null);
    setShotHistory([]);
    setSelectedClub(recommendClub(calculateDistanceYards(teePos, hole.pinPosition)));
    setPowerPercent(100);
    setShape('straight');
    onSetTarget(hole.pinPosition);
    trajectory3DRef.current = null;
    cleanUpFlyingBall();

    if (tracerPolylineRef.current && map3dRef.current) {
      try {
        map3dRef.current.removeChild(tracerPolylineRef.current);
      } catch (e) {
        try {
          tracerPolylineRef.current.remove?.();
        } catch (err) {
          // ignore
        }
      }
      tracerPolylineRef.current = null;
    }
    historyPolylinesRef.current.forEach((poly) => {
      try {
        map3dRef.current?.removeChild(poly);
      } catch (e) {
        // ignore
      }
    });
    historyPolylinesRef.current = [];

    // Reset ball lie marker to tee clamped to ground
    const maps3d = maps3dLib || (window.google?.maps as any)?.maps3d;
    if (maps3d && map3dRef.current) {
      try {
        if (ballLieMarkerRef.current) {
          ballLieMarkerRef.current.position = {
            lat: teePos.lat,
            lng: teePos.lng,
          };
          ballLieMarkerRef.current.altitudeMode = 'CLAMP_TO_GROUND';
          ballLieMarkerRef.current.label = '⛳ Tee Box (Click to Plan)';
        } else if (maps3d.Marker3DInteractiveElement) {
          const marker = new maps3d.Marker3DInteractiveElement({
            position: {
              lat: teePos.lat,
              lng: teePos.lng,
            },
            altitudeMode: 'CLAMP_TO_GROUND',
            label: '⛳ Tee Box (Click to Plan)',
          });
          marker.addEventListener('gmp-click', () => {
            setIsPlanningShot(true);
          });
          map3dRef.current.appendChild(marker);
          ballLieMarkerRef.current = marker;
        }
      } catch (e) {
        // ignore
      }
    }

    // Remove target marker if reset to pin so it doesn't clutter the green
    if (targetMarkerRef.current && map3dRef.current) {
      try {
        map3dRef.current.removeChild(targetMarkerRef.current);
      } catch (e) {
        // ignore
      }
      targetMarkerRef.current = null;
    }

    setCameraView('tee');
  };

  // Quick jump to practice putting directly on the green
  const handleJumpToGreenPutt = () => {
    stopAllOrbitAnimations();
    // Position ball 6 yards (~18 ft) southwest of the pin on the green
    const puttBallPos = computeDestinationPoint(hole.pinPosition, 6, 225);
    setBallLie(puttBallPos);
    setShotNumber(2);
    setIsPlanningShot(true);
    setIsHitting(false);
    setActiveTrajectory(null);
    setActiveTrajectory3D(null);
    setCurrentFlightResult(null);
    setShotResult(null);
    setFlightStats(null);
    setSelectedClub(recommendClub(6));
    setPowerPercent(100);
    setShape('straight');
    onSetTarget(hole.pinPosition);
    trajectory3DRef.current = null;
    cleanUpFlyingBall();

    if (tracerPolylineRef.current && map3dRef.current) {
      try {
        map3dRef.current.removeChild(tracerPolylineRef.current);
      } catch (e) {
        try {
          tracerPolylineRef.current.remove?.();
        } catch (err) {
          // ignore
        }
      }
      tracerPolylineRef.current = null;
    }

    // Move ball lie marker to putt position
    if (ballLieMarkerRef.current) {
      try {
        ballLieMarkerRef.current.position = {
          lat: puttBallPos.lat,
          lng: puttBallPos.lng,
        };
        ballLieMarkerRef.current.altitudeMode = 'CLAMP_TO_GROUND';
        ballLieMarkerRef.current.label = '⛳ Ball on Green (Click to Putt)';
      } catch (e) {
        // ignore
      }
    }

    // Automatically glide 3D camera to ground-level putting perspective facing the pin
    setTimeout(() => {
      flyToPuttingCamera(puttBallPos, hole.pinPosition);
    }, 150);
  };

  const distanceToPinCurrent = calculateDistanceYards(ballLie, hole.pinPosition);
  const isCurrentLieOnGreen = isPositionOnGreen(ballLie, hole) || currentLie === 'green' || selectedClub.category === 'putter';
  let lieName = 'Tee Box';
  if (isCurrentLieOnGreen) {
    lieName = 'Putting Green (Roll Putt)';
  } else if (currentLie === 'bunker') {
    lieName = 'Sand Trap (30% Penalty)';
  } else if (currentLie === 'fairway') {
    lieName = 'Fairway Lie (High Arch)';
  } else if (currentLie === 'rough') {
    lieName = 'Rough Lie';
  } else if (shotNumber === 2) {
    lieName = distanceToPinCurrent <= 25 ? 'Green Fringe' : 'Fairway Lie';
  } else if (shotNumber >= 3) {
    lieName = distanceToPinCurrent <= 15 ? 'Putting Green (Roll Putt)' : 'Approach Lie';
  }

  return (
    <div id="golf-map-3d-viewport" className="relative w-full h-full bg-[#111811] overflow-hidden select-none">
      {/* 3D Map Web-Component Container */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 cursor-crosshair" />

      {/* Fallback Notification if 3D WebGL tiles fail or are restricted */}
      {map3dError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#111811]/90 backdrop-blur-md p-6">
          <div className="max-w-md bg-[#1B291A] border border-[#8FB062]/50 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#A85832]/20 border border-[#A85832] flex items-center justify-center mx-auto mb-4 text-[#E27D60]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">3D Map Viewport Notice</h3>
            <p className="text-sm text-[#DED9CC] mb-5 leading-relaxed">
              Photorealistic 3D map tiles could not be initialized in this window (WebGL2 acceleration may be disabled or restricted).
            </p>
            <button
              onClick={onExit3D}
              className="px-5 py-2.5 rounded-xl bg-[#8FB062] hover:bg-[#A3C876] text-[#1B291A] font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 mx-auto"
            >
              <MapIcon className="w-4 h-4" />
              <span>Switch to Tactical 2D Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* High-Performance 3D Flight Tracer & Animated Golf Ball Canvas Overlay */}
      <FlightTracerOverlay
        isActive={isHitting}
        trajectory3D={activeTrajectory3D}
        getCamera={getCamera}
        peakAltitudeFt={
          isCurrentLieOnGreen
            ? 0
            : currentFlightResult
            ? Math.round(Math.min(36, Math.max(8, currentFlightResult.actualCarryYards * 0.28)) * 3.28)
            : 80
        }
        actualCarryYards={currentFlightResult ? currentFlightResult.actualCarryYards : 0}
        ballSpeedMph={
          isCurrentLieOnGreen
            ? currentFlightResult
              ? Math.max(8, Math.round(Math.sqrt(currentFlightResult.actualCarryYards) * 4.2))
              : 15
            : currentFlightResult
            ? Math.min(175, Math.max(90, Math.round(currentFlightResult.actualCarryYards * 0.68 + 25)))
            : 140
        }
        onFlightComplete={handleFlightFinished}
        onProgressUpdate={handleProgressUpdate}
      />

      {/* Top Header Bar: Perspective angles, camera tilt/heading, and reset hole */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-end gap-2 pointer-events-none z-20">
        {/* Perspective Angle Switcher + Pitch/Compass + Reset Hole */}
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          {/* Perspective Preset Buttons */}
          <div className="bg-[#1B291A]/95 backdrop-blur-md border border-[#8FB062]/40 p-1 rounded-xl shadow-lg flex items-center gap-1">
            <button
              id="btn-3d-view-tee"
              onClick={() => setCameraView('tee')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeCameraView === 'tee' && !isRotating
                  ? 'bg-[#8FB062] text-[#1B291A] shadow-xs'
                  : 'text-[#DED9CC] hover:bg-white/10'
              }`}
              title="View from elevated championship tee down to green"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tee Bluff</span>
            </button>

            {isCurrentLieOnGreen && (
              <button
                id="btn-3d-view-putt"
                onClick={() => setCameraView('putt')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeCameraView === 'putt' && !isRotating
                    ? 'bg-[#8FB062] text-[#1B291A] shadow-xs'
                    : 'text-[#A3E635] hover:bg-[#8FB062]/20 border border-[#8FB062]/40'
                }`}
                title="Ground-level putting view directly behind ball aimed at cup"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Putt Line</span>
              </button>
            )}

            <button
              id="btn-3d-view-green"
              onClick={() => setCameraView('green')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeCameraView === 'green' && !isRotating
                  ? 'bg-[#8FB062] text-[#1B291A] shadow-xs'
                  : 'text-[#DED9CC] hover:bg-white/10'
              }`}
              title="Close up perspective on the green complex"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Green Complex</span>
            </button>

            <button
              id="btn-3d-view-birdseye"
              onClick={() => setCameraView('birdseye')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeCameraView === 'birdseye' && !isRotating
                  ? 'bg-[#8FB062] text-[#1B291A] shadow-xs'
                  : 'text-[#DED9CC] hover:bg-white/10'
              }`}
              title="High altitude aerial terrain topography"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Aerial</span>
            </button>

            <button
              id="btn-3d-flyover-orbit"
              onClick={handleToggleRotation}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                isRotating
                  ? 'bg-[#D4A31C] text-[#1B291A] shadow-md animate-pulse font-black ring-2 ring-[#D4A31C]/60'
                  : 'text-[#DED9CC] hover:bg-white/10'
              }`}
              title="Play continuous 360 degree rotating aerial flyover around the hole"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{isRotating ? 'Stop 360° Orbit' : '360° Orbit'}</span>
            </button>
          </div>

          {/* Quick Pitch Control */}
          <div className="hidden sm:flex bg-[#1B291A]/95 backdrop-blur-md border border-[#8FB062]/30 px-2 py-1 rounded-xl shadow-lg items-center gap-1.5 text-white">
            <span className="text-[10px] text-[#8FB062] font-extrabold uppercase">Tilt {tiltVal}°</span>
            <button
              onClick={() => adjustTilt(8)}
              title="Tilt Down"
              className="w-5 h-5 rounded bg-white/10 hover:bg-[#8FB062] hover:text-[#1B291A] flex items-center justify-center font-bold text-xs cursor-pointer transition"
            >
              +
            </button>
            <button
              onClick={() => adjustTilt(-8)}
              title="Tilt Up"
              className="w-5 h-5 rounded bg-white/10 hover:bg-[#8FB062] hover:text-[#1B291A] flex items-center justify-center font-bold text-xs cursor-pointer transition"
            >
              -
            </button>
          </div>

          {/* Quick Heading Control */}
          <div className="hidden sm:flex bg-[#1B291A]/95 backdrop-blur-md border border-[#8FB062]/30 px-2 py-1 rounded-xl shadow-lg items-center gap-1.5 text-white">
            <span className="text-[10px] text-[#8FB062] font-extrabold uppercase">{headingVal}°</span>
            <button
              onClick={() => adjustHeading(-20)}
              title="Rotate Left"
              className="w-5 h-5 rounded bg-white/10 hover:bg-[#8FB062] hover:text-[#1B291A] flex items-center justify-center cursor-pointer transition"
            >
              <RotateCw className="w-3 h-3 transform -scale-x-100" />
            </button>
            <button
              onClick={() => adjustHeading(20)}
              title="Rotate Right"
              className="w-5 h-5 rounded bg-white/10 hover:bg-[#8FB062] hover:text-[#1B291A] flex items-center justify-center cursor-pointer transition"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>

          {/* 3D WASD Camera Controls Badge */}
          <div className="hidden lg:flex bg-[#1B291A]/95 backdrop-blur-md border border-[#8FB062]/30 px-2.5 py-1.5 rounded-xl shadow-lg items-center gap-1.5 text-white">
            <span className="font-mono text-[10px] font-extrabold bg-[#8FB062] text-[#1B291A] px-1.5 py-0.5 rounded shadow-xs">
              WASD
            </span>
            <span className="text-[10px] text-[#DED9CC] font-semibold">Fly (QE Turn • Shift ⚡)</span>
          </div>

          {/* Reset Hole Button in Top Bar */}
          <button
            id="btn-3d-header-reset-hole"
            onClick={handleResetHole}
            className="hidden sm:flex bg-[#1B291A]/95 hover:bg-amber-500/20 text-[#DED9CC] hover:text-amber-200 font-extrabold text-xs px-3 py-2 rounded-xl shadow-lg border border-[#8FB062]/30 items-center gap-1.5 transition cursor-pointer active:scale-95"
            title="Reset Hole back to Tee Box (Shot 1)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Reset Hole</span>
          </button>
        </div>
      </div>

      {/* Flight In-Progress HUD: Clean, Sleek Broadcast Telemetry docked at bottom-middle of screen */}
      {isHitting && flightStats && (
        <div
          id="flight-progress-hud"
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none bg-[#1B291A]/95 backdrop-blur-md border-2 border-[#8FB062] px-6 py-3 rounded-2xl shadow-2xl text-white flex items-center gap-5 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[95%] whitespace-nowrap"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#A3E635] animate-ping" />
            <div>
              <span className="text-xs font-black text-[#A3E635] uppercase tracking-wider block">
                {isCurrentLieOnGreen ? 'Tracing Ground Roll' : 'Tracing Flight'}
              </span>
              <span className="text-[10px] text-[#DED9CC] font-bold">
                {selectedClub.name} • {isCurrentLieOnGreen ? 'GROUND CLAMPED' : shape.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-5 text-xs font-bold border-l border-white/20 pl-4 sm:pl-5">
            <div>
              <span className="text-[10px] text-[#DED9CC] block font-medium">
                {isCurrentLieOnGreen ? 'Rollout' : 'Carry'}
              </span>
              <span className="text-sm sm:text-base text-white font-black">{flightStats.distanceSoFar} yds</span>
            </div>
            <div>
              <span className="text-[10px] text-[#DED9CC] block font-medium">
                {isCurrentLieOnGreen ? 'Profile' : 'Apex'}
              </span>
              <span className="text-sm sm:text-base text-[#D4A31C] font-black">
                {isCurrentLieOnGreen ? 'Clamped to Turf' : `${flightStats.peakAltitude} ft`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#DED9CC] block font-medium">Speed</span>
              <span className="text-sm sm:text-base text-[#8FB062] font-black">{flightStats.ballSpeedMph} mph</span>
            </div>
          </div>
        </div>
      )}

      {/* Shot Landing Outcome Celebration Banner docked at bottom-middle */}
      {shotResult && !isHitting && (
        (() => {
          const isHoledOut =
            isHoleCompleted ||
            shotResult.lie === 'holed' ||
            shotResult.distanceToPinFeet <= 1 ||
            Boolean(shotResult.feedbackTitle?.includes('IN THE CUP'));

          return (
            <div
              id="shot-landing-result-card"
              className={`absolute ${
                isHoledOut
                  ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 border-[#D4A31C] shadow-[0_0_45px_rgba(212,163,28,0.45)]'
                  : 'bottom-6 left-1/2 transform -translate-x-1/2 z-30 border-[#8FB062] shadow-2xl'
              } pointer-events-auto bg-[#1B291A]/95 backdrop-blur-md border-2 p-4 rounded-2xl text-white flex flex-col gap-3 max-w-sm w-[92%] sm:w-full mx-auto animate-in slide-in-from-bottom-4 fade-in duration-200`}
            >
              {isHoledOut ? (
                <>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#B48316] to-[#FACC15] flex items-center justify-center text-[#1B291A] font-black shadow-lg">
                        <Trophy className="w-5 h-5 text-[#1B291A]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black tracking-wider uppercase text-[#D4A31C] bg-[#D4A31C]/20 px-2 py-0.5 rounded-full border border-[#D4A31C]/40 inline-block">
                          HOLE COMPLETED
                        </span>
                        <h4 className="text-sm font-black text-white mt-0.5">
                          {getScoreName(shotNumber, hole.par)}
                        </h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-[#D4A31C]">
                        {shotNumber} {shotNumber === 1 ? 'Stroke' : 'Strokes'}
                      </span>
                      <span className="text-[10px] text-[#DED9CC] block">Par {hole.par}</span>
                    </div>
                  </div>

                  <div className="bg-[#D4A31C]/10 p-3 rounded-xl border border-[#D4A31C]/30 text-xs flex flex-col gap-1">
                    <span className="text-[#FACC15] font-extrabold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />
                      <span>IN THE CUP! Final Result</span>
                    </span>
                    <p className="text-[11px] text-[#F1EDE2] leading-relaxed">
                      {shotResult.feedbackDescription ||
                        `Outstanding play! Shot ${shotNumber} dropped into the bottom of the cup to complete Hole #${hole.holeNumber}.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      id="btn-shot-try-again"
                      onClick={handleRetakeShot}
                      className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 border border-white/15"
                      title="Replay previous shot"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#DED9CC]" />
                      <span>Replay Shot</span>
                    </button>
                    <button
                      type="button"
                      id="btn-shot-reset-tee"
                      onClick={handleResetHole}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#8FB062] to-[#A3E635] hover:brightness-105 text-[#1B291A] font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer active:scale-95"
                      title="Reset entire hole back to Tee Box"
                    >
                      <Flag className="w-3.5 h-3.5 text-[#1B291A]" />
                      <span>Play Again</span>
                    </button>
                  </div>
                </>
              ) : shotResult.lie === 'out_of_bounds' ? (
                <>
                  <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wide text-white">
                          Shot {shotNumber} Result
                        </h4>
                        <span className="text-[11px] text-rose-400 font-bold">
                          ⚠️ OUT OF BOUNDS (+1 PENALTY)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-rose-400">
                        {shotResult.actualCarryYards} yds
                      </span>
                      <span className="text-[10px] text-[#DED9CC] block">Hazard Drop</span>
                    </div>
                  </div>

                  <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-3 text-xs space-y-1.5">
                    <p className="text-rose-200 font-bold leading-relaxed">
                      {shotResult.feedbackDescription}
                    </p>
                    <p className="text-[11px] text-rose-300/80 leading-relaxed">
                      Rules of Golf: An out-of-bounds shot forces you to retake your shot from your previous lie with a 1-stroke penalty added to your scorecard.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      id="btn-shot-retake-ob"
                      onClick={handleRetakeOBShot}
                      className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer active:scale-95"
                      title="Retake shot with 1-stroke penalty"
                    >
                      <RotateCcw className="w-4 h-4 text-white" />
                      <span>Retake Shot (+1 Stroke)</span>
                    </button>
                    <button
                      type="button"
                      id="btn-shot-reset-tee"
                      onClick={handleResetHole}
                      className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 border border-white/15"
                      title="Reset entire hole back to Tee Box"
                    >
                      <Flag className="w-4 h-4 text-[#DED9CC]" />
                      <span>Restart Hole</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      {shotResult.distanceToPinFeet <= 3 ? (
                        <Trophy className="w-5 h-5 text-[#D4A31C] animate-bounce" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-[#8FB062]" />
                      )}
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wide text-white">
                          Shot {shotNumber} Result
                        </h4>
                        <span className="text-[11px] text-[#8FB062] font-bold">
                          {shotResult.feedbackTitle}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-white">
                        {shotResult.actualCarryYards} yds
                      </span>
                      <span className="text-[10px] text-[#DED9CC] block">Carry Distance</span>
                    </div>
                  </div>

                  {/* Lie Badges for Feedback */}
                  {shotResult.lie === 'bunker' && (
                    <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold flex items-center gap-2">
                      <span>🏖️</span>
                      <span>Sand Trap Lie: 30% power penalty applies to next shot</span>
                    </div>
                  )}
                  {shotResult.lie === 'green' && (
                    <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 font-bold flex items-center gap-2">
                      <span>🟢</span>
                      <span>Putting Green: Smooth ground roll putt enabled!</span>
                    </div>
                  )}
                  {shotResult.lie === 'fairway' && (
                    <div className="bg-[#8FB062]/20 border border-[#8FB062]/40 rounded-xl px-2.5 py-1.5 text-xs text-[#8FB062] font-bold flex items-center gap-2">
                      <span>⛳</span>
                      <span>Fairway Lie: Clean lie with high arching trajectory</span>
                    </div>
                  )}

                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                    <span className="text-[#DED9CC]">Distance to Pin:</span>
                    <span className="font-extrabold text-white text-sm">
                      {shotResult.distanceToPinFeet <= 20
                        ? `${shotResult.distanceToPinFeet} feet`
                        : `${shotResult.distanceToPinYards} yards`}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#DED9CC] leading-relaxed">
                    {shotResult.feedbackDescription}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      id="btn-shot-try-again"
                      onClick={handleRetakeShot}
                      className="py-2.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                      title="Try again from current lie with Shot Planner"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-300" />
                      <span>Try Again</span>
                    </button>
                    <button
                      type="button"
                      id="btn-shot-reset-tee"
                      onClick={handleResetHole}
                      className="py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                      title="Reset entire hole back to Tee Box"
                    >
                      <Flag className="w-4 h-4 text-[#DED9CC]" />
                      <span>Reset Tee</span>
                    </button>
                    <button
                      type="button"
                      id="btn-shot-play-next"
                      onClick={handlePlayNextShot}
                      className="py-2.5 px-2 rounded-xl bg-[#8FB062] hover:bg-[#9EC26E] text-[#1B291A] font-extrabold text-xs flex flex-col items-center justify-center gap-1 shadow-md transition cursor-pointer active:scale-95"
                      title="Advance to landing lie for next shot"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Shot {shotNumber + 1}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()
      )}

      {/* Bottom Area: Elevation Info on Left, Shot Planning on Right (hidden when hole is completed so only the celebration card shows in middle) */}
      {!isHoleCompleted && shotResult?.lie !== 'holed' && (
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex flex-col md:flex-row items-end justify-between gap-3 max-h-[calc(100vh-100px)]">
          {/* Bottom Left Elevation Profile Card */}
          <div className="pointer-events-auto w-full md:w-[300px] max-w-full">
            <div className="bg-[#1B291A]/95 backdrop-blur-md border border-[#8FB062]/40 rounded-2xl p-3 shadow-xl text-white flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4A31C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#FDFCF9]">
                    {hole.courseName.split('(')[0]} • #{hole.holeNumber}
                  </h4>
                </div>
                <button
                  onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
                  className="text-[#DED9CC] hover:text-white cursor-pointer"
                  title={isStatsCollapsed ? 'Expand Elevation Metrics' : 'Collapse Elevation Metrics'}
                >
                  {isStatsCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {!isStatsCollapsed && (
                <>
                  <p className="text-[11px] text-[#DED9CC] leading-relaxed">
                    {hole.holeNumber === 7 ? (
                      <>Cliff drop into Carmel Bay with ocean crosswinds and realistic 3D elevation.</>
                    ) : (
                      <>3D Photorealistic elevation model with true ground contours and hazard relief.</>
                    )}
                  </p>

                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-white/10 text-center">
                    <div className="bg-white/5 p-1.5 rounded-lg">
                      <span className="text-[9px] text-[#8FB062] block">Tee Box</span>
                      <span className="text-[11px] font-bold text-white">
                        +{Math.abs(hole.elevationChangeYards * 3) + 16} ft
                      </span>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded-lg">
                      <span className="text-[9px] text-[#D4A31C] block">Pin</span>
                      <span className="text-[11px] font-bold text-white">+16 ft</span>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded-lg">
                      <span className="text-[9px] text-[#E11D48] block">Net Drop</span>
                      <span className="text-[11px] font-bold text-white">
                        -{Math.abs(hole.elevationChangeYards * 3)} ft
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Right: Either the Glowing Circle OR the Interactive Shot Planner (Hidden on mobile to keep small viewport clear) */}
          <div className="pointer-events-auto hidden sm:flex flex-col items-end">
            {isPlanningShot && !isHoleCompleted ? (
              /* Opened Shot Planning Panel */
              <Shot3DPlanner
                hole={hole}
                ballPosition={ballLie}
                aimPosition={targetPosition}
                onSetAimPosition={onSetTarget}
                shotNumber={shotNumber}
                currentLie={currentLie}
                selectedClub={selectedClub}
                onSelectClub={setSelectedClub}
                powerPercent={powerPercent}
                onChangePower={setPowerPercent}
                shape={shape}
                onChangeShape={setShape}
                wind={wind}
                onHitBall={handleHitBall}
                onClose={() => setIsPlanningShot(false)}
                isHitting={isHitting}
                onResetHole={handleResetHole}
                onJumpToGreenPutt={handleJumpToGreenPutt}
              />
            ) : !isHitting && !shotResult && !isHoleCompleted ? (
              /* Glowing Circle Beacon at the Ball Position */
              <div className="flex flex-col items-end gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                {/* Informative pill */}
                <div className="bg-[#1B291A]/95 backdrop-blur-md border border-[#8FB062]/60 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-white">
                  <span className="w-2 h-2 rounded-full bg-[#8FB062] animate-ping" />
                  <span className="text-xs font-bold text-[#F1EDE2]">
                    Shot {shotNumber}: {lieName} ({Math.round(distanceToPinCurrent)}y to pin)
                  </span>
                </div>

                {/* Glowing Circle Button */}
                <button
                  id="glowing-tee-circle"
                  type="button"
                  onClick={() => setIsPlanningShot(true)}
                  className="relative group flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                  title={`Click glowing circle to plan Shot ${shotNumber}`}
                >
                  {/* Concentric glowing aura rings */}
                  <span className="absolute w-20 h-20 rounded-full bg-[#8FB062]/40 animate-ping pointer-events-none" />
                  <span className="absolute w-16 h-16 rounded-full bg-[#8FB062]/25 animate-pulse pointer-events-none" />
                  <span className="absolute w-22 h-22 rounded-full border-2 border-[#8FB062]/50 shadow-[0_0_35px_rgba(143,176,98,0.85)] pointer-events-none" />

                  {/* Center Core Circle Button */}
                  <div className="relative w-15 h-15 rounded-full bg-gradient-to-tr from-[#5A7A3A] via-[#8FB062] to-[#B5D982] border-2 border-white shadow-[0_0_25px_#8FB062] flex flex-col items-center justify-center text-[#1B291A] font-black group-hover:scale-105 transition-transform">
                    <Sparkles className="w-5 h-5 text-white" />
                    <span className="text-[9px] font-black uppercase text-white tracking-tighter -mt-0.5">
                      PLAN
                    </span>
                  </div>
                </button>

                <span className="text-[11px] font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-black/50 px-2.5 py-0.5 rounded-full">
                  Tap glowing circle to plan shot
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
