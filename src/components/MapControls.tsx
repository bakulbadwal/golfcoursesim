import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface MapControlsProps {
  mapTypeId?: string;
  onMapTypeChange?: (type: string) => void;
  showRings: boolean;
  onToggleRings: () => void;
  showFlightArc: boolean;
  onToggleFlightArc: () => void;
  showHazards: boolean;
  onToggleHazards: () => void;
  is3DMode?: boolean;
  onToggle3DMode?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  showRings,
  onToggleRings,
  showFlightArc,
  onToggleFlightArc,
  showHazards,
  onToggleHazards,
  isExpanded,
  onToggleExpand,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(true);

  const isControlled = isExpanded !== undefined;
  const isCollapsed = isControlled ? !isExpanded : internalCollapsed;

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  return (
    <div
      id="map-controls-panel"
      className={`bg-[#FDFCF9]/95 backdrop-blur-md border border-[#DED9CC] rounded-2xl shadow-xl text-[#2C3327] overflow-hidden transition-all duration-200 pointer-events-auto select-none ${
        isCollapsed ? 'w-10 h-10' : 'w-48'
      }`}
    >
      {/* Header - Collapsible Toggle Button */}
      <button
        type="button"
        id="btn-toggle-map-controls"
        onClick={handleToggle}
        className={`cursor-pointer hover:bg-[#F1EDE2]/60 transition text-left flex items-center ${
          isCollapsed
            ? 'w-10 h-10 p-0 justify-center'
            : 'w-full p-2.5 px-3 justify-between'
        }`}
        title={isCollapsed ? 'Expand Map Overlays' : 'Collapse Map Overlays'}
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`flex items-center justify-center flex-shrink-0 transition-colors ${
              isCollapsed
                ? 'w-full h-full text-[#2C3327]'
                : 'w-5 h-5 rounded-lg bg-[#8FB062]/20 text-[#5A7A3A]'
            }`}
          >
            <Layers className={isCollapsed ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </div>
          <span
            className={`text-xs font-bold text-[#1B291A] whitespace-nowrap ${
              isCollapsed ? 'hidden' : 'inline'
            }`}
          >
            Map Overlays
          </span>
        </div>
        <div
          className={`items-center text-[#5C6353] flex-shrink-0 ${
            isCollapsed ? 'hidden' : 'flex'
          }`}
        >
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 flex-shrink-0" />
          )}
        </div>
      </button>

      {/* Layer Options List */}
      <div
        className={`p-2 pt-1 border-t border-[#DED9CC]/60 flex flex-col gap-0.5 transition-all ${
          isCollapsed ? 'hidden' : 'block'
        }`}
      >
        <label className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#2C3327] hover:bg-[#F1EDE2] hover:text-[#1B291A] flex items-center justify-between gap-2 transition cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#8FB062] flex-shrink-0" />
            <span className="truncate">Shot Flight Arc</span>
          </div>
          <input
            id="toggle-shot-arc"
            type="checkbox"
            checked={showFlightArc}
            onChange={onToggleFlightArc}
            className="w-3.5 h-3.5 rounded text-[#8FB062] accent-[#8FB062] cursor-pointer flex-shrink-0"
          />
        </label>

        <label className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#2C3327] hover:bg-[#F1EDE2] hover:text-[#1B291A] flex items-center justify-between gap-2 transition cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#C2B280] flex-shrink-0" />
            <span className="truncate">Distance Rings</span>
          </div>
          <input
            id="toggle-yardage-rings"
            type="checkbox"
            checked={showRings}
            onChange={onToggleRings}
            className="w-3.5 h-3.5 rounded text-[#8FB062] accent-[#8FB062] cursor-pointer flex-shrink-0"
          />
        </label>

        <label className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#2C3327] hover:bg-[#F1EDE2] hover:text-[#1B291A] flex items-center justify-between gap-2 transition cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#A85832] flex-shrink-0" />
            <span className="truncate">Hazards & Bunkers</span>
          </div>
          <input
            id="toggle-hazard-markers"
            type="checkbox"
            checked={showHazards}
            onChange={onToggleHazards}
            className="w-3.5 h-3.5 rounded text-[#8FB062] accent-[#8FB062] cursor-pointer flex-shrink-0"
          />
        </label>
      </div>
    </div>
  );
};
