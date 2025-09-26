import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,

  List,
  ListItem,
  ListItemText,
  Chip,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { useApplication } from '../../store';

const ReviewStep: React.FC = () => {
  const { applicationData, updateApplicationData } = useApplication();

  const handleAgreementChange = (field: string, checked: boolean) => {
    updateApplicationData({ [field]: checked });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Your Application
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please review all the information below carefully before submitting your application.
        You can go back to previous steps to make any changes if needed.
      </Typography>

      {/* Personal Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            Personal Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Full Name</Typography>
              <Typography variant="body1">
                {applicationData.firstname} {applicationData.surname}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
              <Typography variant="body1">
                {formatDate(applicationData.date_of_birth || '')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Gender</Typography>
              <Typography variant="body1">
                {applicationData.gender || 'Not specified'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">ID Number</Typography>
              <Typography variant="body1">
                {applicationData.id_number || 'Not provided'}
              </Typography>
            </Grid>
            {applicationData.nationality && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Nationality</Typography>
                <Typography variant="body1">{applicationData.nationality}</Typography>
              </Grid>
            )}
            {applicationData.occupation && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Occupation</Typography>
                <Typography variant="body1">{applicationData.occupation}</Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography variant="body1">{applicationData.email}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Phone</Typography>
              <Typography variant="body1">{applicationData.phone}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">Address</Typography>
              <Typography variant="body1">
                {applicationData.address}
                {applicationData.city && `, ${applicationData.city}`}
                {applicationData.province && `, ${applicationData.province}`}
                {applicationData.postal_code && ` ${applicationData.postal_code}`}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Membership Details */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            Membership Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Organizational Level</Typography>
              <Typography variant="body1">{applicationData.hierarchy_level}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Entity/Branch</Typography>
              <Typography variant="body1">{applicationData.entity_name || 'Not specified'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">Membership Type</Typography>
              <Chip 
                label={applicationData.membership_type} 
                color="primary" 
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </Grid>
            {applicationData.reason_for_joining && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Reason for Joining</Typography>
                <Typography variant="body1">{applicationData.reason_for_joining}</Typography>
              </Grid>
            )}
            {applicationData.skills_experience && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Skills and Experience</Typography>
                <Typography variant="body1">{applicationData.skills_experience}</Typography>
              </Grid>
            )}
            {applicationData.referred_by && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Referred By</Typography>
                <Typography variant="body1">{applicationData.referred_by}</Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            Payment Information
          </Typography>
          {applicationData.last_payment_date ||
           applicationData.payment_method ||
           applicationData.payment_reference ||
           applicationData.payment_amount ? (
            <Grid container spacing={2}>
              {applicationData.last_payment_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Payment Date</Typography>
                  <Typography variant="body1">{formatDate(applicationData.last_payment_date)}</Typography>
                </Grid>
              )}
              {applicationData.payment_amount && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Payment Amount</Typography>
                  <Typography variant="body1">R{parseFloat(applicationData.payment_amount.toString()).toFixed(2)}</Typography>
                </Grid>
              )}
              {applicationData.payment_method && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Payment Method</Typography>
                  <Typography variant="body1">{applicationData.payment_method}</Typography>
                </Grid>
              )}
              {applicationData.payment_reference && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Payment Reference</Typography>
                  <Typography variant="body1">{applicationData.payment_reference}</Typography>
                </Grid>
              )}
              {applicationData.payment_notes && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Payment Notes</Typography>
                  <Typography variant="body1">{applicationData.payment_notes}</Typography>
                </Grid>
              )}
            </Grid>
          ) : (
            <Alert severity="info">
              <Typography variant="body2">
                No payment information provided. Payment can be processed after application approval.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      {applicationData.documents && applicationData.documents.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Uploaded Documents
            </Typography>
            <List dense>
              {applicationData.documents.map((doc: any, index: number) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={doc.name}
                    secondary={`${(doc.size / 1024 / 1024).toFixed(2)} MB`}
                  />
                  <Chip label="Uploaded" color="success" size="small" />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Terms and Conditions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            Terms and Conditions
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={applicationData.agree_terms || false}
                onChange={(e) => handleAgreementChange('agree_terms', e.target.checked)}
                required
              />
            }
            label={
              <Typography variant="body2">
                I agree to the <strong>Terms and Conditions</strong> of GEOMAPS membership
              </Typography>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={applicationData.agree_privacy || false}
                onChange={(e) => handleAgreementChange('agree_privacy', e.target.checked)}
                required
              />
            }
            label={
              <Typography variant="body2">
                I agree to the <strong>Privacy Policy</strong> and consent to the processing of my personal data
              </Typography>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={applicationData.agree_communications || false}
                onChange={(e) => handleAgreementChange('agree_communications', e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                I consent to receive communications from GEOMAPS via email and SMS (Optional)
              </Typography>
            }
          />
        </CardContent>
      </Card>

      {/* Submission Notice */}
      <Alert severity="info">
        <Typography variant="body2">
          <strong>What happens next?</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          • Your application will be reviewed by our membership committee
        </Typography>
        <Typography variant="body2">
          • You will receive an email confirmation with your application reference number
        </Typography>
        <Typography variant="body2">
          • The review process typically takes 5-10 business days
        </Typography>
        <Typography variant="body2">
          • You will be notified of the decision via email and SMS
        </Typography>
      </Alert>
    </Box>
  );
};

export default ReviewStep;
