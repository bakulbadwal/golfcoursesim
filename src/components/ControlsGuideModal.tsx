import React, { useState, useEffect, useRef } from 'react';
import {
  Keyboard,
  MousePointer,
  Move,
  RotateCw,
  Compass,
  Zap,
  Target,
  Flag,
  X,
  Sparkles,
  Layers,
  Video,
  Smartphone,
  Touchpad,
} from 'lucide-react';

interface ControlsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  is3DMode: boolean;
}

export const ControlsGuideModal: React.FC<ControlsGuideModalProps> = ({
  isOpen,
  onClose,
  is3DMode,
}) => {
  const [activeTab, setActiveTab] = useState<'mobile' | '2d' | '3d'>('mobile');
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Sync active tab with current view mode when modal opens
  useEffect(() => {
    if (isOpen) {
      // Default to mobile tab if on touch/mobile viewport, otherwise current 2D/3D mode
      const isTouchOrMobile =
        typeof window !== 'undefined' &&
        (window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024));
      if (isTouchOrMobile) {
        setActiveTab('mobile');
      } else {
        setActiveTab(is3DMode ? '3d' : '2d');
      }
    }
  }, [isOpen, is3DMode]);

  // Focus management and keyboard trap (WCAG 2.1.1 / 2.1.2)
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore focus when closing
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    const dialogNode = dialogRef.current;
    if (dialogNode) {
      const focusableElements = dialogNode.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogNode) {
        const focusable = dialogNode.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="controls-guide-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1B291A]/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        id="controls-guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="controls-guide-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FDFCF9] border border-[#DED9CC] text-[#2C3327] rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#DED9CC]/80 bg-[#FAF8F5] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8FB062] flex items-center justify-center text-[#152014] shadow-xs">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 id="controls-guide-title" className="text-base sm:text-lg font-bold text-[#1B291A] font-serif-natural">
                Controls &amp; Navigation Guide
              </h3>
              <p className="text-[11px] sm:text-xs text-[#5C6353]">
                Full keyboard, mouse, and strategic controls for 2D &amp; 3D camera modes
              </p>
            </div>
          </div>
          <button
            id="btn-close-controls-guide"
            onClick={onClose}
            className="text-[#5C6353] hover:text-[#1B291A] p-2 rounded-xl bg-[#F1EDE2] hover:bg-[#EBE7DD] transition cursor-pointer"
            title="Close Guide (Esc)"
            aria-label="Close Guide (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div role="tablist" aria-label="Camera Controls Mode" className="p-2 sm:px-5 sm:py-3 bg-[#F1EDE2]/60 border-b border-[#DED9CC]/80 flex items-center justify-between gap-1.5 sm:gap-2 flex-shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="tab-controls-mobile"
              role="tab"
              aria-selected={activeTab === 'mobile'}
              aria-controls="panel-controls-mobile"
              onClick={() => setActiveTab('mobile')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'mobile'
                  ? 'bg-[#1B291A] text-[#F1EDE2] shadow-sm'
                  : 'text-[#5C6353] hover:text-[#1B291A] hover:bg-[#EBE7DD]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-[#8FB062]" />
              <span>Mobile &amp; Touch</span>
            </button>
            <button
              id="tab-controls-2d"
              role="tab"
              aria-selected={activeTab === '2d'}
              aria-controls="panel-controls-2d"
              onClick={() => setActiveTab('2d')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === '2d'
                  ? 'bg-[#1B291A] text-[#F1EDE2] shadow-sm'
                  : 'text-[#5C6353] hover:text-[#1B291A] hover:bg-[#EBE7DD]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#8FB062]" />
              <span>2D Satellite</span>
              {!is3DMode && activeTab === '2d' && (
                <span className="hidden sm:inline text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-[#8FB062] text-[#1B291A] rounded-full ml-1">
                  Active
                </span>
              )}
            </button>
            <button
              id="tab-controls-3d"
              role="tab"
              aria-selected={activeTab === '3d'}
              aria-controls="panel-controls-3d"
              onClick={() => setActiveTab('3d')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === '3d'
                  ? 'bg-[#1B291A] text-[#F1EDE2] shadow-sm'
                  : 'text-[#5C6353] hover:text-[#1B291A] hover:bg-[#EBE7DD]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#8FB062]" />
              <span>3D Photorealistic</span>
              {is3DMode && activeTab === '3d' && (
                <span className="hidden sm:inline text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-[#8FB062] text-[#1B291A] rounded-full ml-1">
                  Active
                </span>
              )}
            </button>
          </div>
          <span className="hidden md:inline-block text-[11px] font-medium text-[#5C6353] whitespace-nowrap">
            Press <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-[#EBE7DD] rounded border border-[#DED9CC]">Esc</kbd> to close
          </span>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 select-text">
          {activeTab === 'mobile' ? (
            <>
              {/* Mobile Touch & Tap Guide */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5A7A3A] mb-2.5 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile Gestures: Taps &amp; Drags</span>
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#DED9CC] flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-[#1B291A] block mb-0.5">Move Target Crosshair</span>
                      <p className="text-[11px] text-[#5C6353] leading-relaxed">
                        <strong className="text-[#1B291A]">Tap anywhere</strong> on the fairway, green, or rough to immediately reposition your landing aim point and calculate distance.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] flex-shrink-0">
                      Single Tap
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#DED9CC] flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-[#1B291A] block mb-0.5">Pan Across the Hole</span>
                      <p className="text-[11px] text-[#5C6353] leading-relaxed">
                        <strong className="text-[#1B291A]">Drag with one finger</strong> across the map surface to smoothly explore tees, hazards, doglegs, and greens.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] flex-shrink-0">
                      1-Finger Drag
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#DED9CC] flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-[#1B291A] block mb-0.5">Zoom In &amp; Out</span>
                      <p className="text-[11px] text-[#5C6353] leading-relaxed">
                        <strong className="text-[#1B291A]">Pinch with two fingers</strong> to inspect green slopes and hazard perimeters up close, or spread to view the entire hole.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] flex-shrink-0">
                      Pinch to Zoom
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#DED9CC] flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-[#1B291A] block mb-0.5">Dismiss Open Panels &amp; Drawers</span>
                      <p className="text-[11px] text-[#5C6353] leading-relaxed">
                        <strong className="text-[#1B291A]">Tap anywhere on the visible map</strong> to instantly collapse Shot Planner, Caddie Info, or Camera widgets.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] flex-shrink-0">
                      Map Tap
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Panels & Layout Management */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5A7A3A] mb-2.5 flex items-center gap-1.5">
                  <Touchpad className="w-3.5 h-3.5" />
                  <span>Mobile Panel Management &amp; Controls</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#DED9CC]">
                    <span className="font-bold block text-[#1B291A] mb-1">Mutual Panel Exclusivity</span>
                    <p className="text-[11px] text-[#5C6353] leading-relaxed">
                      Tapping <strong>Shot Planner</strong>, <strong>Caddie Info</strong>, <strong>Camera Focus</strong>, or <strong>Map Overlays</strong> automatically closes any other open panel so screens never overlap.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#DED9CC]">
                    <span className="font-bold block text-[#1B291A] mb-1">Header Fast Actions</span>
                    <p className="text-[11px] text-[#5C6353] leading-relaxed">
                      Use the top bar buttons to quickly switch between <strong>2D &amp; 3D Views</strong>, open this <strong>Controls Guide</strong>, or return <strong>Home</strong> to the course selector.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#DED9CC] sm:col-span-2">
                    <span className="font-bold block text-[#1B291A] mb-1">Drawer Scroll &amp; Swipe</span>
                    <p className="text-[11px] text-[#5C6353] leading-relaxed">
                      Drag up or down on the drawer handles or content to review elevation change graphs, club distances, wind forecasts, and hazard penalties.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === '2d' ? (
            <>
              {/* 2D Keyboard Controls */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5A7A3A] mb-2.5 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5" />
                  <span>2D Keyboard Camera Movement</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#2C3327]">Pan North / Up</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">W</kbd>
                      <span className="text-[10px] text-[#5C6353]">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">↑</kbd>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#2C3327]">Pan South / Down</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">S</kbd>
                      <span className="text-[10px] text-[#5C6353]">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">↓</kbd>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#2C3327]">Pan West / Left</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">A</kbd>
                      <span className="text-[10px] text-[#5C6353]">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">←</kbd>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#2C3327]">Pan East / Right</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">D</kbd>
                      <span className="text-[10px] text-[#5C6353]">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">→</kbd>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between sm:col-span-2">
                    <span className="text-xs font-medium text-[#2C3327]">Turbo Sprint Speed Boost (2×)</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#8FB062]/20 border border-[#8FB062]/40 rounded-lg text-[#2C421C] shadow-2xs">Shift</kbd>
                      <span className="text-xs font-bold text-[#5C6353]">+ WASD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2D Mouse & Touch Controls */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5A7A3A] mb-2.5 flex items-center gap-1.5">
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>2D Mouse &amp; Touch Gesture Actions</span>
                </h4>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Set Aim / Target Point</span>
                      <span className="text-[11px] text-[#5C6353]">Click or tap anywhere on the fairway or green to set the landing crosshair</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A]">Click / Tap</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Pan Terrain</span>
                      <span className="text-[11px] text-[#5C6353]">Drag with mouse or 1 finger across map surface freely</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A]">Click / Drag</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Zoom In / Out</span>
                      <span className="text-[11px] text-[#5C6353]">Pinch with 2 fingers on mobile or scroll mouse wheel</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A]">Scroll / Pinch</span>
                  </div>
                </div>
              </div>

              {/* 2D Strategic Features */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5A7A3A] mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2D Feature Highlights</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#2C3327]">
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC]">
                    <span className="font-bold block text-[#1B291A] mb-0.5">Camera Presets</span>
                    <p className="text-[11px] text-[#5C6353]">Use the Camera Focus widget in the top left to snap between Full Hole, Tee, Target, and Green.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC]">
                    <span className="font-bold block text-[#1B291A] mb-0.5">Practice Shot Studio ⚡</span>
                    <p className="text-[11px] text-[#5C6353]">Launch the Practice Shot panel to test shot execution with real wind deflection and club dispersion.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 3D Flight Controls */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5A7A3A] mb-2.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>3D Heading-Aware Flight Movement</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Fly Forward</span>
                      <span className="text-[10px] text-[#5C6353]">Flies along current camera heading</span>
                    </div>
                    <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">W</kbd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Fly Backward</span>
                      <span className="text-[10px] text-[#5C6353]">Flies reverse of heading</span>
                    </div>
                    <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">S</kbd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Strafe Left</span>
                      <span className="text-[10px] text-[#5C6353]">Lateral translation left</span>
                    </div>
                    <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">A</kbd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Strafe Right</span>
                      <span className="text-[10px] text-[#5C6353]">Lateral translation right</span>
                    </div>
                    <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">D</kbd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between sm:col-span-2">
                    <span className="text-xs font-medium text-[#2C3327]">Turbo Flight Boost (2.5×)</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#8FB062]/20 border border-[#8FB062]/40 rounded-lg text-[#2C421C] shadow-2xs">Shift</kbd>
                      <span className="text-xs font-bold text-[#5C6353]">+ WASD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3D Rotation & Pitch */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5A7A3A] mb-2.5 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>3D Heading Rotation &amp; Tilt Pitch</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#2C3327]">Rotate Heading Left</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">Q</kbd>
                      <span className="text-[10px] text-[#5C6353]">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">←</kbd>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#2C3327]">Rotate Heading Right</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">E</kbd>
                      <span className="text-[10px] text-[#5C6353]">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">→</kbd>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#2C3327]">Pitch Down (Bird's Eye)</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">R</kbd>
                      <span className="text-[10px] text-[#5C6353]">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">↑</kbd>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#2C3327]">Pitch Up (Horizon)</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">F</kbd>
                      <span className="text-[10px] text-[#5C6353]">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">↓</kbd>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#2C3327]">Zoom In / Lower Altitude</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">Z</kbd>
                      <span className="text-[10px] text-[#5C6353]">or</span>
                      <kbd className="px-1.5 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">PgUp</kbd>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#2C3327]">Zoom Out / Higher Altitude</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">X</kbd>
                      <span className="text-[10px] text-[#5C6353]">or</span>
                      <kbd className="px-1.5 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A] shadow-2xs">PgDn</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3D Touch & Gesture Controls */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5A7A3A] mb-2.5 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>3D Touch &amp; Drag Gestures</span>
                </h4>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Rotate View &amp; Heading</span>
                      <span className="text-[11px] text-[#5C6353]">Drag with 1 finger across the 3D photorealistic terrain to orbit angles</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A]">1-Finger Drag</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Adjust Tilt / Pitch</span>
                      <span className="text-[11px] text-[#5C6353]">Drag with 2 fingers up or down to tilt between ground-level and overhead bird's-eye views</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A]">2-Finger Drag</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Zoom Altitude</span>
                      <span className="text-[11px] text-[#5C6353]">Pinch open or close with 2 fingers to zoom closer to the green or ascend</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-mono font-bold bg-[#EBE7DD] border border-[#DED9CC] rounded-lg text-[#1B291A]">Pinch Gesture</span>
                  </div>
                </div>
              </div>

              {/* 3D Orbit & Cinematic Actions */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5A7A3A] mb-2.5 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  <span>3D Cinematic &amp; Camera Presets</span>
                </h4>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">360° Automated Aerial Orbit</span>
                      <span className="text-[11px] text-[#5C6353]">Click the Orbit button in the top bar to rotate smoothly around the green</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold bg-[#D4A31C]/20 text-[#8B6E30] border border-[#D4A31C]/40 rounded-lg">Top Bar Button</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DED9CC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1B291A] block">Instant Manual Takeover</span>
                      <span className="text-[11px] text-[#5C6353]">Pressing any WASD or arrow key immediately stops automated flyovers and returns control</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold bg-[#8FB062]/20 text-[#2C421C] border border-[#8FB062]/40 rounded-lg">Any Key</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-5 sm:py-3 bg-[#FAF8F5] border-t border-[#DED9CC]/80 flex items-center justify-between flex-shrink-0">
          <p className="text-[11px] text-[#5C6353]">
            Controls are automatically active on the map whenever an input field is not focused.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#8FB062] hover:bg-[#7CA352] text-[#152014] transition cursor-pointer shadow-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
