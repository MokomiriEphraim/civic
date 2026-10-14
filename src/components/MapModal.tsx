import React from 'react';
import { X, MapPin, ExternalLink } from 'lucide-react';

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
  address,
  hazardTitle,
}) => {
  if (!isOpen) return null;

  const coordinateMatch = coordinates.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
  );
  const latitude = coordinateMatch ? Number(coordinateMatch[1]) : null;
  const longitude = coordinateMatch ? Number(coordinateMatch[2]) : null;
  const hasCoordinates =
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(address || coordinates)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-dialog-title"
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#234E35] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 id="map-dialog-title" className="font-bold text-slate-800 text-sm">Reported Location</h3>
              <p className="text-xs text-slate-500 font-mono">{coordinates}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close map dialog"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-64 w-full bg-[#E5ECE5] px-6 py-10 flex flex-col items-center justify-center text-center">
          <MapPin className="w-10 h-10 text-[#E65A2C] mb-3" />
          <p className="font-semibold text-slate-800">{hazardTitle || 'Reported hazard'}</p>
          <p className="mt-1 text-sm text-slate-600">{address || coordinates}</p>
          <p className="mt-2 text-xs text-slate-500">
            {hasCoordinates ? 'Open the reported coordinates on the map.' : 'Search the reported location on the map.'}
          </p>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#234E35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1A3D29]"
          >
            <ExternalLink className="w-4 h-4" />
            Open in OpenStreetMap
          </a>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-700">Reported Address:</span>
            <p className="text-slate-500">{address || 'Address not provided'}</p>
          </div>
          <button
            type="button"
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
