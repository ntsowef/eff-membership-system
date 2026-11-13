import type { SxProps, Theme } from '@mui/material/styles';

export const sectionCardSx: SxProps<Theme> = {
  p: { xs: 2.5, md: 3 },
  mb: 3,
  borderRadius: 2.5,
  border: '1px solid rgba(0, 0, 0, 0.12)',
  background: '#FFFFFF',
};

export const summaryBannerSx: SxProps<Theme> = {
  mb: 3,
  borderRadius: 2.5,
  border: '1px solid rgba(220, 20, 60, 0.25)',
  bgcolor: 'rgba(220, 20, 60, 0.04)',
};

export const backButtonSx: SxProps<Theme> = {
  borderColor: 'rgba(220, 20, 60, 0.3)',
  color: '#DC143C',
  fontWeight: 600,
  px: 3,
  py: 1.5,
  borderRadius: 3,
  textTransform: 'none',
  fontSize: '1rem',
  transition: 'transform 0.25s ease, border-color 0.25s ease, background-color 0.25s ease',
  '&:hover': {
    borderColor: '#DC143C',
    backgroundColor: 'rgba(220, 20, 60, 0.05)',
    transform: 'translateX(-3px)',
  },
  '&:disabled': {
    borderColor: 'rgba(0, 0, 0, 0.12)',
    color: 'rgba(0, 0, 0, 0.26)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': {
      transform: 'none',
    },
  },
};

export const cancelButtonSx: SxProps<Theme> = {
  borderColor: 'rgba(0, 0, 0, 0.23)',
  color: 'text.secondary',
  fontWeight: 600,
  px: 3,
  py: 1.5,
  borderRadius: 3,
  textTransform: 'none',
  fontSize: '1rem',
  transition: 'border-color 0.25s ease, background-color 0.25s ease',
  '&:hover': {
    borderColor: 'rgba(0, 0, 0, 0.5)',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
};

export const primaryActionSx: SxProps<Theme> = {
  background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
  color: 'white',
  fontWeight: 700,
  px: 4,
  py: 1.6,
  textTransform: 'none',
  borderRadius: 3,
  fontSize: '1.02rem',
  boxShadow: '0 6px 20px rgba(220, 20, 60, 0.4)',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)',
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 28px rgba(220, 20, 60, 0.5)',
  },
  '&:disabled': {
    background: 'rgba(0, 0, 0, 0.12)',
    color: 'rgba(0, 0, 0, 0.26)',
    boxShadow: 'none',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': {
      transform: 'none',
    },
  },
};

export const finalSubmitActionSx: SxProps<Theme> = {
  background: 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
  color: 'white',
  fontWeight: 700,
  px: 4,
  py: 1.6,
  textTransform: 'none',
  borderRadius: 3,
  fontSize: '1.02rem',
  boxShadow: '0 6px 20px rgba(139, 0, 0, 0.4)',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #6B0000 0%, #4B0000 100%)',
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 28px rgba(139, 0, 0, 0.5)',
  },
  '&:disabled': {
    background: 'rgba(0, 0, 0, 0.12)',
    color: 'rgba(0, 0, 0, 0.26)',
    boxShadow: 'none',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': {
      transform: 'none',
    },
  },
};

