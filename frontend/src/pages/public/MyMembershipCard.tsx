import React from 'react';
import {
  Box,
  Container,
  Typography,
} from '@mui/material';
import MemberCardDisplay from '../../components/cards/MemberCardDisplay';

const MyMembershipCard: React.FC = () => {
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
          <Box textAlign="center">
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
              DIGITAL MEMBERSHIP SYSTEM
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
              Your Digital Membership Card
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
              Access your secure digital membership card instantly. Enter your ID number below to view and download your card.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Box sx={{ bgcolor: '#FAFAFA', py: 8 }}>
        <Container maxWidth="lg">
          {/* Main Card Display */}
          <MemberCardDisplay />
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
            © 2025 Economic Freedom Fighters. All rights reserved. | Digital Membership Cards System
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default MyMembershipCard;
