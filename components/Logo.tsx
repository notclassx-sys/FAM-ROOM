
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className = '', showText = true, size = 'md' }) => {
  const sizes = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-24',
    xl: 'h-32'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg 
        viewBox="0 0 512 512" 
        className={`${sizes[size]} w-auto drop-shadow-lg`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4FB9FF" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="greenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A3E635" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
          <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#84CC16" />
            <stop offset="100%" stopColor="#4D7C0F" />
          </linearGradient>
        </defs>

        {/* Outer Heart Container */}
        <g>
          {/* Blue Left Half */}
          <path 
            d="M256 460C256 460 60 380 60 210C60 120 160 80 256 180V460Z" 
            fill="url(#blueGrad)" 
          />
          {/* Green Right Half */}
          <path 
            d="M256 460C256 460 452 380 452 210C452 120 352 80 256 180V460Z" 
            fill="url(#greenGrad)" 
          />
          
          {/* House Top Shape Clipping (White Heart Center) */}
          <path 
            d="M256 430C256 430 140 360 140 230C140 160 210 140 256 195C302 140 372 160 372 230C372 360 256 430 256 430Z" 
            fill="white"
          />

          {/* Location Pin */}
          <path 
            d="M256 180C225 180 200 205 200 236C200 280 256 340 256 340C256 340 312 280 312 236C312 205 287 180 256 180Z" 
            fill="url(#pinGrad)" 
          />
          <circle cx="256" cy="236" r="10" fill="white" opacity="0.4" />

          {/* Windows - Blue Side */}
          <g fill="#2563EB" opacity="0.8">
            <rect x="175" y="250" width="18" height="18" rx="4" />
            <rect x="200" y="250" width="18" height="18" rx="4" />
            <rect x="175" y="275" width="18" height="18" rx="4" />
            <rect x="200" y="275" width="18" height="18" rx="4" />
          </g>

          {/* Windows - Green Side */}
          <g fill="#22C55E" opacity="0.8">
            <rect x="294" y="250" width="18" height="18" rx="4" />
            <rect x="319" y="250" width="18" height="18" rx="4" />
            <rect x="294" y="275" width="18" height="18" rx="4" />
            <rect x="319" y="275" width="18" height="18" rx="4" />
          </g>
        </g>

        {/* Roof Accent Detail */}
        <path d="M60 210L100 210L256 140" stroke="white" strokeWidth="15" strokeLinecap="round" opacity="0.2" />
        <path d="M452 210L412 210L256 140" stroke="white" strokeWidth="15" strokeLinecap="round" opacity="0.2" />
      </svg>
      
      {showText && (
        <div className={`mt-2 font-black tracking-tighter ${textSizes[size]}`}>
          <span className="text-blue-600">Fam</span>
          <span className="text-green-600 ml-1">Room</span>
        </div>
      )}
    </div>
  );
};
