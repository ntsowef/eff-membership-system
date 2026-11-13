/**
 * Member Self-Service Renewal Portal
 * Multi-step renewal process visually aligned with MembershipApplicationPage (/apply)
 */

import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  HowToVote,
  Person,
  Payment,
  RateReview,
} from '@mui/icons-material';
import { useRenewalStore } from '../../store/renewalStore';
import IdNumberEntryStep from './steps/IdNumberEntryStep';
import ReviewUpdateInfoStep from './steps/ReviewUpdateInfoStep';
import PaymentInfoStep from './steps/PaymentInfoStep';
import ConfirmationStep from './steps/ConfirmationStep';

const steps = [
  { label: 'Enter ID Number', icon: <HowToVote /> },
  { label: 'Review & Update Information', icon: <Person /> },
  { label: 'Payment Information', icon: <Payment /> },
  { label: 'Confirmation', icon: <RateReview /> },
];

const MemberSelfServicePortal: React.FC = () => {
  const { currentStep } = useRenewalStore();

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

  const activeStepIndex = getActiveStepIndex();

  return (
    <Box>
      {/* Progress Stepper aligned with /apply */}
      <Stepper
        activeStep={activeStepIndex}
        sx={{
          mb: 5,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          rowGap: 1.5,
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
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              StepIconComponent={() => (
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: index < activeStepIndex
                      ? '#8B0000'
                      : index === activeStepIndex
                        ? '#DC143C'
                        : 'grey.300',
                    color: index <= activeStepIndex ? 'white' : 'grey.600',
                    transition: 'background-color 0.3s ease, color 0.3s ease',
                    '@media (prefers-reduced-motion: reduce)': {
                      transition: 'none',
                    },
                    '& svg': { fontSize: 18 },
                  }}
                >
                  {step.icon}
                </Box>
              )}
              sx={{
                '& .MuiStepLabel-label': {
                  fontWeight: 500,
                  fontSize: '0.85rem',
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
              {step.label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step Content */}
      <Box>
        {renderStepContent()}
      </Box>
    </Box>
  );
};

export default MemberSelfServicePortal;
