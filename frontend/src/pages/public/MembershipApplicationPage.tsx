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
} from '@mui/material';

import { useApplication } from '../../store';
import PersonalInfoStep from '../../components/application/PersonalInfoStep';
import ContactInfoStep from '../../components/application/ContactInfoStep';
import PartyDeclarationStep from '../../components/application/PartyDeclarationStep';
import PaymentStep from '../../components/application/PaymentStep';
import ReviewStep from '../../components/application/ReviewStep';
import { useMutation } from '@tanstack/react-query';
import { apiPost } from '../../lib/api';
import { useUI } from '../../store';

const steps = [
  'Personal Information',
  'Contact Information',
  'Party Declaration & Signature',
  'Payment Information',
  'Review & Submit',
];

const MembershipApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { applicationStep, setApplicationStep, applicationData, resetApplication } = useApplication();
  const { addNotification } = useUI();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submitApplicationMutation = useMutation({
    mutationFn: (data: any) => apiPost<{data: {application_id: string}}>('/membership-applications', data),
    onSuccess: (response) => {
      addNotification({
        type: 'success',
        message: 'Application submitted successfully!',
      });
      resetApplication();
      navigate('/application-status', {
        state: { applicationId: response.data.application_id }
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to submit application',
      });
    },
  });

  const handleNext = () => {
    // Validate current step
    const stepErrors = validateStep(applicationStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    if (applicationStep === steps.length - 1) {
      // Submit application
      handleSubmit();
    } else {
      setApplicationStep(applicationStep + 1);
    }
  };

  const handleBack = () => {
    setApplicationStep(applicationStep - 1);
  };

  const handleSubmit = () => {
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
      {/* Hero Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #FE0000 0%, #E20202 100%)',
          color: 'white',
          py: 6,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center">
            <Typography
              variant="overline"
              sx={{
                color: '#FFAB00',
                fontWeight: 600,
                fontSize: '0.875rem',
                letterSpacing: '0.1em',
                mb: 2,
                display: 'block',
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
                mb: 2,
                fontSize: { xs: '2rem', md: '3rem' },
              }}
            >
              Membership Application
            </Typography>
            <Typography
              variant="h6"
              sx={{
                opacity: 0.95,
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.5,
              }}
            >
              Take your first step in the fight for economic freedom.
              Complete your application to join thousands of fighters across South Africa.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper
          elevation={8}
          sx={{
            p: 5,
            borderRadius: 4,
            border: '1px solid rgba(254, 0, 0, 0.1)',
            boxShadow: '0px 8px 40px rgba(0, 0, 0, 0.12)',
          }}
        >

          {/* Progress Stepper */}
          <Stepper
            activeStep={applicationStep}
            sx={{
              mb: 5,
              '& .MuiStepLabel-root .Mui-completed': {
                color: '#055305',
              },
              '& .MuiStepLabel-root .Mui-active': {
                color: '#FE0000',
              },
              '& .MuiStepConnector-root': {
                '&.Mui-completed .MuiStepConnector-line': {
                  borderColor: '#055305',
                },
                '&.Mui-active .MuiStepConnector-line': {
                  borderColor: '#FE0000',
                },
              },
              '& .MuiStepIcon-root': {
                '&.Mui-completed': {
                  color: '#055305',
                },
                '&.Mui-active': {
                  color: '#FE0000',
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
                      fontSize: '0.875rem',
                    },
                    '& .MuiStepLabel-label.Mui-active': {
                      color: '#FE0000',
                      fontWeight: 600,
                    },
                    '& .MuiStepLabel-label.Mui-completed': {
                      color: '#055305',
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={handleBack}
            disabled={applicationStep === 0}
            variant="outlined"
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
            >
              Cancel
            </Button>
            
            <Button
              variant="contained"
              size="large"
              onClick={handleNext}
              disabled={submitApplicationMutation.isPending}
              sx={{
                backgroundColor: applicationStep === steps.length - 1 ? '#055305' : '#FE0000',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                borderRadius: 3,
                fontSize: '1rem',
                boxShadow: applicationStep === steps.length - 1
                  ? '0px 4px 20px rgba(5, 83, 5, 0.4)'
                  : '0px 4px 20px rgba(254, 0, 0, 0.4)',
                '&:hover': {
                  backgroundColor: applicationStep === steps.length - 1 ? '#033303' : '#E20202',
                  transform: 'translateY(-1px)',
                  boxShadow: applicationStep === steps.length - 1
                    ? '0px 6px 25px rgba(5, 83, 5, 0.5)'
                    : '0px 6px 25px rgba(254, 0, 0, 0.5)',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(0, 0, 0, 0.12)',
                  color: 'rgba(0, 0, 0, 0.26)',
                  boxShadow: 'none',
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {applicationStep === steps.length - 1
                ? (submitApplicationMutation.isPending ? 'Submitting...' : 'Submit Application')
                : 'Next'
              }
            </Button>
          </Box>
        </Box>

          {/* Help Text */}
          <Box
            sx={{
              mt: 5,
              p: 3,
              background: 'linear-gradient(135deg, rgba(255, 171, 0, 0.1) 0%, rgba(255, 171, 0, 0.05) 100%)',
              border: '1px solid rgba(255, 171, 0, 0.2)',
              borderRadius: 3,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                color: 'text.primary',
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              <Box component="span" sx={{ color: '#FE0000', fontWeight: 600 }}>
                Need Help?
              </Box>{' '}
              If you encounter any issues during the application process,
              contact our membership support team at{' '}
              <Box component="span" sx={{ color: '#FE0000', fontWeight: 600 }}>
                membership@eff.org.za
              </Box>{' '}
              or call{' '}
              <Box component="span" sx={{ color: '#FE0000', fontWeight: 600 }}>
                +27 11 447 4797
              </Box>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default MembershipApplicationPage;
