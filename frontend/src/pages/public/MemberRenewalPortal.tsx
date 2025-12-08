import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
} from '@mui/material';
import {
  Security,
  Speed,
  Payment,
  Support,
} from '@mui/icons-material';
import MemberSelfServicePortal from '../../components/renewal/MemberSelfServicePortal';

const MemberRenewalPortal: React.FC = () => {
  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #8B0000 100%)',
          color: 'white',
          py: 8,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(220, 20, 60, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 0, 0, 0.15) 0%, transparent 50%)',
            pointerEvents: 'none'
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center" sx={{ mb: 6 }}>
            <Typography
              variant="overline"
              sx={{
                color: '#DC143C',
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: '0.15em',
                mb: 2,
                display: 'block',
                textShadow: '0 2px 8px rgba(220, 20, 60, 0.3)',
                animation: 'fadeInUp 0.8s ease-out 0.1s both',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(20px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              MEMBERSHIP RENEWAL
            </Typography>
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                lineHeight: 1.1,
                mb: 3,
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                animation: 'fadeInUp 0.8s ease-out 0.2s both',
              }}
            >
              Renew Your Membership
            </Typography>
            <Typography
              variant="h6"
              sx={{
                opacity: 0.9,
                lineHeight: 1.7,
                fontWeight: 400,
                fontSize: '1.1rem',
                maxWidth: '700px',
                mx: 'auto',
                color: 'rgba(255, 255, 255, 0.9)',
                animation: 'fadeInUp 0.8s ease-out 0.3s both',
              }}
            >
              Continue your fight for economic freedom. Renew your membership quickly and securely online.
            </Typography>
          </Box>

          {/* Feature Cards */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 3,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(220, 20, 60, 0.2)',
                  transition: 'all 0.3s ease',
                  animation: 'fadeInUp 0.8s ease-out 0.4s both',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 12px 40px rgba(220, 20, 60, 0.2)',
                  }
                }}
              >
                <Security sx={{ fontSize: 48, mb: 2, color: '#DC143C' }} />
                <Typography variant="h6" gutterBottom fontWeight={700}>
                  Secure
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Bank-level security for all transactions
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 3,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(220, 20, 60, 0.2)',
                  transition: 'all 0.3s ease',
                  animation: 'fadeInUp 0.8s ease-out 0.5s both',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 12px 40px rgba(220, 20, 60, 0.2)',
                  }
                }}
              >
                <Speed sx={{ fontSize: 48, mb: 2, color: '#DC143C' }} />
                <Typography variant="h6" gutterBottom fontWeight={700}>
                  Fast
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Complete renewal in under 5 minutes
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 3,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(220, 20, 60, 0.2)',
                  transition: 'all 0.3s ease',
                  animation: 'fadeInUp 0.8s ease-out 0.6s both',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 12px 40px rgba(220, 20, 60, 0.2)',
                  }
                }}
              >
                <Payment sx={{ fontSize: 48, mb: 2, color: '#DC143C' }} />
                <Typography variant="h6" gutterBottom fontWeight={700}>
                  Flexible
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Multiple payment options available
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 3,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(220, 20, 60, 0.2)',
                  transition: 'all 0.3s ease',
                  animation: 'fadeInUp 0.8s ease-out 0.7s both',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 12px 40px rgba(220, 20, 60, 0.2)',
                  }
                }}
              >
                <Support sx={{ fontSize: 48, mb: 2, color: '#DC143C' }} />
                <Typography variant="h6" gutterBottom fontWeight={700}>
                  Support
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  24/7 customer support available
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Main Content */}
      <Box sx={{ bgcolor: '#FAFAFA', py: 8 }}>
        <Container maxWidth="lg">
          {/* Main Renewal Portal */}
          <MemberSelfServicePortal />
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          bgcolor: '#1a1a1a',
          color: 'white',
          py: 4,
          textAlign: 'center',
          borderTop: '1px solid rgba(220, 20, 60, 0.2)',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            © 2025 Economic Freedom Fighters. All rights reserved. | Secure Member Renewal Portal
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default MemberRenewalPortal;
