/**
 * Member Self-Service Renewal Portal
 * Multi-step renewal process with authentication integration
 */

import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Container,
} from '@mui/material';
import { useRenewalStore } from '../../store/renewalStore';
import IdNumberEntryStep from './steps/IdNumberEntryStep';
import ReviewUpdateInfoStep from './steps/ReviewUpdateInfoStep';
import PaymentInfoStep from './steps/PaymentInfoStep';
import ConfirmationStep from './steps/ConfirmationStep';

const steps = [
  'Enter ID Number',
  'Review & Update Information',
  'Payment Information',
  'Confirmation',
];

const MemberSelfServicePortal: React.FC = () => {
  const { currentStep } = useRenewalStore();

  // Map step names to indices
  const getActiveStepIndex = (): number => {
    switch (currentStep) {
      case 'id-entry':
        return 0;
      case 'review-info':
        return 1;
      case 'payment':
        return 2;
      case 'confirmation':
        return 3;
      default:
        return 0;
    }
  };

  // Render the appropriate step component
  const renderStepContent = () => {
    switch (currentStep) {
      case 'id-entry':
        return <IdNumberEntryStep />;
      case 'review-info':
        return <ReviewUpdateInfoStep />;
      case 'payment':
        return <PaymentInfoStep />;
      case 'confirmation':
        return <ConfirmationStep />;
      default:
        return <IdNumberEntryStep />;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 0 }}>
      {/* Stepper */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          border: '1px solid rgba(220, 20, 60, 0.15)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 1) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 100px rgba(220, 20, 60, 0.05)',
        }}
      >
        <Stepper
          activeStep={getActiveStepIndex()}
          alternativeLabel
          sx={{
            '& .MuiStepLabel-root .Mui-completed': {
              color: '#DC143C',
            },
            '& .MuiStepLabel-root .Mui-active': {
              color: '#DC143C',
            },
            '& .MuiStepConnector-line': {
              borderColor: 'rgba(220, 20, 60, 0.2)',
            },
            '& .Mui-completed .MuiStepConnector-line': {
              borderColor: '#DC143C',
            },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      <Box sx={{ mb: 4 }}>
        {renderStepContent()}
      </Box>
    </Container>
  );
};

export default MemberSelfServicePortal;

