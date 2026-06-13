import React from 'react';

export function OctogenLogo({ className }: { className?: string }) {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      className={className}
    >
      <g stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Central hole */}
        <circle cx="50" cy="50" r="8" />
        
        {/* Main gear body circle */}
        <circle cx="50" cy="50" r="18" />

        {angles.map((angle) => (
          <g key={angle} transform={`rotate(${angle} 50 50)`}>
            {/* Gear tooth path */}
            <path d="M 44 33 L 44 26 L 56 26 L 56 33" />
            
            {/* Spoke line */}
            <line x1="50" y1="26" x2="50" y2="14" />
            
            {/* Outer node circle */}
            <circle cx="50" cy="8" r="6" />
          </g>
        ))}
      </g>
    </svg>
  );
}
