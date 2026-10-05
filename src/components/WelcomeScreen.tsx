import React, { useState } from 'react';
import { GolfHole } from '../types/golf';
import { ApiKeyBar } from './ApiKeyBar';
import { useIsLandscapeMobile } from '../utils/useIsMobile';
import {
  Flag,
  Compass,
  Wind,
  Mountain,
  ArrowRight,
  Sparkles,
  Crosshair,
  ShieldAlert,
  GraduationCap,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface WelcomeScreenProps {
  holes: GolfHole[];
  onSelectHole: (hole: GolfHole) => void;
  apiKey?: string;
  onUpdateApiKey?: (key: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  holes,
  onSelectHole,
  apiKey = '',
  onUpdateApiKey,
}) => {
  const [selectedId, setSelectedId] = useState<string>(holes[0]?.id || 'birdwood-16');
  const selectedCourseHole = holes.find((h) => h.id === selectedId) || holes[0];
  const isLandscapeMobile = useIsLandscapeMobile();
  const isBirdwood = selectedCourseHole?.id?.startsWith('birdwood');

  return (
    <div
      id="welcome-screen"
      className={`relative w-full h-full h-screen max-h-screen bg-[#131E12] text-[#F1EDE2] ${
        isLandscapeMobile
          ? 'p-2 sm:p-2.5 px-4 overflow-hidden'
          : 'p-4 sm:p-5 lg:px-8 lg:py-4 overflow-y-auto lg:overflow-hidden'
      } flex flex-col justify-between select-none`}
    >
      {/* Background Subtle Accent Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#8FB062_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Top Header / Branding */}
      <header
        className={`relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between border-b border-[#2D3E2B] ${
          isLandscapeMobile ? 'pb-1' : 'pb-3'
        } flex-shrink-0`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`${
              isLandscapeMobile ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-xl'
            } bg-[#8FB062] flex items-center justify-center text-[#152014] shadow-sm flex-shrink-0`}
          >
            <Flag className={`${isLandscapeMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`${
                  isLandscapeMobile ? 'text-sm' : 'text-base sm:text-lg'
                } font-black tracking-tight text-[#F1EDE2]`}
              >
                CourseViz
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#232D4B] text-[#E57200] border border-[#E57200]/40">
                UVA Birdwood Edition
              </span>
            </div>
            <p className={`${isLandscapeMobile ? 'text-[9px]' : 'text-[11px]'} text-[#A8B89F]`}>
              Birdwood Golf at Boar's Head Resort • Darden &amp; UVA Community
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#A8B89F]">
          {onUpdateApiKey && (
            <ApiKeyBar apiKey={apiKey} onUpdateApiKey={onUpdateApiKey} />
          )}
          {!isLandscapeMobile && (
            <div className="hidden sm:flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-[#8FB062]" /> Real GPS Coordinates
              </span>
              <span className="flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-[#8FB062]" /> True Elevation Profiles
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area: Responsive 2-Column Grid */}
      <main
        className={`relative z-10 max-w-6xl w-full mx-auto my-auto ${
          isLandscapeMobile ? 'py-1' : 'py-2 sm:py-3'
        } flex-1 flex items-center overflow-hidden`}
      >
        <div
          className={`w-full grid ${
            isLandscapeMobile
              ? 'grid-cols-12 gap-3.5'
              : 'grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8'
          } items-center`}
        >
          {/* Left Column: Hero & Course Quick Select */}
          <div
            className={`${
              isLandscapeMobile ? 'col-span-5' : 'lg:col-span-6'
            } flex flex-col justify-center text-left`}
          >
            <div
              className={`inline-flex items-center gap-1.5 rounded-full bg-[#1F2F1E] border border-[#2D3E2B] font-semibold text-[#A8B89F] w-fit ${
                isLandscapeMobile ? 'px-2 py-0.5 text-[9px] mb-1' : 'px-3 py-1 text-[11px] mb-2.5'
              }`}
            >
              <GraduationCap className={`${isLandscapeMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-[#E57200]`} />
              <span>University of Virginia • Darden School of Business</span>
            </div>

            <h1
              className={`${
                isLandscapeMobile
                  ? 'text-base sm:text-lg font-bold mb-1 leading-snug'
                  : 'text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 leading-tight'
              } tracking-tight text-[#F1EDE2]`}
            >
              Birdwood Golf Course
            </h1>

            <p
              className={`${
                isLandscapeMobile
                  ? 'text-[10px] text-[#BCC9B4] mb-1.5 line-clamp-2 leading-tight'
                  : 'text-xs sm:text-sm text-[#BCC9B4] mb-3.5 leading-relaxed'
              } max-w-lg`}
            >
              Designed by Davis Love III at Boar's Head Resort in Charlottesville, VA. Home course of the UVA Cavaliers, located right down Ivy Road from Darden. Explore satellite terrain, realistic wind drift, and tactical multi-shot planner.
            </p>

            {/* Hole Selection Strip */}
            <div className="mb-3.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8FB062] mb-1.5">
                Select Course Hole to Explore:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {holes.map((h) => {
                  const isCur = h.id === selectedId;
                  const isBw = h.id.startsWith('birdwood');
                  return (
                    <button
                      key={h.id}
                      onClick={() => setSelectedId(h.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                        isCur
                          ? 'bg-[#8FB062] text-[#131E12] border-[#8FB062] font-bold shadow-sm'
                          : 'bg-[#182417] text-[#A8B89F] hover:text-white border-[#2D3E2B] hover:border-[#4A6347]'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-black ${
                        isCur ? (isBw ? 'bg-[#232D4B] text-[#E57200]' : 'bg-[#131E12] text-[#8FB062]') : 'bg-[#111A10] text-[#A8B89F]'
                      }`}>
                        #{h.holeNumber}
                      </span>
                      <span>{isBw ? (h.id.includes('nest') ? 'The Nest' : `Hole ${h.holeNumber}`) : 'Pebble #7'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Pill Grid */}
            <div
              className={`grid grid-cols-2 ${isLandscapeMobile ? 'gap-1.5' : 'gap-2'} max-w-lg`}
            >
              <div
                className={`${
                  isLandscapeMobile ? 'p-1.5 rounded-lg' : 'p-2 sm:p-2.5 rounded-xl'
                } bg-[#1B291A] border border-[#2D3E2B]`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F1EDE2] mb-0.5">
                  <Crosshair
                    className={`${
                      isLandscapeMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'
                    } text-[#8FB062] flex-shrink-0`}
                  />
                  <span className={isLandscapeMobile ? 'text-[10px]' : 'text-xs'}>
                    Multi-Shot Strategy
                  </span>
                </div>
                {!isLandscapeMobile && (
                  <p className="text-[10px] sm:text-[11px] text-[#A8B89F] leading-snug">
                    Birdie attack vs. tactical safety par runs.
                  </p>
                )}
              </div>

              <div
                className={`${
                  isLandscapeMobile ? 'p-1.5 rounded-lg' : 'p-2 sm:p-2.5 rounded-xl'
                } bg-[#1B291A] border border-[#2D3E2B]`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F1EDE2] mb-0.5">
                  <Mountain
                    className={`${
                      isLandscapeMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'
                    } text-[#8FB062] flex-shrink-0`}
                  />
                  <span className={isLandscapeMobile ? 'text-[10px]' : 'text-xs'}>
                    True Elevation Drops
                  </span>
                </div>
                {!isLandscapeMobile && (
                  <p className="text-[10px] sm:text-[11px] text-[#A8B89F] leading-snug">
                    Piedmont slopes &amp; "plays like" distances.
                  </p>
                )}
              </div>

              <div
                className={`${
                  isLandscapeMobile ? 'p-1.5 rounded-lg' : 'p-2 sm:p-2.5 rounded-xl'
                } bg-[#1B291A] border border-[#2D3E2B]`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F1EDE2] mb-0.5">
                  <Wind
                    className={`${
                      isLandscapeMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'
                    } text-[#8FB062] flex-shrink-0`}
                  />
                  <span className={isLandscapeMobile ? 'text-[10px]' : 'text-xs'}>
                    Blue Ridge Winds
                  </span>
                </div>
                {!isLandscapeMobile && (
                  <p className="text-[10px] sm:text-[11px] text-[#A8B89F] leading-snug">
                    Shenandoah breeze deflection &amp; drift.
                  </p>
                )}
              </div>

              <div
                className={`${
                  isLandscapeMobile ? 'p-1.5 rounded-lg' : 'p-2 sm:p-2.5 rounded-xl'
                } bg-[#1B291A] border border-[#2D3E2B]`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F1EDE2] mb-0.5">
                  <Compass
                    className={`${
                      isLandscapeMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'
                    } text-[#8FB062] flex-shrink-0`}
                  />
                  <span className={isLandscapeMobile ? 'text-[10px]' : 'text-xs'}>
                    Photorealistic 3D
                  </span>
                </div>
                {!isLandscapeMobile && (
                  <p className="text-[10px] sm:text-[11px] text-[#A8B89F] leading-snug">
                    Google 3D mesh flyovers &amp; tee perspectives.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Featured Hole Interactive Card */}
          <div
            className={`${
              isLandscapeMobile ? 'col-span-7' : 'lg:col-span-6'
            } flex flex-col justify-center`}
          >
            <div
              className={`flex items-center justify-between ${
                isLandscapeMobile ? 'mb-1' : 'mb-1.5'
              } px-0.5`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8FB062]">
                  {isBirdwood ? 'Birdwood at UVA' : 'Championship Hole'}
                </span>
                {isBirdwood && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-[#232D4B] text-[#E57200]">
                    Charlottesville, VA
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#A8B89F]">Interactive Simulation</span>
            </div>

            {selectedCourseHole && (
              <div
                id="welcome-select-hole-card"
                onClick={() => onSelectHole(selectedCourseHole)}
                className={`group relative bg-[#182417] hover:bg-[#1E2D1D] ${
                  isLandscapeMobile ? 'rounded-xl p-2.5 sm:p-3' : 'rounded-2xl p-4 sm:p-5'
                } border border-[#2D3E2B] hover:border-[#8FB062] transition-all duration-200 cursor-pointer shadow-xl hover:shadow-2xl flex flex-col justify-between`}
              >
                {/* Card Header & Badge */}
                <div>
                  <div
                    className={`flex items-center justify-between ${
                      isLandscapeMobile ? 'mb-1' : 'mb-2'
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#8FB062]/20 text-[#8FB062] border border-[#8FB062]/40">
                      {isBirdwood ? "Boar's Head Resort • UVA" : 'Monterey Peninsula, CA'}
                    </span>
                    <span
                      className={`${
                        isLandscapeMobile ? 'text-[11px]' : 'text-xs'
                      } font-semibold text-[#A8B89F]`}
                    >
                      Par {selectedCourseHole.par} • {selectedCourseHole.yardage} Yds
                    </span>
                  </div>

                  <div className={isLandscapeMobile ? 'mb-1' : 'mb-1.5'}>
                    <h3
                      className={`${
                        isLandscapeMobile ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
                      } font-bold text-[#F1EDE2] group-hover:text-[#8FB062] transition-colors leading-tight`}
                    >
                      {selectedCourseHole.courseName}
                    </h3>
                    <p
                      className={`${
                        isLandscapeMobile ? 'text-xs' : 'text-sm'
                      } font-semibold text-[#8FB062]`}
                    >
                      Hole #{selectedCourseHole.holeNumber} — "{selectedCourseHole.holeName}"
                    </p>
                  </div>

                  <p
                    className={`${
                      isLandscapeMobile
                        ? 'text-[10px] line-clamp-1 mb-1.5'
                        : 'text-[11px] sm:text-xs mb-3 line-clamp-2'
                    } text-[#BCC9B4] leading-relaxed`}
                  >
                    {selectedCourseHole.description}
                  </p>

                  {/* Key Metrics */}
                  <div
                    className={`grid grid-cols-3 gap-1.5 ${
                      isLandscapeMobile ? 'py-1 mb-1.5' : 'gap-2 py-2 mb-3'
                    } border-y border-[#2D3E2B] text-center`}
                  >
                    <div className="bg-[#121A11] p-1 sm:p-1.5 rounded-lg">
                      <span className="block text-[8px] uppercase tracking-wide text-[#A8B89F]">
                        Elevation
                      </span>
                      <span
                        className={`${
                          isLandscapeMobile ? 'text-[11px]' : 'text-xs'
                        } font-bold text-[#F1EDE2]`}
                      >
                        {selectedCourseHole.elevationChangeYards >= 0 ? '+' : ''}
                        {selectedCourseHole.elevationChangeYards * 3} ft ({selectedCourseHole.elevationChangeYards}y)
                      </span>
                    </div>
                    <div className="bg-[#121A11] p-1 sm:p-1.5 rounded-lg">
                      <span className="block text-[8px] uppercase tracking-wide text-[#A8B89F]">
                        Plays Like
                      </span>
                      <span
                        className={`${
                          isLandscapeMobile ? 'text-[11px]' : 'text-xs'
                        } font-bold text-[#8FB062]`}
                      >
                        ~{selectedCourseHole.yardage + selectedCourseHole.elevationChangeYards} yds
                      </span>
                    </div>
                    <div className="bg-[#121A11] p-1 sm:p-1.5 rounded-lg">
                      <span className="block text-[8px] uppercase tracking-wide text-[#A8B89F]">
                        Handicap
                      </span>
                      <span
                        className={`${
                          isLandscapeMobile ? 'text-[11px]' : 'text-xs'
                        } font-bold text-[#F1EDE2]`}
                      >
                        Rank #{selectedCourseHole.handicap}
                      </span>
                    </div>
                  </div>

                  {/* Tactical Highlights */}
                  <div
                    className={`${
                      isLandscapeMobile ? 'space-y-0.5 mb-2 text-[10px]' : 'space-y-1 mb-4 text-[11px]'
                    } text-[#A8B89F]`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#8FB062] flex-shrink-0" />
                      <span className="text-[#F1EDE2] font-semibold truncate">
                        {selectedCourseHole.strategies?.twoShot.name || '2-Shot Attack Strategy'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3 text-[#C2921D] flex-shrink-0" />
                      <span className="truncate">
                        {selectedCourseHole.hazards[0]?.name || 'Water & Bunkers'} in play
                      </span>
                    </div>
                    {!isLandscapeMobile && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#8FB062] flex-shrink-0" />
                        <span className="truncate">
                          {isBirdwood
                            ? "Boar's Head Resort, 410 Golf Course Dr, Charlottesville, VA"
                            : '17-Mile Drive, Pebble Beach, CA'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Button */}
                <button
                  type="button"
                  className={`w-full ${
                    isLandscapeMobile
                      ? 'py-1.5 px-3 rounded-lg text-xs'
                      : 'py-2.5 px-4 rounded-xl text-xs sm:text-sm'
                  } font-bold ${
                    isBirdwood
                      ? 'bg-[#8FB062] group-hover:bg-[#9EBF6F] text-[#131E12]'
                      : 'bg-[#8FB062] group-hover:bg-[#9EBF6F] text-[#152014]'
                  } flex items-center justify-center gap-2 shadow-sm transition-all`}
                >
                  <span>
                    Launch {selectedCourseHole.courseName} #{selectedCourseHole.holeNumber}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Bar */}
      <footer
        className={`relative z-10 max-w-6xl w-full mx-auto ${
          isLandscapeMobile ? 'pt-1 text-[9px]' : 'pt-2.5 text-[11px]'
        } border-t border-[#2D3E2B] flex flex-row items-center justify-between gap-2 text-[#A8B89F] flex-shrink-0`}
      >
        <p>© CourseViz — Birdwood Golf Course at UVA (Charlottesville, VA)</p>
        <p className="flex items-center gap-1">
          <span>Powered by Google Maps Platform (2D High-Res Satellite &amp; 3D Photorealistic Tiles)</span>
        </p>
      </footer>
    </div>
  );
};
