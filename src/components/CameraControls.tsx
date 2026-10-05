import React, { useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { GolfHole, LatLngLiteral, TeeOption } from '../types/golf';
import {
  Camera,
  RotateCcw,
  CircleDot,
  Flag,
  Crosshair,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CameraControlsProps {
  hole: GolfHole;
  selectedTee: TeeOption;
  targetPosition: LatLngLiteral;
  onResetView?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  hole,
  selectedTee,
  targetPosition,
  onResetView,
  isExpanded,
  onToggleExpand,
}) => {
  const map = useMap();
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

  const handleResetFullHole = () => {
    if (!map) return;
    map.panTo(hole.defaultCenter);
    map.setZoom(hole.defaultZoom);
    map.setHeading(hole.defaultHeading);
    map.setTilt(0);
    onResetView?.();
  };

  const handleFlyToTee = () => {
    if (!map) return;
    map.panTo(selectedTee.position);
    map.setZoom(20);
  };

  const handleFlyToTarget = () => {
    if (!map) return;
    map.panTo(targetPosition);
    map.setZoom(19);
  };

  const handleFlyToGreen = () => {
    if (!map) return;
    map.panTo(hole.pinPosition);
    map.setZoom(20.5);
  };

  return (
    <div
      id="camera-controls-panel"
      className={`bg-[#FDFCF9]/95 backdrop-blur-md border border-[#DED9CC] rounded-2xl shadow-xl text-[#2C3327] overflow-hidden transition-all duration-200 pointer-events-auto select-none ${
        isCollapsed ? 'w-10 h-10' : 'w-48'
      }`}
    >
      {/* Header - Collapsible Toggle Button */}
      <button
        type="button"
        id="btn-toggle-camera-controls"
        onClick={handleToggle}
        className={`cursor-pointer hover:bg-[#F1EDE2]/60 transition text-left flex items-center ${
          isCollapsed
            ? 'w-10 h-10 p-0 justify-center'
            : 'w-full p-2.5 px-3 justify-between'
        }`}
        title={isCollapsed ? 'Expand Camera Controls' : 'Collapse Camera Controls'}
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
            <Camera className={isCollapsed ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </div>
          <span
            className={`text-xs font-bold text-[#1B291A] whitespace-nowrap ${
              isCollapsed ? 'hidden' : 'inline'
            }`}
          >
            Camera Focus
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

      {/* Action Buttons List */}
      <div
        className={`p-2 pt-1 border-t border-[#DED9CC]/60 flex flex-col gap-0.5 transition-all ${
          isCollapsed ? 'hidden' : 'block'
        }`}
      >
        <button
          id="btn-camera-overview"
          onClick={handleResetFullHole}
          className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#2C3327] hover:bg-[#F1EDE2] hover:text-[#1B291A] flex items-center gap-2 transition cursor-pointer text-left"
          title="Reset to overhead hole overview"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#8FB062] flex-shrink-0" />
          <span>Full Hole View</span>
        </button>

        <button
          id="btn-camera-tee"
          onClick={handleFlyToTee}
          className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#2C3327] hover:bg-[#F1EDE2] hover:text-[#1B291A] flex items-center gap-2 transition cursor-pointer text-left"
          title="Zoom in on Tee Box"
        >
          <CircleDot className="w-3.5 h-3.5 text-[#5A7A3A] flex-shrink-0" />
          <span>Tee Box</span>
        </button>

        <button
          id="btn-camera-target"
          onClick={handleFlyToTarget}
          className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#2C3327] hover:bg-[#F1EDE2] hover:text-[#1B291A] flex items-center gap-2 transition cursor-pointer text-left"
          title="Zoom in on Target Landing Point"
        >
          <Crosshair className="w-3.5 h-3.5 text-[#C2921D] flex-shrink-0" />
          <span>Target Zone</span>
        </button>

        <button
          id="btn-camera-green"
          onClick={handleFlyToGreen}
          className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#2C3327] hover:bg-[#F1EDE2] hover:text-[#1B291A] flex items-center gap-2 transition cursor-pointer text-left"
          title="Zoom in on Putting Green & Pin"
        >
          <Flag className="w-3.5 h-3.5 text-[#8FB062] flex-shrink-0" />
          <span>Green & Pin</span>
        </button>
      </div>
    </div>
  );
};
