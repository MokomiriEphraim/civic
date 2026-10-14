import React from 'react';

interface CivicLogoProps {
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  dark?: boolean;
}

export const CivicLogo: React.FC<CivicLogoProps> = ({
  showTagline = true,
  className = '',
  onClick,
  dark = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Stylized Tree / Leaf emblem */}
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#2E6F40] to-[#184528] flex items-center justify-center shadow-sm p-1.5 flex-shrink-0 border border-[#48875A]/30">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Trunk and branches */}
          <path
            d="M16 26V13M16 19L21 14M16 16L11 11M16 21L12 18"
            stroke="#F5A87B"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Leaves canopy */}
          <circle cx="16" cy="9" r="4.2" fill="#75C384" />
          <circle cx="11" cy="12" r="3.4" fill="#52A765" />
          <circle cx="21" cy="12" r="3.4" fill="#88D595" />
          <circle cx="16" cy="14" r="3" fill="#3D8F50" />
          {/* Circular frame accent */}
          <circle
            cx="16"
            cy="16"
            r="14"
            stroke="#A3D9AE"
            strokeWidth="1.2"
            strokeDasharray="2 3"
            opacity="0.6"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-bold text-xl sm:text-2xl tracking-tight leading-none ${
            dark ? 'text-white' : 'text-[#183B24]'
          }`}
          style={{ fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif" }}
        >
          CivicFix
        </span>
        {showTagline && (
          <span
            className={`text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5 ${
              dark ? 'text-emerald-200/80' : 'text-slate-500'
            }`}
          >
            Safer Streets. Stronger Communities.
          </span>
        )}
      </div>
    </div>
  );
};
