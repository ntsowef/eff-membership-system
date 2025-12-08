import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Grid,
  Paper,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  VerifiedUser,
  Error,
  Warning,
  CheckCircle,
  Person,
  QrCodeScanner,
  Security,
  Schedule,
  LocationOn,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { showWarning, showInfo } from '../../utils/sweetAlert';

interface VerificationResult {
  valid: boolean;
  member_info?: any;
  card_info?: any;
  verification_details: any;
}

const CardVerification: React.FC = () => {
  const [cardData, setCardData] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Card verification mutation
  const verifyCardMutation = useMutation({
    mutationFn: async (data: { card_data: string }) => {
      const response = await api.post('/digital-cards/verify', {
        card_data: data.card_data,
        verification_source: 'manual_entry'
      });
      return response.data.data.verification_result;
    },
    onSuccess: (result) => {
      setVerificationResult(result);
    }
  });

  const handleVerifyCard = () => {
    if (!cardData.trim()) {
      showWarning('Please enter card data to verify', 'No Data');
      return;
    }

    try {
      // Try to parse as JSON to validate format
      JSON.parse(cardData);
      verifyCardMutation.mutate({ card_data: cardData });
    } catch (error) {
      showWarning('Invalid card data format. Please enter valid JSON data from QR code.', 'Invalid Format');
    }
  };

  const handleScanQRCode = () => {
    // In a real implementation, this would open camera for QR scanning
    showInfo('QR Code scanning would be implemented using device camera. For now, please paste the QR code data manually.', 'Coming Soon');
  };

  const getVerificationIcon = (valid: boolean) => {
    if (valid) {
      return <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />;
    } else {
      return <Error sx={{ fontSize: 60, color: 'error.main' }} />;
    }
  };

  const getStatusColor = (valid: boolean) => {
    return valid ? 'success' : 'error';
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VerifiedUser color="primary" />
            Digital Membership Card Verification
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Verify the authenticity of digital membership cards using QR code data
          </Typography>

          {/* Input Section */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Card Data (QR Code Content)"
                value={cardData}
                onChange={(e) => setCardData(e.target.value)}
                placeholder='Paste QR code JSON data here, e.g., {"card_id":"...","member_id":"...","security_hash":"..."}'
                helperText="Scan the QR code on the membership card or paste the JSON data manually"
              />
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<QrCodeScanner />}
              onClick={handleScanQRCode}
            >
              Scan QR Code
            </Button>
            <Button
              variant="contained"
              startIcon={verifyCardMutation.isPending ? <CircularProgress size={20} /> : <Security />}
              onClick={handleVerifyCard}
              disabled={!cardData.trim() || verifyCardMutation.isPending}
            >
              {verifyCardMutation.isPending ? 'Verifying...' : 'Verify Card'}
            </Button>
          </Box>

          {/* Error Display */}
          {verifyCardMutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to verify card. Please check the card data format and try again.
            </Alert>
          )}

          {/* Verification Result */}
          {verificationResult && (
            <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                {getVerificationIcon(verificationResult.valid)}
                <Typography variant="h5" sx={{ mt: 1, color: verificationResult.valid ? 'success.main' : 'error.main' }}>
                  {verificationResult.valid ? 'VALID CARD' : 'INVALID CARD'}
                </Typography>
                <Chip 
                  label={verificationResult.valid ? 'Verified' : 'Verification Failed'}
                  color={getStatusColor(verificationResult.valid)}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Divider sx={{ mb: 3 }} />

              {verificationResult.valid && verificationResult.member_info && verificationResult.card_info ? (
                <Grid container spacing={3}>
                  {/* Member Information */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person color="primary" />
                      Member Information
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Full Name:</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {verificationResult.member_info.first_name} {verificationResult.member_info.last_name}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Member ID:</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {verificationResult.member_info.member_id}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Membership Number:</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {verificationResult.card_info.membership_number}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">Province:</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {verificationResult.member_info.province_name}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Card Information */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Security color="primary" />
                      Card Information
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Card ID:</Typography>
                      <Typography variant="body1" fontWeight="medium" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {verificationResult.card_info.card_id}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Card Number:</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {verificationResult.card_info.card_number}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule fontSize="small" color="action" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">Expiry Date:</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {new Date(verificationResult.card_info.expiry_date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Security Hash:</Typography>
                      <Typography variant="body1" fontWeight="medium" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {verificationResult.card_info.security_hash}...
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Verification Details */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Verification Details
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                          <CheckCircle color="success" sx={{ mb: 1 }} />
                          <Typography variant="body2" fontWeight="medium">Member Exists</Typography>
                          <Typography variant="caption" color="text.secondary">Verified</Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                          <CheckCircle color="success" sx={{ mb: 1 }} />
                          <Typography variant="body2" fontWeight="medium">Security Valid</Typography>
                          <Typography variant="caption" color="text.secondary">Hash Verified</Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                          {verificationResult.verification_details.card_expired ? 
                            <Warning color="warning" sx={{ mb: 1 }} /> : 
                            <CheckCircle color="success" sx={{ mb: 1 }} />
                          }
                          <Typography variant="body2" fontWeight="medium">Card Status</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {verificationResult.verification_details.card_expired ? 'Expired' : 'Active'}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                          <CheckCircle color="success" sx={{ mb: 1 }} />
                          <Typography variant="body2" fontWeight="medium">Verification Time</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(verificationResult.verification_details.verification_time).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              ) : (
                <Box>
                  <Typography variant="h6" color="error.main" gutterBottom>
                    Verification Failed
                  </Typography>
                  <Alert severity="error">
                    {verificationResult.verification_details.error || 'Card verification failed. The card may be invalid, expired, or tampered with.'}
                  </Alert>
                  
                  {verificationResult.verification_details.missing_fields && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Missing required fields:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {verificationResult.verification_details.missing_fields.map((field: string, index: number) => (
                          <Chip key={index} label={field} size="small" color="error" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          )}

          {/* Sample QR Data for Testing */}
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2" gutterBottom>
              <strong>For Testing:</strong> You can use this sample QR code data:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: 'grey.100', p: 1, borderRadius: 1, mt: 1 }}>
              {`{"card_id":"CARD_123_abc","member_id":"186328","membership_number":"MEM186328","card_number":"DC12345678","name":"John Doe","expiry_date":"2025-12-31","security_hash":"a1b2c3d4e5f6g7h8","issued":"${new Date().toISOString()}"}`}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CardVerification;
