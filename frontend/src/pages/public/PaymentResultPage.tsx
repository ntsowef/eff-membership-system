/**
 * PaymentResultPage
 * Handles the 3DS redirect return from Peach Payments.
 * Reads the paymentId and transaction id from URL params,
 * calls the backend to verify the payment status, and shows the result.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Home,
  Replay,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

const PaymentResultPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const paymentId = searchParams.get('paymentId');
  const transactionId = searchParams.get('id');
  const resourcePath = searchParams.get('resourcePath');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentId) {
        setError('No payment ID found. Unable to verify payment.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/payments/payment-status/${paymentId}`);
        setResult(response.data);
      } catch (err: any) {
        console.error('Payment verification error:', err);
        setError(err.response?.data?.message || 'Unable to verify payment status. Please contact support.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [paymentId]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} sx={{ color: '#DC143C' }} />
        <Typography variant="h6" sx={{ mt: 3, fontWeight: 600 }}>
          Verifying your payment...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Please wait while we confirm your payment with the bank.
        </Typography>
      </Box>
    );
  }

  const isSuccess = result?.success === true;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', p: 3 }}>
      <Card
        elevation={4}
        sx={{
          maxWidth: 520,
          width: '100%',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {/* Status Banner */}
        <Box
          sx={{
            background: isSuccess
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
            color: 'white',
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {isSuccess ? (
            <CheckCircle sx={{ fontSize: 64, mb: 1 }} />
          ) : (
            <Cancel sx={{ fontSize: 64, mb: 1 }} />
          )}
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
                {isSuccess
                  ? 'Your payment has been processed successfully. Your membership has been updated.'
                  : result?.message || 'Your payment could not be processed. Please try again or contact support.'}
              </Typography>

              {/* Payment Details */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Payment Details
                </Typography>
                {result?.transactionId && (
                  <Typography variant="body2" color="text.secondary">
                    Transaction ID: <strong>{result.transactionId}</strong>
                  </Typography>
                )}
                {result?.resultCode && (
                  <Typography variant="body2" color="text.secondary">
                    Result: <strong>{result.resultCode}</strong> — {result.resultDescription}
                  </Typography>
                )}
                {result?.amount && (
                  <Typography variant="body2" color="text.secondary">
                    Amount: <strong>R{parseFloat(result.amount).toFixed(2)}</strong>
                  </Typography>
                )}
                {result?.paymentBrand && (
                  <Typography variant="body2" color="text.secondary">
                    Card: <strong>{result.paymentBrand}</strong>
                  </Typography>
                )}
              </Paper>
            </>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Home />}
              onClick={() => navigate('/')}
              sx={{
                background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)' },
              }}
            >
              Go Home
            </Button>
            {!isSuccess && (
              <Button
                variant="outlined"
                startIcon={<Replay />}
                onClick={() => navigate('/renew')}
                color="error"
              >
                Try Again
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentResultPage;
