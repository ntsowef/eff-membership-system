import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  Security,
  Speed,
  Payment,
  Support,
  CheckCircle,
  Phone,
  Email,
  Schedule,
} from '@mui/icons-material';
import MemberSelfServicePortal from '../../components/renewal/MemberSelfServicePortal';

const MemberRenewalPortal: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Paper sx={{ py: 6, mb: 4, bgcolor: 'primary.main', color: 'white', borderRadius: 0 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h1" gutterBottom textAlign="center">
            Member Renewal Portal
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ opacity: 0.9 }}>
            Renew your membership quickly and securely online
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Security sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" gutterBottom>Secure</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Bank-level security for all transactions
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Speed sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" gutterBottom>Fast</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Complete renewal in under 5 minutes
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Payment sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" gutterBottom>Flexible</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Multiple payment options available
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Support sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" gutterBottom>Support</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  24/7 customer support available
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Paper>

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Main Renewal Portal */}
          <Grid item xs={12} lg={8}>
            <MemberSelfServicePortal />
          </Grid>

          {/* Sidebar Information */}
          <Grid item xs={12} lg={4}>
            {/* Renewal Benefits */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" />
                  Renewal Benefits
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  {[
                    'Continued access to all member services',
                    'Digital membership card',
                    'Priority customer support',
                    'Exclusive member discounts',
                    'Access to member-only events',
                    'Monthly newsletter and updates'
                  ].map((benefit, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                      <Typography variant="body2">{benefit}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Payment Options */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment Options
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Online Payment</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Credit/Debit cards, PayPal, and digital wallets
                    </Typography>
                    <Chip label="Instant Processing" color="success" size="small" sx={{ mt: 0.5 }} />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Bank Transfer</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Direct bank transfer with reference number
                    </Typography>
                    <Chip label="1-2 Business Days" color="warning" size="small" sx={{ mt: 0.5 }} />
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">EFT Payment</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Electronic funds transfer
                    </Typography>
                    <Chip label="Same Day Processing" color="info" size="small" sx={{ mt: 0.5 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Need Help?
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  Our support team is available to assist you with your renewal process.
                </Alert>
                
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Phone color="primary" />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">Phone Support</Typography>
                      <Typography variant="body2" color="text.secondary">
                        +27 11 123 4567
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Email color="primary" />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">Email Support</Typography>
                      <Typography variant="body2" color="text.secondary">
                        renewals@organization.co.za
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule color="primary" />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">Business Hours</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Monday - Friday: 8:00 AM - 5:00 PM
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Security Information */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security color="primary" />
                  Security & Privacy
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Your personal and payment information is protected with industry-standard security measures.
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  {[
                    'SSL encryption for all data transmission',
                    'PCI DSS compliant payment processing',
                    'No storage of sensitive payment data',
                    'Regular security audits and updates'
                  ].map((feature, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                      <Typography variant="body2">{feature}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Footer Information */}
        <Paper sx={{ mt: 6, p: 4, bgcolor: 'grey.100' }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Renewal Process
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Our streamlined 4-step process makes membership renewal quick and easy. 
                Simply verify your identity, choose your renewal options, make payment, 
                and receive instant confirmation.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Membership Types
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose between Standard Renewal (R700) for continued access to all 
                basic services, or Premium Upgrade (R1,200) for enhanced benefits 
                and exclusive features.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                After Renewal
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Once your renewal is complete, you'll receive SMS and email confirmations, 
                access to your digital membership card, and continued access to all 
                member services and benefits.
              </Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="body2" color="text.secondary" textAlign="center">
            © 2025 Organization Name. All rights reserved. | 
            <strong> Secure Member Renewal Portal</strong> | 
            Questions? Contact support at renewals@organization.co.za
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default MemberRenewalPortal;
