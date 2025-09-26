import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

// EFF-Inspired Brand Colors
const brandColors = {
  primary: {
    main: '#FE0000', // EFF Red - dominant color
    light: '#FF4444', // Lighter red for hover states
    dark: '#E20202',  // Darker red for active states
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#055305', // EFF Green - secondary color
    light: '#2E7D2E', // Lighter green
    dark: '#033303',  // Darker green
    contrastText: '#ffffff',
  },
  success: {
    main: '#4CAF50', // Modern green for success states
    light: '#81C784',
    dark: '#388E3C',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#FFAB00', // EFF Yellow - accent color
    light: '#FFCC33',
    dark: '#FF8F00',
    contrastText: '#000000',
  },
  error: {
    main: '#F44336', // Modern red for errors
    light: '#E57373',
    dark: '#D32F2F',
    contrastText: '#ffffff',
  },
  info: {
    main: '#2196F3', // Modern blue for info
    light: '#64B5F6',
    dark: '#1976D2',
    contrastText: '#ffffff',
  },
};

// Common theme options
const commonTheme: ThemeOptions = {
  palette: {
    ...brandColors,
  },
  typography: {
    // Poppins font family (EFF website font)
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',

    // Headings with EFF-inspired styling
    h1: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0em',
    },
    h4: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0em',
    },
    h6: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.0075em',
    },

    // Body text with improved readability
    body1: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0.01071em',
    },

    // Button styling
    button: {
      fontFamily: '"Poppins", sans-serif',
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.02857em',
    },

    // Caption and small text
    caption: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.03333em',
    },

    // Overline text
    overline: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase' as const,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    // Enhanced Button styling with EFF-inspired design
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 12,
          padding: '10px 20px',
          fontSize: '0.875rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: '0px 3px 12px rgba(254, 0, 0, 0.3)',
          '&:hover': {
            boxShadow: '0px 6px 20px rgba(254, 0, 0, 0.4)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0px)',
            boxShadow: '0px 2px 8px rgba(254, 0, 0, 0.3)',
          },
        },
        containedSecondary: {
          boxShadow: '0px 3px 12px rgba(5, 83, 5, 0.3)',
          '&:hover': {
            boxShadow: '0px 6px 20px rgba(5, 83, 5, 0.4)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            backgroundColor: 'rgba(254, 0, 0, 0.04)',
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: '0.9375rem',
        },
      },
    },

    // Enhanced Card styling
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },

    // Enhanced Paper styling
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
        },
        elevation2: {
          boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)',
        },
        elevation3: {
          boxShadow: '0px 6px 24px rgba(0, 0, 0, 0.10)',
        },
      },
    },

    // Enhanced TextField styling
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#FE0000',
                borderWidth: '2px',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#FE0000',
                borderWidth: '2px',
                boxShadow: '0px 0px 0px 3px rgba(254, 0, 0, 0.1)',
              },
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#FE0000',
          },
        },
      },
    },

    // Enhanced Chip styling
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 500,
          fontSize: '0.8125rem',
          height: 32,
        },
        colorPrimary: {
          backgroundColor: '#FE0000',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#E20202',
          },
        },
        colorSecondary: {
          backgroundColor: '#055305',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#033303',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&.MuiChip-colorPrimary': {
            borderColor: '#FE0000',
            color: '#FE0000',
            '&:hover': {
              backgroundColor: 'rgba(254, 0, 0, 0.04)',
            },
          },
        },
      },
    },

    // Enhanced Drawer styling
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '4px 0px 20px rgba(0, 0, 0, 0.08)',
          backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        },
      },
    },

    // Enhanced AppBar styling
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.08)',
          backgroundImage: 'linear-gradient(135deg, #FE0000 0%, #E20202 100%)',
        },
      },
    },

    // Enhanced Table styling
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#fafafa',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: '#212121',
            borderBottom: '2px solid #e0e0e0',
          },
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(254, 0, 0, 0.02)',
          },
          '&:nth-of-type(even)': {
            backgroundColor: 'rgba(0, 0, 0, 0.01)',
          },
        },
      },
    },

    // Enhanced Tab styling
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTabs-indicator': {
            backgroundColor: '#FE0000',
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9375rem',
          minHeight: 48,
          '&.Mui-selected': {
            color: '#FE0000',
            fontWeight: 600,
          },
          '&:hover': {
            color: '#FE0000',
            backgroundColor: 'rgba(254, 0, 0, 0.04)',
          },
        },
      },
    },

    // Enhanced Dialog styling
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.15)',
        },
      },
    },

    // Enhanced Alert styling
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontSize: '0.875rem',
        },
        standardSuccess: {
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          color: '#2E7D32',
          border: '1px solid rgba(76, 175, 80, 0.3)',
        },
        standardError: {
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          color: '#D32F2F',
          border: '1px solid rgba(244, 67, 54, 0.3)',
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 171, 0, 0.1)',
          color: '#FF8F00',
          border: '1px solid rgba(255, 171, 0, 0.3)',
        },
        standardInfo: {
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          color: '#1976D2',
          border: '1px solid rgba(33, 150, 243, 0.3)',
        },
      },
    },
  },
};

// Light theme with EFF-inspired backgrounds
export const lightTheme = createTheme({
  ...commonTheme,
  palette: {
    ...commonTheme.palette,
    mode: 'light',
    background: {
      default: '#FAFAFA', // Very light gray for main background
      paper: '#FFFFFF',   // Pure white for cards and papers
    },
    text: {
      primary: '#212121',   // Dark gray for primary text
      secondary: '#757575', // Medium gray for secondary text
    },
    divider: 'rgba(0, 0, 0, 0.08)', // Subtle dividers
  },
});

// Dark theme
export const darkTheme = createTheme({
  ...commonTheme,
  palette: {
    ...commonTheme.palette,
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
  },
});

// Theme hook
export const getTheme = (mode: 'light' | 'dark') => {
  return mode === 'light' ? lightTheme : darkTheme;
};

export default lightTheme;
