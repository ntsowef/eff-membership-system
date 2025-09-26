import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  CreditCard,
  Security,
  Download,
  QrCode,
  Verified,
  Home,
  Phone,
  Email,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MemberCardDisplay from '../../components/cards/MemberCardDisplay';

const MyMembershipCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default',
      py: 4
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper sx={{ p: 4, mb: 4, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Digital Membership Cards
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 3 }}>
            Enter your ID Number to access your secure digital membership card instantly
          </Typography>
          <Button
            variant="outlined"
            sx={{ 
              color: 'white', 
              borderColor: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)',
                borderColor: 'white'
              }
            }}
            startIcon={<Home />}
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </Paper>

        {/* Main Card Display */}
        <MemberCardDisplay />

        {/* Features Section */}
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
            Digital Card Features
          </Typography>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Security sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Secure & Tamper-Proof
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Advanced encryption and digital signatures ensure your card cannot be forged or tampered with.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <QrCode sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    QR Code Verification
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Instant verification with any smartphone camera. Scan the QR code to verify authenticity.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Download sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Instant Download
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Download your card as a high-quality PDF for printing or digital storage.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* How It Works */}
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
            How It Works
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 'bold',
                  mx: 'auto',
                  mb: 2
                }}>
                  1
                </Box>
                <Typography variant="h6" gutterBottom>
                  Enter ID Number
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter your South African ID Number to access your digital card
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 'bold',
                  mx: 'auto',
                  mb: 2
                }}>
                  2
                </Box>
                <Typography variant="h6" gutterBottom>
                  View Your Card
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your digital membership card appears with all your details
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 'bold',
                  mx: 'auto',
                  mb: 2
                }}>
                  3
                </Box>
                <Typography variant="h6" gutterBottom>
                  Download & Share
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Download as PDF or share your digital card instantly
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 'bold',
                  mx: 'auto',
                  mb: 2
                }}>
                  4
                </Box>
                <Typography variant="h6" gutterBottom>
                  Verify Anywhere
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use QR code for instant verification at any location
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Security Notice */}
        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Security & Privacy Notice</strong>
          </Typography>
          <Typography variant="body2">
            Your digital membership card contains encrypted information and is protected by advanced security measures. 
            Only enter your Member ID on official organization websites. If you suspect any unauthorized use of your 
            membership information, please contact us immediately.
          </Typography>
        </Alert>

        {/* Contact Information */}
        <Paper sx={{ p: 4, mt: 4, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
            Need Help?
          </Typography>
          
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
              <Phone color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2" fontWeight="medium">
                Call Support
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +27 (0) 11 123 4567
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
              <Email color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2" fontWeight="medium">
                Email Support
              </Typography>
              <Typography variant="body2" color="text.secondary">
                support@organization.co.za
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
              <Verified color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2" fontWeight="medium">
                Verification Help
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Card verification support
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4, py: 3 }}>
          <Typography variant="body2" color="text.secondary">
            © 2025 Organization Name. All rights reserved. | Digital Membership Cards System
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default MyMembershipCard;
