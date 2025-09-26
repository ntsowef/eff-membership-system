import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
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
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';

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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Application Status
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Track the progress of your membership application
        </Typography>

        {/* Search Section */}
        {!applicationId && (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
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
                />
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={!searchId.trim()}
                  startIcon={<Search />}
                  sx={{ minWidth: 120 }}
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
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6" gutterBottom>
                      Application #{application.data.application_id}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Submitted on {new Date(application.data.created_at).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      Applicant: {application.data.firstname} {application.data.surname}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                    <Chip
                      icon={getStatusIcon(application.data.status)}
                      label={application.data.status.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(application.data.status) as any}
                      size="medium"
                      sx={{ fontSize: '1rem', py: 2 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Progress Stepper */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Application Progress
                </Typography>
                <Stepper orientation="vertical">
                  {applicationSteps.map((step, index) => (
                    <Step key={index} active={true} completed={step.completed}>
                      <StepLabel>
                        <Typography variant="subtitle1">
                          {step.label}
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary">
                          {step.description}
                        </Typography>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>

            {/* Application Details */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Application Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Membership Type
                    </Typography>
                    <Typography variant="body1">
                      {application.data.membership_type}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Organizational Level
                    </Typography>
                    <Typography variant="body1">
                      {application.data.hierarchy_level}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {application.data.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
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
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => refetch()}
              >
                Refresh Status
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setApplicationId('');
                  setSearchId('');
                }}
              >
                Search Another Application
              </Button>
            </Box>
          </Box>
        )}

        {/* Help Section */}
        <Box sx={{ mt: 4, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Need Help?</strong> If you have questions about your application status 
            or need to update your information, please contact us at applications@geomaps.org 
            or call +27 11 123 4567.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ApplicationStatusPage;
