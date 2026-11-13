import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import MemberSelfServicePortal from '../../components/renewal/MemberSelfServicePortal';
import logo from '../../assets/images/EFF_Reglogo.png';

const MemberRenewalPortal: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      data-testid="renew-outer-shell"
      sx={{
        minHeight: '100vh',
        width: '100%',
        bgcolor: '#006030',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Top Red Section */}
      <Box
        data-testid="renew-red-section"
        sx={{
          flex: 1,
          bgcolor: '#E60000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: { xs: 4, md: 6 },
          pb: { xs: 6, md: 10 },
          px: 2,
        }}
      >
        {/* Brand Logo */}
        <Box
          component="button"
          type="button"
          aria-label="Return to Home"
          onClick={() => navigate('/')}
          sx={{
            width: 100,
            height: 100,
            bgcolor: 'black',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            p: 0,
            border: '2px solid #FFCE00',
            overflow: 'hidden',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            '&:hover': {
              transform: 'scale(1.04)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
            },
            '&:focus-visible': {
              outline: '3px solid #FFCE00',
              outlineOffset: '4px',
            },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': {
                transform: 'none',
              },
            },
          }}
        >
          <img src={logo} alt="EFF Logo" style={{ width: '85%', height: 'auto' }} />
        </Box>

        {/* Brand Title */}
        <Typography
          variant="h2"
          component="h1"
          sx={{
            color: '#FFCE00',
            fontWeight: 800,
            textAlign: 'center',
            fontFamily: '"Poppins", sans-serif',
            fontSize: { xs: '2rem', md: '3.5rem' },
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            mb: 4,
            lineHeight: 1,
          }}
        >
          Membership<br />Renewal
        </Typography>

        {/* Content Container (White Box) */}
        <Container maxWidth={false} sx={{ maxWidth: '900px', position: 'relative' }}>
          <Paper
            elevation={0}
            data-testid="renew-white-card"
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 4,
              background: '#FFFFFF',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
            }}
          >
            <MemberSelfServicePortal />
          </Paper>
        </Container>
      </Box>

      {/* Bottom Green Section (Footer) */}
      <Box
        component="footer"
        data-testid="renew-green-footer"
        sx={{
          bgcolor: '#006030',
          py: 4,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: '#FFFFFF',
            fontWeight: 700,
            fontFamily: '"Poppins", sans-serif',
            mb: 0.5,
          }}
        >
          Economic Freedom in our Lifetime
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.7)',
            fontFamily: '"Poppins", sans-serif',
          }}
        >
          @2026 Economic Freedom Fighters. All rights reserved
        </Typography>
      </Box>
    </Box>
  );
};

export default MemberRenewalPortal;
