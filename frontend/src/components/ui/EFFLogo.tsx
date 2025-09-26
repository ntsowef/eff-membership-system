import React from 'react';
import { Box, SvgIcon } from '@mui/material';

interface EFFLogoProps {
  size?: number;
  color?: string;
}

const EFFLogo: React.FC<EFFLogoProps> = ({ size = 40, color = '#FE0000' }) => {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SvgIcon
        sx={{
          width: size,
          height: size,
          color: color,
        }}
        viewBox="0 0 100 100"
      >
        {/* EFF-inspired logo design */}
        <defs>
          <linearGradient id="effGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FE0000" />
            <stop offset="50%" stopColor="#E20202" />
            <stop offset="100%" stopColor="#FE0000" />
          </linearGradient>
        </defs>
        
        {/* Outer circle */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#effGradient)"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
        
        {/* Inner design - stylized "EFF" */}
        <g fill="#FFFFFF" fontFamily="Arial, sans-serif" fontWeight="bold">
          {/* E */}
          <rect x="15" y="25" width="15" height="4" />
          <rect x="15" y="25" width="4" height="20" />
          <rect x="15" y="35" width="12" height="4" />
          <rect x="15" y="45" width="15" height="4" />
          
          {/* F */}
          <rect x="35" y="25" width="15" height="4" />
          <rect x="35" y="25" width="4" height="20" />
          <rect x="35" y="35" width="12" height="4" />
          
          {/* F */}
          <rect x="55" y="25" width="15" height="4" />
          <rect x="55" y="25" width="4" height="20" />
          <rect x="55" y="35" width="12" height="4" />
        </g>
        
        {/* Bottom text */}
        <text
          x="50"
          y="70"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="8"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
        >
          FREEDOM
        </text>
        
        {/* Star accent */}
        <polygon
          points="50,15 52,21 58,21 53,25 55,31 50,27 45,31 47,25 42,21 48,21"
          fill="#FFAB00"
          stroke="#FFFFFF"
          strokeWidth="0.5"
        />
      </SvgIcon>
    </Box>
  );
};

export default EFFLogo;
