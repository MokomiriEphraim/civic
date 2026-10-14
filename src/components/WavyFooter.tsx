import React from 'react';

interface WavyFooterProps {
  variant?: 'landing' | 'submit' | 'minimal';
  text?: string;
  className?: string;
}

export const WavyFooter: React.FC<WavyFooterProps> = ({
  variant = 'landing',
  text,
  className = '',
}) => {
  const displayText =
    text ||
    (variant === 'submit'
      ? 'Together we keep our city safe'
      : 'CLEANER CITIES  /  SAFER COMMUNITIES  /  A BRIGHTER TOMORROW');

  return (
    <div className={`relative w-full overflow-hidden select-none pointer-events-none mt-auto ${className}`}>
      {/* City Line Art Illustration */}
      <div className="absolute inset-x-0 bottom-6 sm:bottom-8 z-10 flex flex-col items-center justify-end px-4">
        {/* Cityscape Silhouette SVG */}
        <svg
          viewBox="0 0 1200 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full max-w-4xl h-14 sm:h-20 opacity-85 text-emerald-100/90"
        >
          {/* Ground baseline */}
          <line x1="60" y1="110" x2="1140" y2="110" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />

          {/* Left House cluster */}
          <path d="M120 110V70L145 52L170 70V110H120Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="135" y="80" width="8" height="12" stroke="currentColor" strokeWidth="1.2" />
          <rect x="150" y="80" width="8" height="8" stroke="currentColor" strokeWidth="1.2" />

          {/* Small trees */}
          <path d="M100 110V88M92 88C92 82 96 78 100 78C104 78 108 82 108 88C108 94 92 94 92 88Z" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="190" cy="86" r="10" stroke="currentColor" strokeWidth="1.4" />
          <line x1="190" y1="96" x2="190" y2="110" stroke="currentColor" strokeWidth="1.4" />

          {/* Street lamp */}
          <path d="M215 110V68H225M225 68V73" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="225" cy="76" r="2.5" fill="currentColor" fillOpacity="0.8" />

          {/* Mid-rise apartments */}
          <rect x="245" y="45" width="40" height="65" stroke="currentColor" strokeWidth="1.5" />
          <rect x="253" y="55" width="8" height="8" stroke="currentColor" strokeWidth="1" />
          <rect x="269" y="55" width="8" height="8" stroke="currentColor" strokeWidth="1" />
          <rect x="253" y="70" width="8" height="8" stroke="currentColor" strokeWidth="1" />
          <rect x="269" y="70" width="8" height="8" stroke="currentColor" strokeWidth="1" />
          <rect x="253" y="85" width="8" height="8" stroke="currentColor" strokeWidth="1" />
          <rect x="269" y="85" width="8" height="8" stroke="currentColor" strokeWidth="1" />

          {/* Center Civic Tower */}
          <path d="M520 110V40L540 25L560 40V110H520Z" stroke="currentColor" strokeWidth="1.5" />
          <line x1="540" y1="25" x2="540" y2="15" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="540" cy="50" r="5" stroke="currentColor" strokeWidth="1.2" />
          <rect x="532" y="65" width="6" height="8" stroke="currentColor" strokeWidth="1.2" />
          <rect x="542" y="65" width="6" height="8" stroke="currentColor" strokeWidth="1.2" />
          <rect x="532" y="80" width="6" height="8" stroke="currentColor" strokeWidth="1.2" />
          <rect x="542" y="80" width="6" height="8" stroke="currentColor" strokeWidth="1.2" />
          <rect x="534" y="96" width="12" height="14" stroke="currentColor" strokeWidth="1.2" />

          {/* Trees around center */}
          <circle cx="585" cy="80" r="14" stroke="currentColor" strokeWidth="1.4" />
          <line x1="585" y1="94" x2="585" y2="110" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="475" cy="85" r="12" stroke="currentColor" strokeWidth="1.4" />
          <line x1="475" y1="97" x2="475" y2="110" stroke="currentColor" strokeWidth="1.4" />

          {/* Right buildings */}
          <rect x="910" y="55" width="35" height="55" stroke="currentColor" strokeWidth="1.5" />
          <rect x="918" y="65" width="6" height="6" stroke="currentColor" strokeWidth="1" />
          <rect x="930" y="65" width="6" height="6" stroke="currentColor" strokeWidth="1" />
          <rect x="918" y="78" width="6" height="6" stroke="currentColor" strokeWidth="1" />
          <rect x="930" y="78" width="6" height="6" stroke="currentColor" strokeWidth="1" />

          <path d="M960 110V72L980 58L1000 72V110H960Z" stroke="currentColor" strokeWidth="1.5" />
          <rect x="975" y="82" width="10" height="12" stroke="currentColor" strokeWidth="1.2" />

          <circle cx="1030" cy="85" r="11" stroke="currentColor" strokeWidth="1.4" />
          <line x1="1030" y1="96" x2="1030" y2="110" stroke="currentColor" strokeWidth="1.4" />
        </svg>

        {/* Tagline text matching mockup */}
        <p className="text-[10px] sm:text-xs font-semibold tracking-widest text-[#E1EFE4] uppercase text-center mt-1">
          {displayText}
        </p>
      </div>

      {/* Layered Organic Waves SVG */}
      <svg
        viewBox="0 0 1440 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-28 sm:h-36 block align-bottom"
        preserveAspectRatio="none"
      >
        {/* Layer 0: Background Warm Terracotta Hill Wave */}
        <path
          d="M0 120C240 120 420 70 780 100C1100 125 1280 80 1440 70V180H0V120Z"
          fill="#DC572A"
          fillOpacity="0.9"
        />

        {/* Layer 1: Mid Green Wave */}
        <path
          d="M0 100C300 75 520 140 860 110C1180 85 1320 125 1440 115V180H0V100Z"
          fill="#27613C"
        />

        {/* Layer 2: Foreground Forest Green Wave */}
        <path
          d="M0 125C260 90 460 140 760 120C1060 100 1280 145 1440 135V180H0V125Z"
          fill="#1A4329"
        />
      </svg>
    </div>
  );
};
