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
  Refresh,
  FlipToBack,
  FlipToFront,
  Autorenew,
  Warning,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import cardFrontImage from '../../assets/images/Eff_first.png';
import cardBackImage from '../../assets/images/Eff_second.png';

interface MemberCardData {
  member_id: string;
  membership_number: string;
  id_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  province_code: string | null; // Can be null for some members
  province_name: string | null; // Can be null for some members
  municipality_name: string | null; // Can be null for some members
  ward_code: string | null; // Can be null for some members
  voting_station_name: string;
  membership_type: string;
  membership_status?: string; // Actual status from database (Active/Expired/Inactive)
  join_date: string;
  expiry_date: string;
  membership_amount?: string;
  days_until_expiry?: number;
  card_data?: any;
  qr_code_url?: string;
}

// Helper function to get province code from province name (fallback if province_code is not available)
const getProvinceCode = (provinceName: string | null | undefined): string => {
  // Handle null, undefined, or empty string
  if (!provinceName) {
    return 'N/A';
  }

  const provinceMap: { [key: string]: string } = {
    'Eastern Cape': 'EC',
    'Free State': 'FS',
    'Gauteng': 'GP',
    'KwaZulu-Natal': 'KZN',
    'Limpopo': 'LP',
    'Mpumalanga': 'MP',
    'Northern Cape': 'NC',
    'North West': 'NW',
    'Western Cape': 'WC'
  };

  // Return mapped code or fallback to first 2 characters (if string is long enough)
  return provinceMap[provinceName] || (provinceName.length >= 2 ? provinceName.substring(0, 2).toUpperCase() : provinceName.toUpperCase());
};

const MemberCardDisplay: React.FC = () => {
  const navigate = useNavigate();
  const [idNumber, setIdNumber] = useState('');
  const [memberData, setMemberData] = useState<MemberCardData | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Helper function to check if renewal button should be shown
  const shouldShowRenewalButton = (data: MemberCardData): boolean => {
    const expiryDate = new Date(data.expiry_date || data.card_data?.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Show renewal button if:
    // 1. Membership is expired (daysUntilExpiry < 0)
    // 2. Membership expires within 90 days (daysUntilExpiry <= 90)
    // 3. Membership status is 'Expired' or 'Inactive'
    return (
      daysUntilExpiry <= 90 ||
      data.membership_status === 'Expired' ||
      data.membership_status === 'Inactive'
    );
  };

  // Helper function to get renewal message
  const getRenewalMessage = (data: MemberCardData): { message: string; severity: 'error' | 'warning' } => {
    const expiryDate = new Date(data.expiry_date || data.card_data?.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0 || data.membership_status === 'Expired') {
      return {
        message: `Your membership expired ${Math.abs(daysUntilExpiry)} days ago. Renew now to continue enjoying member benefits.`,
        severity: 'error'
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        message: `Your membership expires in ${daysUntilExpiry} days. Renew now to avoid interruption.`,
        severity: 'error'
      };
    } else {
      return {
        message: `Your membership expires in ${daysUntilExpiry} days. Renew early to ensure continuous membership.`,
        severity: 'warning'
      };
    }
  };

  // Handle renewal button click
  const handleRenewMembership = () => {
    if (memberData) {
      // Navigate to renewal portal with ID number pre-filled
      navigate('/renew', { state: { idNumber: memberData.id_number } });
    }
  };

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
    }
  });

  // Download card PDF - using client-side generation
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleViewCard = () => {
    const trimmedId = idNumber.trim();

    if (!trimmedId) {
      alert('Please enter your ID Number');
      return;
    }

    // Validate ID number is exactly 13 digits
    if (!/^\d{13}$/.test(trimmedId)) {
      alert('ID Number must be exactly 13 digits');
      return;
    }

    fetchMemberMutation.mutate(trimmedId);
  };

  const handleDownloadCard = async () => {
    if (!memberData || !showCard) return;

    setIsGeneratingPDF(true);

    try {
      // Create a temporary container for both card sides
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      document.body.appendChild(tempContainer);

      // Get the card elements
      const frontCard = document.querySelector('.card-side-front') as HTMLElement;
      const backCard = document.querySelector('.card-side-back') as HTMLElement;

      if (!frontCard || !backCard) {
        throw new Error('Card elements not found');
      }

      // Clone the cards
      const frontClone = frontCard.cloneNode(true) as HTMLElement;
      const backClone = backCard.cloneNode(true) as HTMLElement;

      // Reset transforms for clones
      frontClone.style.transform = 'none';
      frontClone.style.position = 'relative';
      frontClone.style.width = '550px';
      frontClone.style.height = '347px'; // 550 * 0.6304
      frontClone.style.marginBottom = '20px';

      backClone.style.transform = 'none';
      backClone.style.position = 'relative';
      backClone.style.width = '550px';
      backClone.style.height = '347px';

      tempContainer.appendChild(frontClone);
      tempContainer.appendChild(backClone);

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture front card
      const frontCanvas = await html2canvas(frontClone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Capture back card
      const backCanvas = await html2canvas(backClone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98] // Credit card size in mm
      });

      // Add front card
      const frontImgData = frontCanvas.toDataURL('image/png');
      pdf.addImage(frontImgData, 'PNG', 0, 0, 85.6, 53.98);

      // Add new page for back card
      pdf.addPage();
      const backImgData = backCanvas.toDataURL('image/png');
      pdf.addImage(backImgData, 'PNG', 0, 0, 85.6, 53.98);

      // Download PDF
      pdf.save(`membership-card-${idNumber}.pdf`);

      // Clean up
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
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

    // Add print-specific styles
    const printStyles = document.createElement('style');
    printStyles.id = 'card-print-styles';
    printStyles.textContent = `
      @media print {
        /* Hide everything except the card */
        body * {
          visibility: hidden;
        }

        /* Show only the card container and its children */
        #printable-card-container,
        #printable-card-container * {
          visibility: visible;
        }

        /* Position card container at top of page */
        #printable-card-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }

        /* Ensure both card sides are visible */
        .card-side-front,
        .card-side-back {
          page-break-after: always;
          page-break-inside: avoid;
          margin-bottom: 20px;
        }

        /* Remove flip transform for printing */
        .card-side-back {
          transform: none !important;
        }

        /* Ensure background images are printed */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
    `;

    // Add styles to document
    if (!document.getElementById('card-print-styles')) {
      document.head.appendChild(printStyles);
    }

    // Trigger print
    window.print();

    // Clean up styles after print dialog closes
    setTimeout(() => {
      const existingStyles = document.getElementById('card-print-styles');
      if (existingStyles) {
        existingStyles.remove();
      }
    }, 1000);
  };

  const handleReset = () => {
    setIdNumber('');
    setMemberData(null);
    setShowCard(false);
    setIsFlipped(false);
  };

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Member ID Input */}
      {!showCard && (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            mb: 4,
            borderRadius: 4,
            border: '1px solid rgba(220, 20, 60, 0.15)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 1) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 100px rgba(220, 20, 60, 0.05)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <CreditCard sx={{ fontSize: 56, color: '#DC143C', mb: 2 }} />
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                mb: 2,
              }}
            >
              Access Your Digital Card
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.05rem' }}>
              Enter your South African ID Number to view and download your digital membership card
            </Typography>
          </Box>

          <Grid container spacing={3} alignItems="end">
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="ID Number"
                value={idNumber}
                onChange={(e) => {
                  // Only allow digits and limit to 13 characters
                  const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                  setIdNumber(value);
                }}
                placeholder="Enter your ID Number (e.g., 8001015009087)"
                helperText="Enter your 13-digit South African ID Number"
                inputProps={{
                  maxLength: 13,
                  inputMode: 'numeric',
                  pattern: '[0-9]*'
                }}
                error={idNumber.length > 0 && idNumber.length !== 13}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleViewCard();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#DC143C',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#DC143C',
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleViewCard}
                disabled={!idNumber.trim() || idNumber.length !== 13 || fetchMemberMutation.isPending}
                startIcon={fetchMemberMutation.isPending ? <CircularProgress size={20} /> : <CreditCard />}
                sx={{
                  py: 1.8,
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {fetchMemberMutation.isPending ? 'Loading...' : 'View My Card'}
              </Button>
            </Grid>
          </Grid>

          {/* Error Display */}
          {fetchMemberMutation.isError && (
            <Alert
              severity="error"
              sx={{
                mt: 3,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  color: '#DC143C',
                },
              }}
            >
              Member not found. Please check your ID Number and try again.
            </Alert>
          )}

          {/* Help Information */}
          <Alert
            severity="info"
            sx={{
              mt: 3,
              borderRadius: 2,
              bgcolor: 'rgba(220, 20, 60, 0.05)',
              border: '1px solid rgba(220, 20, 60, 0.1)',
              '& .MuiAlert-icon': {
                color: '#DC143C',
              },
            }}
          >
            <Typography variant="body2" gutterBottom fontWeight={600}>
              Need help with your ID Number?
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              • Use your South African ID Number (13 digits)<br/>
              • Check your ID document or driver's license<br/>
              • Contact our support team for assistance<br/>
              • Example format: 8001015009087
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Digital Membership Card Display */}
      {showCard && memberData && (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            borderRadius: 4,
            border: '1px solid rgba(220, 20, 60, 0.15)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 1) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 100px rgba(220, 20, 60, 0.05)',
          }}
        >
          {/* Card Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                Your Digital Membership Card
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isFlipped ? 'Back Side' : 'Front Side'} • Click card to flip
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Tooltip title={isFlipped ? "Flip to Front" : "Flip to Back"}>
                <IconButton
                  onClick={handleFlipCard}
                  sx={{
                    color: '#DC143C',
                    '&:hover': {
                      bgcolor: 'rgba(220, 20, 60, 0.1)',
                    },
                  }}
                >
                  {isFlipped ? <FlipToFront /> : <FlipToBack />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Download PDF">
                <IconButton
                  onClick={handleDownloadCard}
                  disabled={isGeneratingPDF}
                  sx={{
                    color: '#DC143C',
                    '&:hover': {
                      bgcolor: 'rgba(220, 20, 60, 0.1)',
                    },
                  }}
                >
                  {isGeneratingPDF ? <CircularProgress size={20} sx={{ color: '#DC143C' }} /> : <Download />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Share Card">
                <IconButton
                  onClick={handleShareCard}
                  sx={{
                    color: '#DC143C',
                    '&:hover': {
                      bgcolor: 'rgba(220, 20, 60, 0.1)',
                    },
                  }}
                >
                  <Share />
                </IconButton>
              </Tooltip>
              <Tooltip title="Print Card">
                <IconButton
                  onClick={handlePrintCard}
                  sx={{
                    color: '#DC143C',
                    '&:hover': {
                      bgcolor: 'rgba(220, 20, 60, 0.1)',
                    },
                  }}
                >
                  <Print />
                </IconButton>
              </Tooltip>
              <Tooltip title="View Another Card">
                <IconButton
                  onClick={handleReset}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.05)',
                    },
                  }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Renewal Alert and Button */}
          {shouldShowRenewalButton(memberData) && (
            <Alert
              severity={getRenewalMessage(memberData).severity}
              icon={<Warning />}
              sx={{
                mb: 4,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  color: getRenewalMessage(memberData).severity === 'error' ? '#DC143C' : '#ed6c02',
                },
                border: `1px solid ${getRenewalMessage(memberData).severity === 'error' ? 'rgba(220, 20, 60, 0.3)' : 'rgba(237, 108, 2, 0.3)'}`,
              }}
              action={
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Autorenew />}
                  onClick={handleRenewMembership}
                  sx={{
                    bgcolor: '#DC143C',
                    color: 'white',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: '#B01030',
                    },
                  }}
                >
                  Renew Now
                </Button>
              }
            >
              <Typography variant="body2" fontWeight={600}>
                {getRenewalMessage(memberData).message}
              </Typography>
            </Alert>
          )}

          {/* Flippable Digital Card - Standard Credit Card Dimensions (8.6mm × 53.98mm = 1.586:1 aspect ratio) */}
          <Box
            id="printable-card-container"
            sx={{
              perspective: '1000px',
              mb: 4,
              maxWidth: 550, // Reduced max width for better proportions
              mx: 'auto',
              cursor: 'pointer'
            }}
            onClick={handleFlipCard}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                paddingTop: '63.04%', // 1/1.586 = 0.6304 (maintains 1.586:1 aspect ratio)
                transformStyle: 'preserve-3d',
                transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front Side */}
              <Paper
                className="card-side-front"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  p: 3,
                  backgroundImage: `url(${cardFrontImage})`,
                  backgroundSize: 'contain', // Changed from 'cover' to 'contain' to prevent stretching
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  color: 'white',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
                  backfaceVisibility: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  '@media print': {
                    boxShadow: 'none',
                    backgroundImage: `url(${cardFrontImage}) !important`,
                    backgroundSize: 'contain !important',
                    position: 'relative !important',
                    transform: 'none !important',
                  }
                }}
              >
            {/* Top Left: Expiry Date (without "VALID UNTIL" label) */}
            <Box sx={{ position: 'absolute', top: 16, left: 16 }}>
              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                {new Date(memberData.expiry_date || memberData.card_data?.expiry_date).toLocaleDateString('en-ZA', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })}
              </Typography>
            </Box>

            {/* Top Right: Province Code */}
            <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{
                  fontSize: '1.5rem',
                  letterSpacing: '0.1em',
                  opacity: 0.95
                }}
              >
                {memberData.province_code || getProvinceCode(memberData.province_name)}
              </Typography>
            </Box>

            {/* Member Name - Absolute positioned */}
            <Box
              sx={{
                position: 'absolute',
                top: '155px',
                left: '10px',
                right: '10px',
                textAlign: 'center'
              }}
            >
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}
              >
                {memberData.first_name} {memberData.last_name}
              </Typography>
            </Box>

            {/* ID Number - Absolute positioned */}
            <Box
              sx={{
                position: 'absolute',
                top: '202px',
                left: '10px',
                right: '10px',
                textAlign: 'center'
              }}
            >
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                {memberData.id_number}
              </Typography>
            </Box>

            {/* Sub-region and Ward - Absolute positioned */}
            <Box
              sx={{
                position: 'absolute',
                top: '253px',
                left: '10px',
                right: '10px',
                fontSize: '1rem',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>
                {memberData.municipality_name}
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>
                |
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>
                {memberData.ward_code}
              </Typography>
            </Box>
              </Paper>

              {/* Back Side */}
              <Paper
                className="card-side-back"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  p: 2.5,
                  backgroundImage: `url(${cardBackImage})`,
                  backgroundSize: 'contain', // Changed from 'cover' to 'contain' to prevent stretching
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  color: 'white',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  '@media print': {
                    boxShadow: 'none',
                    backgroundImage: `url(${cardBackImage}) !important`,
                    backgroundSize: 'contain !important',
                    position: 'relative !important',
                    transform: 'none !important',
                  }
                }}
              >
                {/* Back side with background image */}
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
                    {memberData.province_name || 'Not Available'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Municipality
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {memberData.municipality_name || 'Not Available'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Ward Code
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {memberData.ward_code || 'Not Available'}
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
                    label={memberData.membership_status || (new Date() <= new Date(memberData.expiry_date || memberData.card_data?.expiry_date) ? 'Active' : 'Expired')}
                    color={
                      memberData.membership_status === 'Active' ||
                      (!memberData.membership_status && new Date() <= new Date(memberData.expiry_date || memberData.card_data?.expiry_date))
                        ? 'success'
                        : 'error'
                    }
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Paper>
      )}
    </Box>
  );
};

export default MemberCardDisplay;
