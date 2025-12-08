import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  CheckCircle,
  Schedule,
  Assignment,
  Person,
  Refresh,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import PublicHeader from '../../components/layout/PublicHeader';

const ApplicationStatusPage: React.FC = () => {
  const location = useLocation();
  const [applicationId, setApplicationId] = useState(
    location.state?.applicationId || ''
  );
  const [searchId, setSearchId] = useState('');

  const { data: application, isLoading, error, refetch } = useQuery({
    queryKey: ['application-status', applicationId],
    queryFn: () => apiGet<{data: any}>(`/membership-applications/${applicationId}/status`),
    enabled: !!applicationId,
  });

  const handleSearch = () => {
    setApplicationId(searchId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'under_review':
        return 'info';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Schedule />;
      case 'under_review':
        return <Assignment />;
      case 'approved':
        return <CheckCircle />;
      case 'rejected':
        return <Person />;
      default:
        return <Schedule />;
    }
  };

  const applicationSteps = [
    {
      label: 'Application Submitted',
      description: 'Your application has been received and is in our system',
      completed: true,
    },
    {
      label: 'Document Verification',
      description: 'We are verifying the documents you submitted',
      completed: application?.data?.status !== 'pending',
    },
    {
      label: 'Committee Review',
      description: 'Your application is being reviewed by the membership committee',
      completed: ['approved', 'rejected'].includes(application?.data?.status),
    },
    {
      label: 'Decision',
      description: 'Final decision on your membership application',
      completed: ['approved', 'rejected'].includes(application?.data?.status),
    },
  ];

  return (
    <Box>
      {/* Sticky Header */}
      <PublicHeader />

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
              TRACK YOUR APPLICATION
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
              Application Status
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
              Track the progress of your membership application in real-time
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 8 }}>

        {/* Search Section */}
        {!applicationId && (
          <Card
            elevation={0}
            sx={{
              mb: 5,
              borderRadius: 4,
              border: '2px solid rgba(220, 20, 60, 0.15)',
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
            <CardContent sx={{ p: 5 }}>
              <Typography
                variant="h5"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  mb: 3,
                }}
              >
                Find Your Application
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  label="Application ID"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  helperText="Enter your application reference number (e.g., APP-2024-001234)"
                  placeholder="APP-2024-001234"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      '& fieldset': {
                        borderColor: 'rgba(220, 20, 60, 0.2)',
                        borderWidth: 2,
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(220, 20, 60, 0.4)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#DC143C',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#DC143C',
                      fontWeight: 600,
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={!searchId.trim()}
                  startIcon={<Search />}
                  sx={{
                    minWidth: 140,
                    background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                    color: 'white',
                    fontWeight: 700,
                    px: 4,
                    py: 2,
                    borderRadius: 3,
                    fontSize: '1rem',
                    textTransform: 'none',
                    boxShadow: '0 6px 20px rgba(220, 20, 60, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 8px 28px rgba(220, 20, 60, 0.5)',
                    },
                    '&:disabled': {
                      background: 'rgba(0, 0, 0, 0.12)',
                      color: 'rgba(0, 0, 0, 0.26)',
                      boxShadow: 'none',
                    }
                  }}
                >
                  Search
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Application not found. Please check your application ID and try again.
          </Alert>
        )}

        {/* Application Details */}
        {application?.data && (
          <Box>
            {/* Status Overview */}
            <Card
              elevation={0}
              sx={{
                mb: 5,
                borderRadius: 4,
                border: '2px solid rgba(220, 20, 60, 0.15)',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 1) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 100px rgba(220, 20, 60, 0.05)',
                animation: 'fadeInUp 0.8s ease-out 0.5s both',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <CardContent sx={{ p: 5 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography
                      variant="h5"
                      gutterBottom
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                      }}
                    >
                      Application #{application.data.application_id}
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{
                        fontSize: '1rem',
                        mb: 1,
                      }}
                    >
                      Submitted on {new Date(application.data.created_at).toLocaleDateString()}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        mt: 1,
                        fontWeight: 600,
                        fontSize: '1.05rem',
                      }}
                    >
                      Applicant: {application.data.firstname} {application.data.surname}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                    <Chip
                      icon={getStatusIcon(application.data.status)}
                      label={application.data.status.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(application.data.status) as any}
                      size="medium"
                      sx={{
                        fontSize: '1.05rem',
                        py: 3,
                        px: 2,
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Progress Stepper */}
            <Card
              elevation={0}
              sx={{
                mb: 5,
                borderRadius: 4,
                border: '2px solid rgba(220, 20, 60, 0.15)',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 1) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 100px rgba(220, 20, 60, 0.05)',
                animation: 'fadeInUp 0.8s ease-out 0.6s both',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <CardContent sx={{ p: 5 }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    mb: 4,
                  }}
                >
                  Application Progress
                </Typography>
                <Stepper
                  orientation="vertical"
                  sx={{
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
                  {applicationSteps.map((step, index) => (
                    <Step key={index} active={true} completed={step.completed}>
                      <StepLabel>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: step.completed ? 700 : 600,
                            fontSize: '1.05rem',
                          }}
                        >
                          {step.label}
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: '0.95rem',
                            lineHeight: 1.6,
                          }}
                        >
                          {step.description}
                        </Typography>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>

            {/* Application Details */}
            <Card
              elevation={0}
              sx={{
                mb: 5,
                borderRadius: 4,
                border: '2px solid rgba(220, 20, 60, 0.15)',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 1) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 100px rgba(220, 20, 60, 0.05)',
                animation: 'fadeInUp 0.8s ease-out 0.7s both',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <CardContent sx={{ p: 5 }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    mb: 4,
                  }}
                >
                  Application Details
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Membership Type
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        fontSize: '1rem',
                      }}
                    >
                      {application.data.membership_type}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Organizational Level
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        fontSize: '1rem',
                      }}
                    >
                      {application.data.hierarchy_level}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Email
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        fontSize: '1rem',
                      }}
                    >
                      {application.data.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Phone
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        fontSize: '1rem',
                      }}
                    >
                      {application.data.phone}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Status-specific Messages */}
            {application.data.status === 'pending' && (
              <Alert severity="info">
                Your application is currently pending review. We will contact you within 5-10 business days.
              </Alert>
            )}

            {application.data.status === 'under_review' && (
              <Alert severity="info">
                Your application is currently under review by our membership committee. 
                We may contact you if additional information is required.
              </Alert>
            )}

            {application.data.status === 'approved' && (
              <Alert severity="success">
                Congratulations! Your membership application has been approved. 
                You will receive your membership details via email shortly.
              </Alert>
            )}

            {application.data.status === 'rejected' && (
              <Alert severity="error">
                Unfortunately, your application was not approved at this time. 
                You will receive detailed feedback via email.
              </Alert>
            )}

            {/* Actions */}
            <Box
              sx={{
                mt: 4,
                display: 'flex',
                gap: 3,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="contained"
                onClick={() => refetch()}
                startIcon={<Refresh />}
                sx={{
                  background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                  color: 'white',
                  fontWeight: 700,
                  px: 4,
                  py: 1.8,
                  borderRadius: 3,
                  fontSize: '1rem',
                  textTransform: 'none',
                  boxShadow: '0 6px 20px rgba(220, 20, 60, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)',
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 28px rgba(220, 20, 60, 0.5)',
                  },
                }}
              >
                Refresh Status
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setApplicationId('');
                  setSearchId('');
                }}
                startIcon={<Search />}
                sx={{
                  borderColor: 'rgba(220, 20, 60, 0.3)',
                  color: '#DC143C',
                  fontWeight: 700,
                  px: 4,
                  py: 1.8,
                  borderRadius: 3,
                  fontSize: '1rem',
                  textTransform: 'none',
                  borderWidth: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#DC143C',
                    backgroundColor: 'rgba(220, 20, 60, 0.05)',
                    borderWidth: 2,
                  },
                }}
              >
                Search Another Application
              </Button>
            </Box>
          </Box>
        )}

        {/* Help Section */}
        <Box
          sx={{
            mt: 6,
            p: 4,
            background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.08) 0%, rgba(139, 0, 0, 0.05) 100%)',
            border: '2px solid rgba(220, 20, 60, 0.2)',
            borderRadius: 4,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 16px rgba(220, 20, 60, 0.1)',
          }}
        >
          <Typography
            variant="body1"
            sx={{
              color: 'text.primary',
              fontWeight: 500,
              textAlign: 'center',
              lineHeight: 1.7,
              fontSize: '1rem',
            }}
          >
            <Box component="span" sx={{ color: '#DC143C', fontWeight: 700, fontSize: '1.1rem' }}>
              Need Help?
            </Box>{' '}
            If you have questions about your application status
            or need to update your information, please contact us at{' '}
            <Box component="span" sx={{ color: '#DC143C', fontWeight: 700 }}>
              membership@eff.org.za
            </Box>{' '}
            or call{' '}
            <Box component="span" sx={{ color: '#DC143C', fontWeight: 700 }}>
              +27 11 447 4797
            </Box>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default ApplicationStatusPage;
