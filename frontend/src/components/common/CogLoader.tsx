import React from 'react';
import { Box, Typography, styled, keyframes } from '@mui/material';

// Keyframe animations
const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const rotateLeft = keyframes`
  from { transform: rotate(16deg); }
  to { transform: rotate(376deg); }
`;

const rotateBottom = keyframes`
  from { transform: rotate(4deg); }
  to { transform: rotate(364deg); }
`;

// Styled components
const LoaderContainer = styled(Box)(() => ({
  position: 'relative',
  width: '120px',
  height: '120px',
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const LoaderOverlay = styled(Box)(({ theme }) => ({
  width: '100px',
  height: '100px',
  background: 'transparent',
  boxShadow: `0px 0px 0px 1000px ${theme.palette.background.paper}cc, 0px 0px 12px 0px rgba(0, 0, 0, 0.1) inset`,
  borderRadius: '50%',
  position: 'absolute',
  zIndex: 1,
}));

const CogsContainer = styled(Box)({
  position: 'absolute',
  width: '80px',
  height: '80px',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 0,
});

const TopCog = styled(Box)(() => ({
  position: 'absolute',
  width: '80px',
  height: '80px',
  transformOrigin: '40px 40px',
  animation: `${rotate} 8s infinite linear`,
  top: '-10px',
  left: '0px',
}));

const LeftCog = styled(Box)(() => ({
  position: 'absolute',
  width: '64px',
  height: '64px',
  transform: 'rotate(16deg)',
  top: '22px',
  left: '-19px',
  transformOrigin: '32px 32px',
  animation: `${rotateLeft} 8s 0.1s infinite reverse linear`,
}));

const BottomCog = styled(Box)(() => ({
  position: 'absolute',
  width: '48px',
  height: '48px',
  top: '16px',
  left: '63px',
  transformOrigin: '24px 24px',
  animation: `${rotateBottom} 8.2s 0.4s infinite linear`,
  transform: 'rotate(4deg)',
}));

const CogPart = styled(Box)<{ size: number; color: string }>(({ size, color }) => ({
  width: `${size}px`,
  height: `${size}px`,
  borderRadius: `${size * 0.1}px`,
  position: 'absolute',
  background: color,
  '&:nth-of-type(1)': { transform: 'rotate(30deg)' },
  '&:nth-of-type(2)': { transform: 'rotate(60deg)' },
  '&:nth-of-type(3)': { transform: 'rotate(90deg)' },
}));

const CogHole = styled(Box)<{ size: number }>(({ size }) => ({
  width: `${size / 2}px`,
  height: `${size / 2}px`,
  borderRadius: '50%',
  background: 'white',
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
}));

const LoadingText = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  bottom: '-30px',
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: '12px',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '1px',
}));

interface CogLoaderProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  text?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  };
}

const CogLoader: React.FC<CogLoaderProps> = ({ 
  size = 'medium', 
  showText = true, 
  text = 'Processing',
  colors = {}
}) => {
  const sizeMap = {
    small: { container: 80, top: 60, left: 48, bottom: 36 },
    medium: { container: 120, top: 80, left: 64, bottom: 48 },
    large: { container: 160, top: 100, left: 80, bottom: 60 }
  };

  const dimensions = sizeMap[size];
  
  const defaultColors = {
    primary: colors.primary || '#f98db9',
    secondary: colors.secondary || '#97ddff', 
    tertiary: colors.tertiary || '#ffcd66'
  };

  return (
    <LoaderContainer sx={{ width: dimensions.container, height: dimensions.container }}>
      <LoaderOverlay />
      <CogsContainer>
        {/* Top Cog */}
        <TopCog>
          <CogPart size={dimensions.top} color={defaultColors.primary} />
          <CogPart size={dimensions.top} color={defaultColors.primary} />
          <CogPart size={dimensions.top} color={defaultColors.primary} />
          <CogHole size={dimensions.top} />
        </TopCog>

        {/* Left Cog */}
        <LeftCog>
          <CogPart size={dimensions.left} color={defaultColors.secondary} />
          <CogPart size={dimensions.left} color={defaultColors.secondary} />
          <CogPart size={dimensions.left} color={defaultColors.secondary} />
          <CogHole size={dimensions.left} />
        </LeftCog>

        {/* Bottom Cog */}
        <BottomCog>
          <CogPart size={dimensions.bottom} color={defaultColors.tertiary} />
          <CogPart size={dimensions.bottom} color={defaultColors.tertiary} />
          <CogPart size={dimensions.bottom} color={defaultColors.tertiary} />
          <CogHole size={dimensions.bottom} />
        </BottomCog>
      </CogsContainer>

      {showText && (
        <LoadingText variant="caption">
          {text}
        </LoadingText>
      )}
    </LoaderContainer>
  );
};

export default CogLoader;
