import React from 'react';
import { GolfHole } from '../types/golf';
import { Mountain, Layers, Flag } from 'lucide-react';

interface HoleSelectorProps {
  holes: GolfHole[];
  selectedHole: GolfHole;
  onSelectHole: (hole: GolfHole) => void;
  is3DMode?: boolean;
  onToggle3DMode?: () => void;
}

export const HoleSelector: React.FC<HoleSelectorProps> = ({
  holes,
  selectedHole,
  onSelectHole,
  is3DMode = false,
  onToggle3DMode,
}) => {
  return (
    <div id="hole-selector-container" className="flex items-center justify-between gap-2 w-full">
      {/* Hole Buttons List */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-0.5">
        {holes.map((hole) => {
          const isSelected = hole.id === selectedHole.id;
          const isBirdwood = hole.id.startsWith('birdwood');

          return (
            <button
              id={`hole-tab-${hole.id}`}
              key={hole.id}
              onClick={() => onSelectHole(hole)}
              className={`flex-shrink-0 flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all duration-150 text-left cursor-pointer border ${
                isSelected
                  ? 'bg-[#8FB062] text-[#1B291A] border-[#8FB062] shadow-sm font-bold'
                  : 'bg-[#243523] text-[#F1EDE2]/85 hover:text-white hover:bg-[#2F452E] border-[#364D34]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                  isSelected
                    ? isBirdwood
                      ? 'bg-[#232D4B] text-[#E57200]'
                      : 'bg-[#1B291A] text-[#8FB062]'
                    : isBirdwood
                      ? 'bg-[#1E2738] text-[#F1EDE2]'
                      : 'bg-[#152014] text-[#F1EDE2]'
                }`}
                title={`Hole #${hole.holeNumber}`}
              >
                #{hole.holeNumber}
              </div>
              <div className="min-w-0 pr-0.5">
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] leading-tight font-bold truncate ${isSelected ? 'text-[#1B291A]' : 'text-[#F1EDE2]'}`}>
                    {hole.courseName.includes('Birdwood') ? 'Birdwood' : 'Pebble Beach'}
                  </span>
                  {isBirdwood && (
                    <span
                      className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                        isSelected ? 'bg-[#232D4B] text-[#F1EDE2]' : 'bg-[#E57200]/25 text-[#E57200]'
                      }`}
                    >
                      UVA
                    </span>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] ${isSelected ? 'text-[#1B291A]/90 font-semibold' : 'text-[#8FB062]'}`}>
                  <span>Par {hole.par}</span>
                  <span>•</span>
                  <span>{hole.yardage}y</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3D / 2D View Mode Toggle */}
      {onToggle3DMode && (
        <div className="flex-shrink-0 pl-1.5 sm:pl-2 border-l border-[#2D3E2B]/80">
          <button
            id="btn-header-3d-toggle"
            onClick={onToggle3DMode}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md border ${
              is3DMode
                ? 'bg-[#8FB062] text-[#142314] hover:bg-[#7CA352] border-[#8FB062] ring-2 ring-[#8FB062]/50'
                : 'bg-[#2D3E2B] hover:bg-[#3E523B] text-[#F1EDE2] border-[#4A6347]'
            }`}
            title={is3DMode ? 'Switch to 2D View' : 'Switch to 3D View'}
            aria-label={is3DMode ? 'Switch to 2D View' : 'Switch to 3D View'}
          >
            {is3DMode ? (
              <Layers className="w-4 h-4 text-[#142314]" />
            ) : (
              <Mountain className="w-4 h-4 text-[#8FB062]" />
            )}
            <span className="whitespace-nowrap">{is3DMode ? '2D View' : '3D View'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
