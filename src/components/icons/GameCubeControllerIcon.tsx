import React from 'react';

interface GameCubeControllerIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

const GameCubeControllerIcon: React.FC<GameCubeControllerIconProps> = ({ size = 48, color = '#6C5CE7', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    {...props}
  >
    {/* Main controller body - more detailed shape */}
    <path
      d="M 8 16 Q 8 8 16 8 L 32 8 Q 40 8 40 16 L 40 28 Q 40 36 32 36 L 16 36 Q 8 36 8 28 Z"
      fill={color}
      stroke="#5540D9"
      strokeWidth="1.5"
    />
    
    {/* Left grip detail */}
    <ellipse cx="12" cy="22" rx="3" ry="8" fill="#5540D9" opacity="0.6" />
    <ellipse cx="12" cy="22" rx="2" ry="6" fill="rgba(255,255,255,0.1)" />
    
    {/* Right grip detail */}
    <ellipse cx="36" cy="22" rx="3" ry="8" fill="#5540D9" opacity="0.6" />
    <ellipse cx="36" cy="22" rx="2" ry="6" fill="rgba(255,255,255,0.1)" />
    
    {/* Left analog stick - more detailed */}
    <circle cx="14" cy="18" r="4" fill="#5540D9" stroke="#8B7AE8" strokeWidth="1" />
    <circle cx="14" cy="18" r="3" fill="rgba(139,122,232,0.5)" />
    <circle cx="14" cy="18" r="2" fill="rgba(255,255,255,0.4)" />
    <circle cx="14" cy="17.5" r="1" fill="rgba(255,255,255,0.6)" />
    
    {/* Right analog stick - more detailed */}
    <circle cx="34" cy="18" r="4" fill="#5540D9" stroke="#8B7AE8" strokeWidth="1" />
    <circle cx="34" cy="18" r="3" fill="rgba(139,122,232,0.5)" />
    <circle cx="34" cy="18" r="2" fill="rgba(255,255,255,0.4)" />
    <circle cx="34" cy="17.5" r="1" fill="rgba(255,255,255,0.6)" />
    
    {/* D-pad - more detailed */}
    <path d="M 10 22 L 12 20 L 14 22 L 14 26 L 12 28 L 10 26 Z" fill="#5540D9" stroke="#8B7AE8" strokeWidth="0.8" />
    <rect x="11" y="20" width="2" height="2" rx="0.5" fill="#8B7AE8" opacity="0.6" />
    <rect x="11" y="24" width="2" height="2" rx="0.5" fill="#8B7AE8" opacity="0.6" />
    <rect x="9" y="22" width="2" height="2" rx="0.5" fill="#8B7AE8" opacity="0.6" />
    <rect x="13" y="22" width="2" height="2" rx="0.5" fill="#8B7AE8" opacity="0.6" />
    
    {/* A button - larger and more detailed */}
    <circle cx="32" cy="28" r="4" fill="#E84393" stroke="#F06292" strokeWidth="1" />
    <circle cx="32" cy="28" r="3" fill="rgba(255,255,255,0.3)" />
    <circle cx="32" cy="27.5" r="2" fill="rgba(255,255,255,0.5)" />
    <text x="32" y="29" fontSize="6" fill="#FFFFFF" textAnchor="middle" fontWeight="bold" fontFamily="Arial">A</text>
    
    {/* B button - more detailed */}
    <circle cx="27" cy="31" r="3" fill="#00CEC9" stroke="#00B894" strokeWidth="1" />
    <circle cx="27" cy="31" r="2.2" fill="rgba(255,255,255,0.3)" />
    <circle cx="27" cy="30.5" r="1.5" fill="rgba(255,255,255,0.5)" />
    <text x="27" y="32" fontSize="5" fill="#FFFFFF" textAnchor="middle" fontWeight="bold" fontFamily="Arial">B</text>
    
    {/* X button - more detailed */}
    <circle cx="37" cy="31" r="3" fill="#E84393" stroke="#F06292" strokeWidth="1" />
    <circle cx="37" cy="31" r="2.2" fill="rgba(255,255,255,0.3)" />
    <circle cx="37" cy="30.5" r="1.5" fill="rgba(255,255,255,0.5)" />
    <text x="37" y="32" fontSize="5" fill="#FFFFFF" textAnchor="middle" fontWeight="bold" fontFamily="Arial">X</text>
    
    {/* Y button - more detailed */}
    <circle cx="32" cy="22" r="3" fill="#E84393" stroke="#F06292" strokeWidth="1" />
    <circle cx="32" cy="22" r="2.2" fill="rgba(255,255,255,0.3)" />
    <circle cx="32" cy="21.5" r="1.5" fill="rgba(255,255,255,0.5)" />
    <text x="32" y="23" fontSize="5" fill="#FFFFFF" textAnchor="middle" fontWeight="bold" fontFamily="Arial">Y</text>
    
    {/* Z button (on top) */}
    <ellipse cx="38" cy="10" rx="2.5" ry="1.5" fill="#5540D9" stroke="#8B7AE8" strokeWidth="0.8" />
    <ellipse cx="38" cy="10" rx="2" ry="1.2" fill="rgba(139,122,232,0.5)" />
    <text x="38" y="10.5" fontSize="4" fill="#FFFFFF" textAnchor="middle" fontWeight="bold" fontFamily="Arial">Z</text>
    
    {/* L trigger button */}
    <ellipse cx="10" cy="10" rx="2.5" ry="1.5" fill="#5540D9" stroke="#8B7AE8" strokeWidth="0.8" />
    <ellipse cx="10" cy="10" rx="2" ry="1.2" fill="rgba(139,122,232,0.5)" />
    <text x="10" y="10.5" fontSize="4" fill="#FFFFFF" textAnchor="middle" fontWeight="bold" fontFamily="Arial">L</text>
    
    {/* R trigger button */}
    <ellipse cx="38" cy="10" rx="2.5" ry="1.5" fill="#5540D9" stroke="#8B7AE8" strokeWidth="0.8" />
    <ellipse cx="38" cy="10" rx="2" ry="1.2" fill="rgba(139,122,232,0.5)" />
    <text x="38" y="10.5" fontSize="4" fill="#FFFFFF" textAnchor="middle" fontWeight="bold" fontFamily="Arial">R</text>
    
    {/* Start button */}
    <ellipse cx="24" cy="20" rx="2" ry="1.2" fill="#5540D9" stroke="#8B7AE8" strokeWidth="0.8" />
    <ellipse cx="24" cy="20" rx="1.5" ry="1" fill="rgba(139,122,232,0.5)" />
    
    {/* Controller grip texture/details */}
    <path d="M 8 18 L 8 26 Q 8 28 10 28 L 10 18 Q 8 18 8 18 Z" fill="rgba(0,0,0,0.15)" />
    <path d="M 40 18 L 40 26 Q 40 28 38 28 L 38 18 Q 40 18 40 18 Z" fill="rgba(0,0,0,0.15)" />
    
    {/* Additional shading/highlights */}
    <path d="M 16 8 L 32 8 Q 36 8 38 12 L 38 16" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
    <path d="M 8 16 L 8 12 Q 8 10 10 8 L 16 8" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
  </svg>
);

export default GameCubeControllerIcon;

