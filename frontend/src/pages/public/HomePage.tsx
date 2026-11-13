import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
} from '@mui/material';
import {
  PersonAdd,
  Autorenew,
  Search,
  CreditCard,
  AdminPanelSettings,
  ArrowForward,
} from '@mui/icons-material';
import logo from '../../assets/images/EFF_Reglogo.png';

interface DispatchTileProps {
  title: string;
  path: string;
  icon: React.ReactNode;
  variant?: 'light' | 'obsidian';
  testId: string;
}

const DispatchTile: React.FC<DispatchTileProps> = ({
  title,
  path,
  icon,
  variant = 'light',
  testId,
}) => {
  const navigate = useNavigate();
  const isObsidian = variant === 'obsidian';

  return (
    <Box
      component="button"
      type="button"
      data-testid={testId}
      onClick={() => navigate(path)}
      sx={{
        width: '100%',
        textAlign: 'left',
        p: { xs: 2.25, sm: 2.5 },
        bgcolor: isObsidian ? '#0A0A0A' : '#FFFFFF',
        color: isObsidian ? '#FFFFFF' : '#0A0A0A',
        border: isObsidian ? '2px solid #FFCE00' : '2px solid #0A0A0A',
        borderRadius: '2px',
        boxShadow: isObsidian ? '5px 5px 0px rgba(0, 0, 0, 0.45)' : '5px 5px 0px #0A0A0A',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'translate(-2px, -2px)',
          boxShadow: isObsidian ? '7px 7px 0px rgba(0, 0, 0, 0.6)' : '7px 7px 0px #0A0A0A',
          borderColor: isObsidian ? '#FFCE00' : '#0A0A0A',
          '& .dispatch-arrow': {
            transform: 'translateX(4px)',
          },
        },
        '&:focus-visible': {
          outline: '3px solid #FFCE00',
          outlineOffset: '3px',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': {
            transform: 'none',
            '& .dispatch-arrow': {
              transform: 'none',
            },
          },
        },
      }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,
          borderRadius: '2px',
          bgcolor: isObsidian ? '#FFCE00' : '#E60000',
          color: isObsidian ? '#0A0A0A' : '#FFFFFF',
          border: isObsidian ? '2px solid #FFCE00' : '2px solid #0A0A0A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          component="span"
          sx={{
            display: 'block',
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 700,
            fontSize: '1.02rem',
            lineHeight: 1.25,
            color: isObsidian ? '#FFFFFF' : '#0A0A0A',
          }}
        >
          {title}
        </Typography>
      </Box>

      <ArrowForward
        className="dispatch-arrow"
        sx={{
          color: isObsidian ? '#FFCE00' : '#DC143C',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
        }}
      />
    </Box>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      data-testid="eff-portal-hub"
      sx={{
        flex: 1,
        bgcolor: '#E60000',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 4, md: 6 },
        px: 2,
        backgroundImage:
          'linear-gradient(to right, rgba(0, 0, 0, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.06) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Plain Masthead */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: { xs: 2, sm: 3 },
            mb: { xs: 3.5, md: 4 },
          }}
        >
          <Box
            sx={{
              width: { xs: 72, md: 84 },
              height: { xs: 72, md: 84 },
              bgcolor: '#000000',
              borderRadius: '50%',
              border: '3px solid #FFCE00',
              boxShadow: '5px 5px 0px #0A0A0A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src={logo}
              alt="EFF Emblem"
              sx={{ width: '85%', height: 'auto', display: 'block' }}
            />
          </Box>

          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '2rem', sm: '2.6rem', md: '3.2rem' },
              textTransform: 'uppercase',
              letterSpacing: '-0.025em',
              lineHeight: 1,
              color: '#FFCE00',
            }}
          >
            EFF Membership{' '}
            <Box component="span" sx={{ color: '#FFFFFF' }}>
              Portal Hub
            </Box>
          </Typography>
        </Box>

        {/* Asymmetric 58 / 42 Command Ledger */}
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* New Application */}
            <Box
              data-testid="portal-card-apply"
              sx={{
                flex: 1,
                bgcolor: '#FFFFFF',
                border: '2px solid #0A0A0A',
                borderRadius: '2px',
                boxShadow: '6px 6px 0px #0A0A0A',
                p: { xs: 3, sm: 3.5 },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 2.5,
                borderTop: '6px solid #0A0A0A',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PersonAdd sx={{ color: '#DC143C', fontSize: 32, flexShrink: 0 }} />
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 800,
                    color: '#0A0A0A',
                    fontSize: { xs: '1.25rem', sm: '1.45rem' },
                  }}
                >
                  New Membership Application
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/apply')}
                sx={{
                  background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  px: 3,
                  py: 1.35,
                  borderRadius: '2px',
                  border: '2px solid #0A0A0A',
                  boxShadow: '4px 4px 0px #0A0A0A',
                  textTransform: 'none',
                  fontSize: '0.98rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)',
                    transform: 'translate(-2px, -2px)',
                    boxShadow: '6px 6px 0px #0A0A0A',
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:hover': { transform: 'none' },
                  },
                }}
              >
                Start New Application
              </Button>
            </Box>

            {/* Renew Membership */}
            <Box
              data-testid="portal-card-renew"
              sx={{
                flex: 1,
                bgcolor: '#FFFFFF',
                border: '2px solid #0A0A0A',
                borderRadius: '2px',
                boxShadow: '6px 6px 0px #0A0A0A',
                p: { xs: 3, sm: 3.5 },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 2.5,
                borderTop: '6px solid #006030',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Autorenew sx={{ color: '#006030', fontSize: 32, flexShrink: 0 }} />
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 800,
                    color: '#0A0A0A',
                    fontSize: { xs: '1.25rem', sm: '1.45rem' },
                  }}
                >
                  Renew Membership
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/renew')}
                sx={{
                  bgcolor: '#0A0A0A',
                  color: '#FFCE00',
                  fontWeight: 700,
                  px: 3,
                  py: 1.35,
                  borderRadius: '2px',
                  border: '2px solid #0A0A0A',
                  boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.35)',
                  textTransform: 'none',
                  fontSize: '0.98rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'transform 0.2s ease, background-color 0.2s ease',
                  '&:hover': {
                    bgcolor: '#1F1F1F',
                    transform: 'translate(-2px, -2px)',
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:hover': { transform: 'none' },
                  },
                }}
              >
                Renew My Membership
              </Button>
            </Box>
          </Grid>

          {/* Secondary Utility & Administration Rail */}
          <Grid
            item
            xs={12}
            md={5}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 2.5,
            }}
          >
            <DispatchTile
              testId="portal-card-status"
              title="Check Application Status"
              path="/application-status"
              icon={<Search />}
            />

            <DispatchTile
              testId="portal-card-my-card"
              title="My Digital Membership Card"
              path="/my-card"
              icon={<CreditCard />}
            />

            <DispatchTile
              testId="portal-card-login"
              title="Staff & Leadership Login"
              path="/login"
              icon={<AdminPanelSettings />}
              variant="obsidian"
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HomePage;
