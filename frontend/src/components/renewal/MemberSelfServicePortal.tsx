import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  Divider,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Person,
  Payment,
  CheckCircle,
  CreditCard,
  AccountBalance,
  Money,
  Receipt,
  Download,
  Email,
  Phone,
  CalendarToday,
  LocationOn,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface MemberInfo {
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  membership_number: string;
  current_expiry_date: string;
  days_until_expiry: number;
  province_name: string;
  membership_status: string;
}

interface RenewalData {
  member_id: string;
  renewal_type: 'standard' | 'upgrade';
  payment_method: 'online' | 'bank_transfer' | 'eft';
  amount: number;
  renewal_period_months: number;
}

const steps = ['Member Verification', 'Renewal Options', 'Payment', 'Confirmation'];

const MemberSelfServicePortal: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [renewalData, setRenewalData] = useState<RenewalData>({
    member_id: '',
    renewal_type: 'standard',
    payment_method: 'online',
    amount: 700,
    renewal_period_months: 12
  });
  const [verificationData, setVerificationData] = useState({
    membership_number: '',
    id_number: '',
    phone_number: ''
  });
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [renewalComplete, setRenewalComplete] = useState(false);

  // Member verification mutation
  const verifyMemberMutation = useMutation({
    mutationFn: async (data: typeof verificationData) => {
      // Mock member verification - in real implementation, would call API
      const mockMember: MemberInfo = {
        member_id: '186328',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone_number: '+27123456789',
        membership_number: 'MEM186328',
        current_expiry_date: '2025-12-31',
        days_until_expiry: 118,
        province_name: 'Gauteng',
        membership_status: 'Active'
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      return mockMember;
    },
    onSuccess: (member) => {
      setMemberInfo(member);
      setRenewalData(prev => ({ ...prev, member_id: member.member_id }));
      setActiveStep(1);
    }
  });

  // Renewal processing mutation
  const processRenewalMutation = useMutation({
    mutationFn: async (data: RenewalData) => {
      const response = await api.post('/membership-renewal/process-renewal', {
        member_id: data.member_id,
        renewal_type: data.renewal_type,
        payment_method: data.payment_method,
        amount_paid: data.amount,
        renewal_period_months: data.renewal_period_months,
        processed_by: 'self_service',
        send_confirmation: true
      });
      return response.data.data;
    },
    onSuccess: (result) => {
      setRenewalComplete(true);
      setActiveStep(3);
    }
  });

  const handleVerifyMember = () => {
    verifyMemberMutation.mutate(verificationData);
  };

  const handleRenewalOptionChange = (field: keyof RenewalData, value: any) => {
    setRenewalData(prev => ({ ...prev, [field]: value }));
    
    // Update amount based on renewal type
    if (field === 'renewal_type') {
      const amounts = {
        'standard': 700,
        'upgrade': 1200
      };
      setRenewalData(prev => ({ ...prev, amount: amounts[value] }));
    }
  };

  const handleProceedToPayment = () => {
    setActiveStep(2);
    setShowPaymentDialog(true);
  };

  const handleProcessPayment = () => {
    setShowPaymentDialog(false);
    processRenewalMutation.mutate(renewalData);
  };

  const getStatusColor = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) return 'error';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'success';
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'online': return <CreditCard />;
      case 'bank_transfer': return <AccountBalance />;
      case 'eft': return <Money />;
      default: return <Payment />;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h4" gutterBottom>
          Member Self-Service Portal
        </Typography>
        <Typography variant="body1">
          Renew your membership quickly and securely online
        </Typography>
      </Paper>

      {/* Progress Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Step 1: Member Verification */}
      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person color="primary" />
              Member Verification
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please provide your membership details to verify your identity
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Membership Number"
                  value={verificationData.membership_number}
                  onChange={(e) => setVerificationData(prev => ({ ...prev, membership_number: e.target.value }))}
                  placeholder="MEM123456"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ID Number"
                  value={verificationData.id_number}
                  onChange={(e) => setVerificationData(prev => ({ ...prev, id_number: e.target.value }))}
                  placeholder="1234567890123"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={verificationData.phone_number}
                  onChange={(e) => setVerificationData(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="+27123456789"
                />
              </Grid>
            </Grid>

            {verifyMemberMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Member verification failed. Please check your details and try again.
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleVerifyMember}
                disabled={verifyMemberMutation.isPending || !verificationData.membership_number || !verificationData.id_number}
                startIcon={verifyMemberMutation.isPending ? <CircularProgress size={20} /> : <Person />}
              >
                {verifyMemberMutation.isPending ? 'Verifying...' : 'Verify Member'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Renewal Options */}
      {activeStep === 1 && memberInfo && (
        <Box>
          {/* Member Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Member Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Person fontSize="small" />
                    <Typography variant="body2">
                      {memberInfo.first_name} {memberInfo.last_name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Email fontSize="small" />
                    <Typography variant="body2">{memberInfo.email}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone fontSize="small" />
                    <Typography variant="body2">{memberInfo.phone_number}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Receipt fontSize="small" />
                    <Typography variant="body2">{memberInfo.membership_number}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarToday fontSize="small" />
                    <Typography variant="body2">
                      Expires: {new Date(memberInfo.current_expiry_date).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn fontSize="small" />
                    <Typography variant="body2">{memberInfo.province_name}</Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2 }}>
                <Chip
                  label={`${memberInfo.days_until_expiry} days until expiry`}
                  color={getStatusColor(memberInfo.days_until_expiry)}
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>

          {/* Renewal Options */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Renewal Options
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Renewal Type</InputLabel>
                    <Select
                      value={renewalData.renewal_type}
                      label="Renewal Type"
                      onChange={(e) => handleRenewalOptionChange('renewal_type', e.target.value)}
                    >
                      <MenuItem value="standard">Standard Renewal (12 months)</MenuItem>
                      <MenuItem value="upgrade">Premium Upgrade (12 months)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={renewalData.payment_method}
                      label="Payment Method"
                      onChange={(e) => handleRenewalOptionChange('payment_method', e.target.value)}
                    >
                      <MenuItem value="online">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCard fontSize="small" />
                          Online Payment
                        </Box>
                      </MenuItem>
                      <MenuItem value="bank_transfer">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccountBalance fontSize="small" />
                          Bank Transfer
                        </Box>
                      </MenuItem>
                      <MenuItem value="eft">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Money fontSize="small" />
                          EFT Payment
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  R{renewalData.amount.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {renewalData.renewal_period_months} month renewal
                </Typography>
              </Box>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleProceedToPayment}
                  startIcon={<Payment />}
                >
                  Proceed to Payment
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Step 3: Payment Processing */}
      {activeStep === 2 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Processing Your Renewal
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please wait while we process your payment and update your membership...
            </Typography>
            <LinearProgress sx={{ maxWidth: 300, mx: 'auto' }} />
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {activeStep === 3 && renewalComplete && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
            <Typography variant="h5" gutterBottom color="success.main">
              Renewal Successful!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Your membership has been successfully renewed.
            </Typography>
            
            <Box sx={{ bgcolor: 'grey.50', p: 3, borderRadius: 1, mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                New Expiry Date
              </Typography>
              <Typography variant="h6" color="primary.main">
                {new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                • A confirmation SMS has been sent to your registered phone number
                <br />
                • Your digital membership card will be available for download shortly
                <br />
                • A receipt has been emailed to your registered email address
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => alert('Digital membership card download will be available soon')}
              >
                Download Card
              </Button>
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
              >
                Renew Another Membership
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Confirm Payment
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Please confirm your renewal details:
          </Typography>
          
          <Box sx={{ my: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">Member:</Typography>
            <Typography variant="body1" fontWeight="bold">
              {memberInfo?.first_name} {memberInfo?.last_name}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Renewal Type:</Typography>
            <Typography variant="body1" fontWeight="bold">
              {renewalData.renewal_type === 'standard' ? 'Standard Renewal' : 'Premium Upgrade'}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Payment Method:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getPaymentMethodIcon(renewalData.payment_method)}
              <Typography variant="body1" fontWeight="bold">
                {renewalData.payment_method.replace('_', ' ').toUpperCase()}
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Amount:</Typography>
            <Typography variant="h6" color="primary.main" fontWeight="bold">
              R{renewalData.amount.toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleProcessPayment} variant="contained">
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MemberSelfServicePortal;
