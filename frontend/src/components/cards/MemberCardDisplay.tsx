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
  Avatar,
  Divider,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Person,
  CreditCard,
  Download,
  Share,
  Print,
  QrCode,
  Security,
  LocationOn,
  CalendarToday,
  Badge,
  Refresh,
  FlipToBack,
  FlipToFront,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import QRCodeLib from 'qrcode';

interface MemberCardData {
  member_id: string;
  membership_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  province_name: string;
  municipality_name: string;
  ward_number: string;
  voting_station_name: string;
  membership_type: string;
  join_date: string;
  expiry_date: string;
  card_data?: any;
  qr_code_url?: string;
}

const MemberCardDisplay: React.FC = () => {
  const [idNumber, setIdNumber] = useState('');
  const [memberData, setMemberData] = useState<MemberCardData | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [membershipQRCode, setMembershipQRCode] = useState<string>('');

  // Fetch member data by ID number and generate card
  const fetchMemberMutation = useMutation({
    mutationFn: async (nationalIdNumber: string) => {
      // First get member data by ID number
      const memberResponse = await api.get(`/members/by-id-number/${nationalIdNumber}`);
      const member = memberResponse.data.data;

      // Then generate digital card data using the member_id
      const cardResponse = await api.post(`/digital-cards/generate-data/${member.member_id}`, {
        template: 'standard',
        issued_by: 'self_service'
      });
      const cardData = cardResponse.data.data;

      return {
        ...member,
        card_data: cardData.card_data,
        qr_code_url: cardData.qr_code_url
      };
    },
    onSuccess: async (data) => {
      setMemberData(data);
      setShowCard(true);

      // Generate QR code for membership number
      try {
        const membershipNumber = data.membership_number || `MEM${data.member_id.padStart(6, '0')}`;
        const qrCodeUrl = await QRCodeLib.toDataURL(membershipNumber, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setMembershipQRCode(qrCodeUrl);
      } catch (error) {
        console.error('Failed to generate membership QR code:', error);
      }
    }
  });

  // Download card PDF
  const downloadCardMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await api.post(`/digital-cards/generate/${memberId}`, {
        template: 'standard',
        issued_by: 'self_service'
      }, {
        responseType: 'blob'
      });
      return response.data;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-membership-card-${idNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  });

  const handleViewCard = () => {
    if (!idNumber.trim()) {
      alert('Please enter your ID Number');
      return;
    }

    fetchMemberMutation.mutate(idNumber.trim());
  };

  const handleDownloadCard = () => {
    if (!memberData) return;
    downloadCardMutation.mutate(memberData.member_id);
  };

  const handleShareCard = async () => {
    if (!memberData?.qr_code_url) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Digital Membership Card',
          text: `${memberData.first_name} ${memberData.last_name} - Member ID: ${memberData.membership_number}`,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `My Digital Membership Card\n${memberData.first_name} ${memberData.last_name}\nMember ID: ${memberData.membership_number}`
        );
        alert('Card information copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing card:', error);
    }
  };

  const handlePrintCard = () => {
    if (!showCard) return;
    window.print();
  };

  const handleReset = () => {
    setIdNumber('');
    setMemberData(null);
    setShowCard(false);
    setIsFlipped(false);
    setMembershipQRCode('');
  };

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <CreditCard color="primary" sx={{ fontSize: 40 }} />
          My Digital Membership Card
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Enter your Member ID to view and download your digital membership card
        </Typography>
      </Box>

      {/* Member ID Input */}
      {!showCard && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge color="primary" />
              Member Verification
            </Typography>

            <Grid container spacing={3} alignItems="end">
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="ID Number"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter your ID Number (e.g., 8001015009087)"
                  helperText="Enter your South African ID Number to access your digital membership card"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleViewCard();
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleViewCard}
                  disabled={!idNumber.trim() || fetchMemberMutation.isPending}
                  startIcon={fetchMemberMutation.isPending ? <CircularProgress size={20} /> : <CreditCard />}
                >
                  {fetchMemberMutation.isPending ? 'Loading...' : 'View My Card'}
                </Button>
              </Grid>
            </Grid>

            {/* Error Display */}
            {fetchMemberMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Member not found. Please check your ID Number and try again.
              </Alert>
            )}

            {/* Help Information */}
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Need help with your ID Number?</strong>
              </Typography>
              <Typography variant="body2">
                • Use your South African ID Number (13 digits)<br/>
                • Check your ID document or driver's license<br/>
                • Contact our support team for assistance<br/>
                • Example format: 8001015009087
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Digital Membership Card Display */}
      {showCard && memberData && (
        <Box>
          {/* Card Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Your Digital Membership Card
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isFlipped ? 'Back: Membership Number QR Code' : 'Front: Member Information'} • Click card to flip
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title={isFlipped ? "Flip to Front" : "Flip to Back"}>
                <IconButton onClick={handleFlipCard} color="primary">
                  {isFlipped ? <FlipToFront /> : <FlipToBack />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Download PDF">
                <IconButton
                  onClick={handleDownloadCard}
                  disabled={downloadCardMutation.isPending}
                  color="primary"
                >
                  {downloadCardMutation.isPending ? <CircularProgress size={20} /> : <Download />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Share Card">
                <IconButton onClick={handleShareCard} color="primary">
                  <Share />
                </IconButton>
              </Tooltip>
              <Tooltip title="Print Card">
                <IconButton onClick={handlePrintCard} color="primary">
                  <Print />
                </IconButton>
              </Tooltip>
              <Tooltip title="View Another Card">
                <IconButton onClick={handleReset} color="secondary">
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Flippable Digital Card */}
          <Box
            sx={{
              perspective: '1000px',
              mb: 4,
              height: 320,
              cursor: 'pointer'
            }}
            onClick={handleFlipCard}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front Side */}
              <Paper
                sx={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  p: 4,
                  background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                  color: 'white',
                  borderRadius: 3,
                  minHeight: 280,
                  boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
                  backfaceVisibility: 'hidden',
                  '@media print': {
                    boxShadow: 'none',
                    background: '#1976d2 !important',
                  }
                }}
              >
            {/* Card Header */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
                ORGANIZATION NAME
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                DIGITAL MEMBERSHIP CARD
              </Typography>
            </Box>

            {/* Province in top right */}
            <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, textAlign: 'right' }}>
                Province: {memberData.province_name}
              </Typography>
            </Box>

            {/* Member Information - Centered at Top */}
            <Box sx={{ textAlign: 'center', mt: 2, mb: 4 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
                {memberData.first_name} {memberData.last_name}
              </Typography>

              <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                {memberData.municipality_name}
              </Typography>

              <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                Ward Code: {memberData.ward_number}
              </Typography>

              <Typography variant="h6" sx={{ opacity: 0.9, mb: 3 }}>
                {memberData.voting_station_name}
              </Typography>

              {/* Membership Dates - Centered */}
              <Grid container spacing={4} justifyContent="center" sx={{ maxWidth: 400, mx: 'auto' }}>
                <Grid item xs={6} sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Member Since
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {new Date(memberData.join_date).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Valid Until
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {new Date(memberData.expiry_date || memberData.card_data?.expiry_date).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

                {/* Card Footer */}
                <Box sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: 16,
                  borderTop: '1px solid rgba(255,255,255,0.3)',
                  pt: 2
                }}>
                  <Grid container justifyContent="space-between" alignItems="center">
                    <Grid item>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Card No: {memberData.card_data?.card_number}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Issued: {new Date().toLocaleDateString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>

              {/* Back Side */}
              <Paper
                sx={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  p: 4,
                  background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
                  color: 'white',
                  borderRadius: 3,
                  minHeight: 280,
                  boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  '@media print': {
                    boxShadow: 'none',
                    background: '#0d47a1 !important',
                  }
                }}
              >
                {/* Back Side Header */}
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, textAlign: 'center' }}>
                  MEMBERSHIP VERIFICATION
                </Typography>

                {/* Membership Number QR Code */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  {membershipQRCode && (
                    <Box>
                      <img
                        src={membershipQRCode}
                        alt="Membership Number QR Code"
                        style={{
                          width: 150,
                          height: 150,
                          backgroundColor: 'white',
                          padding: 12,
                          borderRadius: 12,
                          border: '3px solid rgba(255,255,255,0.3)'
                        }}
                      />
                      <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
                        Membership Number
                      </Typography>
                      <Typography variant="h6" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                        {memberData.membership_number || `MEM${memberData.member_id.padStart(6, '0')}`}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Instructions */}
                <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.9, maxWidth: 300 }}>
                  Scan this QR code to verify membership number and access member services
                </Typography>

                {/* Back Footer */}
                <Box sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: 16,
                  borderTop: '1px solid rgba(255,255,255,0.3)',
                  pt: 2,
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Click to flip card • Secure 2D Barcode
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>

          {/* Member Details */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" />
                Member Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Full Name
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {memberData.first_name} {memberData.last_name}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Membership Number
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {memberData.membership_number || `MEM${memberData.member_id.padStart(6, '0')}`}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Province
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {memberData.province_name}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Municipality
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {memberData.municipality_name}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Ward Code
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {memberData.ward_number}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Voting Station
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {memberData.voting_station_name}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Membership Type
                  </Typography>
                  <Chip label={memberData.membership_type || 'Standard'} color="primary" size="small" />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip 
                    label={new Date() <= new Date(memberData.expiry_date || memberData.card_data?.expiry_date) ? 'Active' : 'Expired'} 
                    color={new Date() <= new Date(memberData.expiry_date || memberData.card_data?.expiry_date) ? 'success' : 'error'} 
                    size="small" 
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security color="primary" />
                Security Features
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <QrCode color="success" sx={{ mb: 1 }} />
                    <Typography variant="body2" fontWeight="medium">
                      QR Code Verification
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Scan to verify authenticity
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Security color="success" sx={{ mb: 1 }} />
                    <Typography variant="body2" fontWeight="medium">
                      Digital Signature
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tamper-evident protection
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <CalendarToday color="success" sx={{ mb: 1 }} />
                    <Typography variant="body2" fontWeight="medium">
                      Real-time Validation
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Instant verification system
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  This digital membership card is secured with advanced encryption and can be verified 
                  in real-time by scanning the QR code. Keep this card safe and report any suspicious activity.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default MemberCardDisplay;
