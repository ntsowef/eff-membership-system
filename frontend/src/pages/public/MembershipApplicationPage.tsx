import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { ArrowForward, ArrowBack } from '@mui/icons-material';

import { useApplication } from '../../store';
import PersonalInfoStep from '../../components/application/PersonalInfoStep';
import ContactInfoStep from '../../components/application/ContactInfoStep';
import PartyDeclarationStep from '../../components/application/PartyDeclarationStep';
import PaymentStep from '../../components/application/PaymentStep';
import ReviewStep from '../../components/application/ReviewStep';
import { useMutation } from '@tanstack/react-query';
import { apiPost, api } from '../../lib/api';
import { useUI } from '../../store';
import PublicHeader from '../../components/layout/PublicHeader';

const steps = [
  'Personal Information',
  'Contact Information',
  'Party Declaration & Signature',
  'Payment Information',
  'Review & Submit',
];

const MembershipApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { applicationStep, setApplicationStep, applicationData, resetApplication, updateApplicationData } = useApplication();
  const { addNotification } = useUI();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any>(null);

  const submitApplicationMutation = useMutation({
    mutationFn: (data: any) => apiPost<{application: {id: number; application_number: string}}>('/membership-applications', data),
    onSuccess: (response) => {
      const application = response.application;
      addNotification({
        type: 'success',
        message: `Application submitted successfully! Reference: ${application.application_number}`,
      });
      resetApplication();
      navigate('/application-status', {
        state: {
          applicationId: application.id,
          applicationNumber: application.application_number
        }
      });
    },
    onError: (error: any) => {
      console.error('❌ Application submission error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);

      const errorMessage = error.response?.data?.message
        || error.response?.data?.error?.message
        || error.message
        || 'Failed to submit application';

      addNotification({
        type: 'error',
        message: errorMessage,
      });
    },
  });

  const handleNext = async () => {
    // Validate current step
    const stepErrors = validateStep(applicationStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});

    // STEP 0: Personal Information - Check for duplicate ID and verify with IEC
    if (applicationStep === 0) {
      await checkIdAndVerifyIEC();
      return; // Don't proceed yet - will be handled after checks
    }

    // For other steps, proceed normally
    if (applicationStep === steps.length - 1) {
      // Submit application
      handleSubmit();
    } else {
      setApplicationStep(applicationStep + 1);
    }
  };

  const checkIdAndVerifyIEC = async () => {
    const idNumber = applicationData.id_number;

    if (!idNumber) {
      addNotification({
        type: 'error',
        message: 'ID number is required',
      });
      return;
    }

    setIsCheckingId(true);

    try {
      // STEP 1: Check for duplicate ID number
      console.log('🔍 Step 1: Checking for duplicate ID number...');
      console.log('📤 Sending request with ID:', idNumber);

      const duplicateCheckResponse = await api.post('/membership-applications/check-id-number', {
        id_number: idNumber,
      });

      console.log('✅ Duplicate check response:', duplicateCheckResponse.data);

      // Check if ID exists
      if (duplicateCheckResponse.data.success && duplicateCheckResponse.data.data?.exists) {
        console.log('❌ Duplicate ID found!');
        setDuplicateData(duplicateCheckResponse.data.data);
        setDuplicateDialogOpen(true);
        setIsCheckingId(false);
        return; // Stop here - don't proceed to IEC verification
      }

      console.log('✅ No duplicate found. Proceeding to IEC verification...');

      // STEP 2: Verify with IEC API
      try {
        console.log('🔍 Step 2: Verifying voter registration with IEC...');
        const iecResponse = await api.post('/iec/verify-voter-public', {
          idNumber: idNumber,
        });

        console.log('✅ IEC verification response:', iecResponse.data);

        // Store IEC verification results in application data
        if (iecResponse.data.success && iecResponse.data.data) {
          const iecData = iecResponse.data.data;
          console.log('✅ IEC verification successful');
          console.log('   Registered:', iecData.is_registered);

          // Store IEC data for use in Contact Info step
          updateApplicationData({
            iec_verification: iecData,
          } as any);

          if (iecData.is_registered) {
            addNotification({
              type: 'success',
              message: 'Voter registration verified with IEC',
            });
          } else {
            addNotification({
              type: 'info',
              message: 'ID verified. You can proceed with your application.',
            });
          }
        } else {
          console.log('⚠️ IEC verification returned no data');
          addNotification({
            type: 'info',
            message: 'ID verified. You can proceed with your application.',
          });
        }
      } catch (iecError: any) {
        console.log('⚠️ IEC verification failed:', iecError);
        // IEC verification failure is not critical - continue with application
        addNotification({
          type: 'info',
          message: 'ID verified. You can proceed with your application.',
        });
      }

      // All checks passed - proceed to next step
      setIsCheckingId(false);
      setApplicationStep(applicationStep + 1);

    } catch (error: any) {
      console.error('❌ Error during ID check:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      setIsCheckingId(false);

      const errorMessage = error.response?.data?.message
        || error.response?.data?.error?.message
        || error.message
        || 'Error verifying ID number. Please try again.';

      addNotification({
        type: 'error',
        message: errorMessage,
      });
    }
  };

  const handleBack = () => {
    setApplicationStep(applicationStep - 1);
  };

  const handleSubmit = () => {
    console.log('📤 Submitting application with data:', applicationData);
    console.log('📋 Required fields check:');
    console.log('  - firstname:', applicationData.firstname);
    console.log('  - surname:', applicationData.surname);
    console.log('  - id_number:', applicationData.id_number);
    console.log('  - date_of_birth:', applicationData.date_of_birth);
    console.log('  - gender:', applicationData.gender);
    console.log('  - phone:', applicationData.phone);
    console.log('  - address:', applicationData.address);
    console.log('  - ward_code:', applicationData.ward_code);

    submitApplicationMutation.mutate(applicationData);
  };

  const validateStep = (step: number): Record<string, string> => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 0: // Personal Information
        if (!applicationData.firstname) errors.firstname = 'First name is required';
        if (!applicationData.surname) errors.surname = 'Surname is required';
        if (!applicationData.date_of_birth) errors.date_of_birth = 'Date of birth is required';
        if (!applicationData.gender) errors.gender = 'Gender is required';
        if (!applicationData.id_number) errors.id_number = 'ID number is required';
        // Enhanced Personal Information validation
        if (!applicationData.language_id) errors.language_id = 'Home language is required';
        if (!applicationData.occupation_id) errors.occupation_id = 'Occupation is required';
        if (!applicationData.qualification_id) errors.qualification_id = 'Highest qualification is required';
        if (!applicationData.citizenship_status) errors.citizenship_status = 'Citizenship status is required';
        break;

      case 1: // Contact Information
        if (!applicationData.email) errors.email = 'Email is required';
        if (!applicationData.phone) errors.phone = 'Phone number is required';
        if (!applicationData.address) errors.address = 'Address is required';
        if (!applicationData.city) errors.city = 'City is required';
        // Geographic fields validation - using correct field names
        if (!applicationData.province_code) errors.province_code = 'Province is required';
        if (!applicationData.district_code) errors.district_code = 'District is required';
        if (!applicationData.municipal_code) errors.municipal_code = 'Municipality is required';
        if (!applicationData.ward_code) errors.ward_code = 'Ward is required';
        // Note: voting_district_code is optional - not required for form submission
        break;

      case 2: // Party Declaration & Signature
        if (!applicationData.declaration_accepted) errors.declaration_accepted = 'You must accept the party declaration';
        if (!applicationData.constitution_accepted) errors.constitution_accepted = 'You must accept the EFF constitution';
        if (!applicationData.signature_data || !applicationData.signature_type) errors.signature_data = 'Signature is required';
        break;

      case 3: // Payment Information
        // Payment validation - only validate if payment date is provided
        if (applicationData.last_payment_date) {
          if (!applicationData.payment_method) errors.payment_method = 'Payment method is required when payment date is provided';
          if (!applicationData.payment_reference) errors.payment_reference = 'Payment reference is required when payment date is provided';

          // Validate payment date is not in the future
          const paymentDate = new Date(applicationData.last_payment_date);
          const today = new Date();
          today.setHours(23, 59, 59, 999); // End of today
          if (paymentDate > today) {
            errors.last_payment_date = 'Payment date cannot be in the future';
          }
        }

        // Validate payment amount if provided
        if (applicationData.payment_amount && applicationData.payment_amount <= 0) {
          errors.payment_amount = 'Payment amount must be greater than 0';
        }
        break;

      case 4: // Review
        // Final validation
        break;
    }

    return errors;
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <PersonalInfoStep errors={errors} />;
      case 1:
        return <ContactInfoStep errors={errors} />;
      case 2:
        return <PartyDeclarationStep errors={errors} />;
      case 3:
        return <PaymentStep errors={errors} />;
      case 4:
        return <ReviewStep />;
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Sticky Header */}
      <PublicHeader />

      {/* Duplicate ID Dialog */}
      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#FE0000', fontWeight: 600 }}>
          ID Number Already Registered
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This ID number is already registered in our system.
          </DialogContentText>

          {duplicateData?.exists_in_members && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                ✓ You are already a member
              </Typography>
              {duplicateData.member_details && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Member ID:</strong> {duplicateData.member_details.member_id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Full Name:</strong> {duplicateData.member_details.first_name} {duplicateData.member_details.last_name}
                  </Typography>
                  {duplicateData.member_details.province_name && (
                    <Typography variant="body2">
                      <strong>Province:</strong> {duplicateData.member_details.province_name}
                    </Typography>
                  )}
                  {duplicateData.member_details.municipality_name && (
                    <Typography variant="body2">
                      <strong>Sub-Region:</strong> {duplicateData.member_details.municipality_name}
                    </Typography>
                  )}
                  {duplicateData.member_details.ward_code && (
                    <Typography variant="body2">
                      <strong>Ward Code:</strong> {duplicateData.member_details.ward_code}
                    </Typography>
                  )}
                  {duplicateData.member_details.ward_name && (
                    <Typography variant="body2">
                      <strong>Ward Name:</strong> {duplicateData.member_details.ward_name}
                    </Typography>
                  )}
                </Box>
              )}
            </Alert>
          )}

          {duplicateData?.exists_in_applications && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                ✓ You have a pending application
              </Typography>
              {duplicateData.application_details && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Application #:</strong> {duplicateData.application_details.application_number}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Full Name:</strong> {duplicateData.application_details.firstname} {duplicateData.application_details.surname}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong> {duplicateData.application_details.status}
                  </Typography>
                  {duplicateData.application_details.province_name && (
                    <Typography variant="body2">
                      <strong>Province:</strong> {duplicateData.application_details.province_name}
                    </Typography>
                  )}
                  {duplicateData.application_details.municipality_name && (
                    <Typography variant="body2">
                      <strong>Sub-Region:</strong> {duplicateData.application_details.municipality_name}
                    </Typography>
                  )}
                  {duplicateData.application_details.ward_code && (
                    <Typography variant="body2">
                      <strong>Ward Code:</strong> {duplicateData.application_details.ward_code}
                    </Typography>
                  )}
                  {duplicateData.application_details.submission_date && (
                    <Typography variant="body2">
                      <strong>Submitted:</strong> {new Date(duplicateData.application_details.submission_date).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              )}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mt: 2 }}>
            Please contact our membership support team for assistance:
          </Typography>
          <Box sx={{ mt: 1, ml: 2 }}>
            <Typography variant="body2">
              <strong>Email:</strong> membership@eff.org.za
            </Typography>
            <Typography variant="body2">
              <strong>Phone:</strong> +27 11 447 4797
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hero Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #8B0000 100%)',
          color: 'white',
          py: 7,
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
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            pointerEvents: 'none'
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
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
              JOIN THE REVOLUTION
            </Typography>
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                mb: 3,
                fontSize: { xs: '2rem', md: '3rem' },
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                animation: 'fadeInUp 0.8s ease-out 0.2s both',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(20px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              Membership Application
            </Typography>
            <Typography
              variant="h6"
              sx={{
                opacity: 0.95,
                maxWidth: '700px',
                mx: 'auto',
                lineHeight: 1.7,
                fontSize: '1.1rem',
                color: 'rgba(255, 255, 255, 0.9)',
                animation: 'fadeInUp 0.8s ease-out 0.3s both',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(20px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              Take your first step in the fight for economic freedom.
              Complete your application to join thousands of fighters across South Africa.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 4,
            border: '1px solid rgba(220, 20, 60, 0.15)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 1) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 100px rgba(220, 20, 60, 0.05)',
            animation: 'fadeInUp 0.8s ease-out 0.4s both',
            '@keyframes fadeInUp': {
              '0%': { opacity: 0, transform: 'translateY(30px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' }
            }
          }}
        >

          {/* Progress Stepper */}
          <Stepper
            activeStep={applicationStep}
            sx={{
              mb: 6,
              '& .MuiStepLabel-root .Mui-completed': {
                color: '#8B0000',
              },
              '& .MuiStepLabel-root .Mui-active': {
                color: '#DC143C',
              },
              '& .MuiStepConnector-root': {
                '&.Mui-completed .MuiStepConnector-line': {
                  borderColor: '#8B0000',
                  borderWidth: 2,
                },
                '&.Mui-active .MuiStepConnector-line': {
                  borderColor: '#DC143C',
                  borderWidth: 2,
                },
              },
              '& .MuiStepIcon-root': {
                fontSize: '1.8rem',
                '&.Mui-completed': {
                  color: '#8B0000',
                },
                '&.Mui-active': {
                  color: '#DC143C',
                  filter: 'drop-shadow(0 2px 4px rgba(220, 20, 60, 0.3))',
                },
              },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontWeight: 500,
                      fontSize: '0.9rem',
                    },
                    '& .MuiStepLabel-label.Mui-active': {
                      color: '#DC143C',
                      fontWeight: 700,
                    },
                    '& .MuiStepLabel-label.Mui-completed': {
                      color: '#8B0000',
                      fontWeight: 600,
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

        {/* Step Content */}
        <Box sx={{ mb: 4 }}>
          {renderStepContent(applicationStep)}
        </Box>

        {/* Error Display */}
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Please correct the errors above before proceeding.
          </Alert>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button
            onClick={handleBack}
            disabled={applicationStep === 0}
            variant="outlined"
            startIcon={<ArrowBack />}
            sx={{
              borderColor: 'rgba(220, 20, 60, 0.3)',
              color: '#DC143C',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              borderRadius: 3,
              textTransform: 'none',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#DC143C',
                backgroundColor: 'rgba(220, 20, 60, 0.05)',
                transform: 'translateX(-3px)',
              },
              '&:disabled': {
                borderColor: 'rgba(0, 0, 0, 0.12)',
                color: 'rgba(0, 0, 0, 0.26)',
              }
            }}
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                resetApplication();
                navigate('/');
              }}
              sx={{
                borderColor: 'rgba(0, 0, 0, 0.23)',
                color: 'text.secondary',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'rgba(0, 0, 0, 0.5)',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                }
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              size="large"
              onClick={handleNext}
              disabled={submitApplicationMutation.isPending || isCheckingId}
              startIcon={isCheckingId ? <CircularProgress size={20} color="inherit" /> : null}
              endIcon={!isCheckingId && <ArrowForward />}
              sx={{
                background: applicationStep === steps.length - 1
                  ? 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)'
                  : 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                color: 'white',
                fontWeight: 700,
                px: 4,
                py: 1.8,
                textTransform: 'none',
                borderRadius: 3,
                fontSize: '1.05rem',
                boxShadow: applicationStep === steps.length - 1
                  ? '0 6px 20px rgba(139, 0, 0, 0.4)'
                  : '0 6px 20px rgba(220, 20, 60, 0.4)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: applicationStep === steps.length - 1
                    ? 'linear-gradient(135deg, #6B0000 0%, #4B0000 100%)'
                    : 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)',
                  transform: 'translateY(-3px)',
                  boxShadow: applicationStep === steps.length - 1
                    ? '0 8px 28px rgba(139, 0, 0, 0.5)'
                    : '0 8px 28px rgba(220, 20, 60, 0.5)',
                },
                '&:disabled': {
                  background: 'rgba(0, 0, 0, 0.12)',
                  color: 'rgba(0, 0, 0, 0.26)',
                  boxShadow: 'none',
                },
              }}
            >
              {isCheckingId
                ? 'Verifying ID...'
                : applicationStep === steps.length - 1
                ? (submitApplicationMutation.isPending ? 'Submitting...' : 'Submit Application')
                : 'Next'
              }
            </Button>
          </Box>
        </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default MembershipApplicationPage;
