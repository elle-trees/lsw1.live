import React from 'react';

interface GameCubeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

const GameCubeIcon: React.FC<GameCubeIconProps> = ({ size = 48, color = '#6C5CE7', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    {...props}
  >
    {/* Main GameCube body */}
    <path
      d="M 8 12 L 40 12 L 36 36 L 12 36 Z"
      fill={color}
      stroke="#5540D9"
      strokeWidth="1.5"
    />
    
    {/* Top surface with perspective */}
    <path
      d="M 8 12 L 12 8 L 44 8 L 40 12 Z"
      fill="#8B7AE8"
      stroke="#5540D9"
      strokeWidth="1.5"
    />
    
    {/* Left side */}
    <path
      d="M 8 12 L 12 8 L 12 36 L 8 36 Z"
      fill="#5540D9"
      stroke="#5540D9"
      strokeWidth="1"
    />
    
    {/* Right side */}
    <path
      d="M 40 12 L 44 8 L 44 36 L 40 36 Z"
      fill="#5540D9"
      stroke="#5540D9"
      strokeWidth="1"
    />
    
    {/* Disc slot */}
    <ellipse cx="24" cy="24" rx="8" ry="6" fill="#2D2D3A" stroke="#1A1A24" strokeWidth="1" />
    <ellipse cx="24" cy="24" rx="7" ry="5" fill="#5540D9" opacity="0.3" />
    <ellipse cx="24" cy="24" rx="5" ry="3.5" fill="#1A1A24" />
    <circle cx="24" cy="24" r="1.5" fill="#5540D9" opacity="0.5" />
    
    {/* Power button */}
    <circle cx="38" cy="22" r="2.5" fill="#2D2D3A" stroke="#5540D9" strokeWidth="0.8" />
    <circle cx="38" cy="22" r="1.8" fill="#E84393" opacity="0.7" />
    <circle cx="38" cy="22" r="1" fill="#F06292" />
    
    {/* Reset button */}
    <rect x="34" y="26" width="4" height="2" rx="0.5" fill="#2D2D3A" stroke="#5540D9" strokeWidth="0.6" />
    <rect x="34.5" y="26.5" width="3" height="1" rx="0.3" fill="#5540D9" opacity="0.6" />
    
    {/* GameCube logo text area */}
    <rect x="10" y="30" width="10" height="4" rx="0.5" fill="#5540D9" opacity="0.4" />
    <text x="15" y="32.5" fontSize="3" fill="#FFFFFF" textAnchor="middle" fontWeight="bold" fontFamily="Arial">GAMECUBE</text>
    
    {/* Handle/grip on top */}
    <ellipse cx="24" cy="10" rx="6" ry="2.5" fill="#5540D9" stroke="#8B7AE8" strokeWidth="0.8" />
    <ellipse cx="24" cy="10" rx="5" ry="2" fill="rgba(139,122,232,0.3)" />
    
    {/* Ventilation slots */}
    <rect x="10" y="14" width="8" height="1" rx="0.3" fill="#2D2D3A" opacity="0.6" />
    <rect x="10" y="16" width="8" height="1" rx="0.3" fill="#2D2D3A" opacity="0.6" />
    <rect x="30" y="14" width="8" height="1" rx="0.3" fill="#2D2D3A" opacity="0.6" />
    <rect x="30" y="16" width="8" height="1" rx="0.3" fill="#2D2D3A" opacity="0.6" />
    
    {/* Ports/connections on front */}
    <rect x="12" y="36" width="4" height="2" rx="0.3" fill="#2D2D3A" />
    <rect x="18" y="36" width="4" height="2" rx="0.3" fill="#2D2D3A" />
    <rect x="26" y="36" width="4" height="2" rx="0.3" fill="#2D2D3A" />
    <rect x="32" y="36" width="4" height="2" rx="0.3" fill="#2D2D3A" />
    
    {/* Highlight/shine on top surface */}
    <path d="M 12 8 L 40 8 Q 42 8 42 10 L 40 12" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
    
    {/* Shadow on bottom */}
    <path d="M 12 36 L 36 36 L 40 38 L 8 38 Z" fill="rgba(0,0,0,0.2)" />
  </svg>
);

export default GameCubeIcon;

