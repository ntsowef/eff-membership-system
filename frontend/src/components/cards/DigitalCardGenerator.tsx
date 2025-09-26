import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Divider,
  Avatar,
  Paper,
} from '@mui/material';
import {
  CreditCard,
  Download,
  QrCode,
  Person,
  Security,
  Email,
  Print,
  Visibility,
  CheckCircle,
} from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface CardTemplate {
  id: string;
  name: string;
  description: string;
  features: string[];
  preview_url: string;
}

interface DigitalCardGeneratorProps {
  memberId?: string;
  onCardGenerated?: (cardData: any) => void;
  showMemberSearch?: boolean;
}

const DigitalCardGenerator: React.FC<DigitalCardGeneratorProps> = ({
  memberId: initialMemberId,
  onCardGenerated,
  showMemberSearch = true
}) => {
  const [memberId, setMemberId] = useState(initialMemberId || '');
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [customExpiry, setCustomExpiry] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<any>(null);

  // Fetch available templates
  const { data: templatesData } = useQuery({
    queryKey: ['card-templates'],
    queryFn: async () => {
      const response = await api.get('/digital-cards/templates');
      return response.data.data;
    }
  });

  // Generate card data mutation
  const generateCardMutation = useMutation({
    mutationFn: async (data: {
      memberId: string;
      template: string;
      customExpiry?: string;
    }) => {
      const response = await api.post(`/digital-cards/generate-data/${data.memberId}`, {
        template: data.template,
        issued_by: 'admin', // In real app, get from auth context
        custom_expiry: data.customExpiry
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      setGeneratedCard(data);
      setShowPreview(true);
      onCardGenerated?.(data);
    }
  });

  // Download card PDF mutation
  const downloadCardMutation = useMutation({
    mutationFn: async (data: {
      memberId: string;
      template: string;
      customExpiry?: string;
    }) => {
      const response = await api.post(`/digital-cards/generate/${data.memberId}`, {
        template: data.template,
        issued_by: 'admin',
        custom_expiry: data.customExpiry
      }, {
        responseType: 'blob'
      });
      return response.data;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `membership-card-${memberId}-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  });

  const handleGeneratePreview = () => {
    if (!memberId) {
      alert('Please enter a member ID');
      return;
    }

    generateCardMutation.mutate({
      memberId,
      template: selectedTemplate,
      customExpiry: customExpiry || undefined
    });
  };

  const handleDownloadCard = () => {
    if (!memberId) {
      alert('Please enter a member ID');
      return;
    }

    downloadCardMutation.mutate({
      memberId,
      template: selectedTemplate,
      customExpiry: customExpiry || undefined
    });
  };

  const templates = templatesData?.templates || [];

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCard color="primary" />
            Digital Membership Card Generator
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Generate secure digital membership cards with QR codes and security features
          </Typography>

          <Grid container spacing={3}>
            {/* Member Selection */}
            {showMemberSearch && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Member ID"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="Enter member ID (e.g., 186328)"
                  helperText="Enter the member ID to generate a card for"
                />
              </Grid>
            )}

            {/* Template Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Card Template</InputLabel>
                <Select
                  value={selectedTemplate}
                  label="Card Template"
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  {templates.map((template: CardTemplate) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Custom Expiry Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Custom Expiry Date"
                type="date"
                value={customExpiry}
                onChange={(e) => setCustomExpiry(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty to use default expiry (1 year from join date)"
              />
            </Grid>

            {/* Template Info */}
            {selectedTemplate && (
              <Grid item xs={12}>
                {templates.map((template: CardTemplate) => 
                  template.id === selectedTemplate && (
                    <Paper key={template.id} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        {template.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {template.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {template.features.map((feature, index) => (
                          <Chip key={index} label={feature} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Paper>
                  )
                )}
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={handleGeneratePreview}
              disabled={!memberId || generateCardMutation.isPending}
            >
              {generateCardMutation.isPending ? 'Generating...' : 'Preview Card'}
            </Button>
            <Button
              variant="contained"
              startIcon={downloadCardMutation.isPending ? <CircularProgress size={20} /> : <Download />}
              onClick={handleDownloadCard}
              disabled={!memberId || downloadCardMutation.isPending}
            >
              {downloadCardMutation.isPending ? 'Generating...' : 'Download PDF'}
            </Button>
          </Box>

          {/* Error Display */}
          {(generateCardMutation.isError || downloadCardMutation.isError) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to generate card. Please check the member ID and try again.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Card Preview Dialog */}
      <Dialog 
        open={showPreview} 
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Digital Membership Card Preview
        </DialogTitle>
        <DialogContent>
          {generatedCard && (
            <Box>
              {/* Card Preview */}
              <Paper 
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  borderRadius: 2,
                  position: 'relative',
                  minHeight: 200
                }}
              >
                {/* Card Header */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    ORGANIZATION NAME
                  </Typography>
                  <Typography variant="caption">
                    DIGITAL MEMBERSHIP CARD
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {/* Member Info */}
                  <Grid item xs={8}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.light' }}>
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          Member Name
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          ID: {generatedCard.card_data.member_id}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Card: {generatedCard.card_data.card_number}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* QR Code */}
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      {generatedCard.qr_code_url && (
                        <img 
                          src={generatedCard.qr_code_url} 
                          alt="QR Code" 
                          style={{ width: 80, height: 80, backgroundColor: 'white', padding: 4 }}
                        />
                      )}
                      <Typography variant="caption" display="block">
                        Scan to Verify
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Card Footer */}
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                  <Typography variant="caption">
                    Valid Until: {new Date(generatedCard.card_data.expiry_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" sx={{ float: 'right' }}>
                    Issued: {new Date(generatedCard.card_data.issue_date).toLocaleDateString()}
                  </Typography>
                </Box>
              </Paper>

              {/* Card Details */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Card Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Card ID: {generatedCard.card_data.card_id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Card Number: {generatedCard.card_data.card_number}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Template: {generatedCard.card_data.card_design_template}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {generatedCard.card_data.status}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Security Features
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Security fontSize="small" color="success" />
                    <Typography variant="body2">QR Code Verification</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircle fontSize="small" color="success" />
                    <Typography variant="body2">Security Hash Protection</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <QrCode fontSize="small" color="success" />
                    <Typography variant="body2">Digital Signature</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>
            Close
          </Button>
          <Button
            variant="outlined"
            startIcon={<Email />}
            onClick={() => alert('Email functionality would be implemented here')}
          >
            Email Card
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownloadCard}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DigitalCardGenerator;
