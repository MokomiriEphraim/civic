import React from 'react';
import { X, MapPin, Navigation, Layers } from 'lucide-react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: string;
  address?: string;
  hazardTitle?: string;
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  coordinates,
  address = 'Kloof Nek Rd & Camp St, Cape Town',
  hazardTitle = 'Road Hazard (Pothole)',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#234E35] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Hazard GPS Location</h3>
              <p className="text-xs text-slate-500 font-mono">{coordinates}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Display (Simulated Vector Street Map with Pin) */}
        <div className="relative h-64 sm:h-72 w-full bg-[#E5ECE5] overflow-hidden">
          {/* Stylized Street Grid Background */}
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="street-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <rect width="60" height="60" fill="#E8EFE8" />
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#D2DFD2" strokeWidth="2" />
                <circle cx="30" cy="30" r="1.5" fill="#CAD8CA" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#street-grid)" />

            {/* Main Arterial Avenues */}
            <path
              d="M-20 80 Q 200 120 500 90"
              stroke="#FFF"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M-20 80 Q 200 120 500 90"
              stroke="#CBD5E1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />

            <path
              d="M180 -10 L 260 300"
              stroke="#FFF"
              strokeWidth="12"
              fill="none"
            />
            <path
              d="M340 -10 L 320 300"
              stroke="#FFF"
              strokeWidth="10"
              fill="none"
            />

            {/* Park / Green Reserve */}
            <path
              d="M40 140 Q 90 120 130 160 Q 150 220 80 240 Z"
              fill="#BFDEBE"
              opacity="0.8"
            />
            <text x="70" y="180" fill="#2E6F40" fontSize="10" fontWeight="bold">
              City Park
            </text>

            {/* Street labels */}
            <text x="70" y="75" fill="#64748B" fontSize="9" fontWeight="600" transform="rotate(3 70 75)">
              Kloof Nek Rd
            </text>
            <text x="210" y="160" fill="#64748B" fontSize="9" fontWeight="600" transform="rotate(74 210 160)">
              Camp St
            </text>
          </svg>

          {/* Center Marker with Pulsing Ripple */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <span className="relative flex h-8 w-8 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-8 w-8 bg-[#E65A2C] text-white items-center justify-center shadow-lg border-2 border-white">
                <MapPin className="w-4 h-4 fill-white" />
              </span>
            </span>
            <div className="mt-1 px-2.5 py-1 bg-slate-900/90 text-white rounded-md text-[11px] font-semibold whitespace-nowrap shadow-md">
              {hazardTitle}
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-white rounded-lg shadow-sm border border-slate-200 p-1">
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-700">
              <Navigation className="w-4 h-4 text-emerald-700" />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-700">
              <Layers className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div className="absolute bottom-2 left-3 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-slate-600 font-medium">
            Cape Town Ward 77 • GPS Verified
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-700">Reported Address:</span>
            <p className="text-slate-500">{address}</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#234E35] text-white font-medium rounded-lg hover:bg-[#1A3D29] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
