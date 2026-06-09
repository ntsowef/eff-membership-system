import React from 'react';
import {
  Box,
  Container,
  Typography,
} from '@mui/material';
import MemberCardDisplay from '../../components/cards/MemberCardDisplay';
import logo from '../../assets/images/EFF_Reglogo.png';

const MyMembershipCard: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        bgcolor: '#006030', // Green footer color as base
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      {/* Top Red Section */}
      <Box
        sx={{
          flex: 1,
          bgcolor: '#E60000', // Crimson Red
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: { xs: 6, md: 8 },
          pb: { xs: 10, md: 15 },
          px: 2,
        }}
      >
        {/* Brand Logo */}
        <Box
          sx={{
            width: 100,
            height: 100,
            bgcolor: 'black',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 4,
            border: '2px solid #FFCE00',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}
        >
          <img src={logo} alt="EFF Logo" style={{ width: '85%', height: 'auto' }} />
        </Box>

        {/* Brand Title */}
        <Typography
          variant="h2"
          sx={{
            color: '#FFCE00', // Yellow
            fontWeight: 800,
            textAlign: 'center',
            fontFamily: '"Poppins", sans-serif',
            fontSize: { xs: '2.5rem', md: '4rem' },
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            mb: 2,
            lineHeight: 1
          }}
        >
          Your EFF Digital<br />Membership Card
        </Typography>

        {/* Brand Subtitle */}
        <Typography
          variant="h6"
          sx={{
            color: '#FFFFFF',
            textAlign: 'center',
            fontFamily: '"Poppins", sans-serif',
            maxWidth: '800px',
            fontWeight: 400,
            mb: 6,
            opacity: 0.9,
            fontSize: { xs: '1.1rem', md: '1.4rem' }
          }}
        >
          Access your secure digital membership card instantly. Enter your ID number below to view and download your card.
        </Typography>

        {/* Content Container (White Box) */}
        <Container maxWidth={false} sx={{ maxWidth: '1000px', position: 'relative', mt: -2 }}>
          <MemberCardDisplay />
        </Container>
      </Box>

      {/* Bottom Green Section (Footer) */}
      <Box
        sx={{
          bgcolor: '#006030',
          py: 4,
          px: 2,
          textAlign: 'center'
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: '#FFFFFF',
            fontWeight: 700,
            fontFamily: '"Poppins", sans-serif',
            mb: 0.5
          }}
        >
          Economic Freedom in our Lifetime
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.7)',
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          @2026 Economic Freedom Fighters. All rights reserved
        </Typography>
      </Box>
    </Box>
  );
};

export default MyMembershipCard;
