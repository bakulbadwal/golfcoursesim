import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Check, Sparkles } from 'lucide-react';

interface ApiKeyBarProps {
  apiKey: string;
  onUpdateApiKey: (key: string) => void;
}

export const ApiKeyBar: React.FC<ApiKeyBarProps> = ({
  apiKey,
  onUpdateApiKey,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputKey, setInputKey] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = inputKey.trim();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('VITE_GOOGLE_MAPS_API_KEY', trimmed);
    }
    onUpdateApiKey(trimmed);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setIsOpen(false);
    }, 1200);
  };

  const hasKey = Boolean(apiKey && apiKey.length > 5 && !apiKey.includes('MY_GOOGLE'));

  // Hide the "Maps Connected" icon/badge once an API key is active
  if (hasKey && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Header Key Status Pill */}
      <div className="flex items-center gap-2">
        <button
          id="btn-maps-api-config"
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
            hasKey
              ? 'bg-[#2D3E2B] text-[#F1EDE2] border-[#8FB062]/60 hover:bg-[#3E523B]'
              : 'bg-[#C2B280]/20 text-[#8B6E30] border-[#C2B280]/50 hover:bg-[#C2B280]/30 animate-pulse'
          }`}
          title="Google Maps API Key configuration"
          aria-label="Google Maps API Key configuration"
        >
          <Key className="w-3.5 h-3.5 text-[#8FB062]" />
          <span>{hasKey ? 'Maps Connected' : 'Connect Maps API'}</span>
        </button>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B291A]/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            id="api-key-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-key-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FDFCF9] border border-[#DED9CC] text-[#2C3327] rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 id="api-key-modal-title" className="text-lg font-bold text-[#1B291A] flex items-center gap-2 font-serif-natural">
                  <Key className="w-5 h-5 text-[#8FB062]" />
                  Google Maps Platform Key
                </h4>
                <p className="text-xs text-[#5C6353] mt-1">
                  Configure your Google Maps JavaScript API key or zero-cost Maps Demo Key.
                </p>
              </div>
              <button
                id="close-api-key-modal"
                onClick={() => setIsOpen(false)}
                className="text-[#5C6353] hover:text-[#1B291A] p-1.5 rounded-xl bg-[#F1EDE2] hover:bg-[#EBE7DD] transition cursor-pointer"
                aria-label="Close Google Maps API key dialog"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="input-maps-key" className="text-xs font-semibold text-[#1B291A]">
                API Key:
              </label>
              <input
                id="input-maps-key"
                type="password"
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full bg-[#F1EDE2] border border-[#DED9CC] rounded-xl px-3.5 py-2.5 text-sm text-[#1B291A] focus:outline-none focus:ring-2 focus:ring-[#8FB062] font-mono placeholder-[#5C6353]/50"
              />
            </div>

            <div className="bg-[#8FB062]/15 border border-[#8FB062]/30 rounded-2xl p-3.5 text-xs text-[#2C3327] flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-[#5A7A3A]">
                <Sparkles className="w-4 h-4 text-[#8FB062]" />
                <span>Zero-Cost Prototyping:</span>
              </div>
              <p className="leading-relaxed text-[11px] text-[#5C6353]">
                You can generate a free Maps Demo Key without a billing account or Cloud project:
              </p>
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noreferrer"
                className="text-[#5A7A3A] hover:text-[#1B291A] font-semibold underline flex items-center gap-1 text-xs"
              >
                <span>Get a free Google Maps Demo Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                id="btn-cancel-api-key"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5C6353] hover:bg-[#EBE7DD] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-save-api-key"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#8FB062] hover:bg-[#7CA352] text-[#142314] shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4 text-[#142314]" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Apply Key</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
