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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  GroupAdd,
  Download,
  Delete,
  Add,
  PlayArrow,
  CheckCircle,
  Error,
  GetApp,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { showSuccess, showWarning } from '../../utils/sweetAlert';

interface BulkGenerationResult {
  successful_generations: number;
  failed_generations: number;
  generation_details: any[];
}

const BulkCardGenerator: React.FC = () => {
  const [memberIds, setMemberIds] = useState<string[]>(['']);
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [customExpiry, setCustomExpiry] = useState('');
  const [sendEmail] = useState(false);
  const [generationResult, setGenerationResult] = useState<BulkGenerationResult | null>(null);

  // Bulk generation mutation
  const bulkGenerateMutation = useMutation({
    mutationFn: async (data: {
      member_ids: string[];
      template: string;
      custom_expiry?: string;
      send_email: boolean;
    }) => {
      const response = await api.post('/digital-cards/bulk-generate', {
        member_ids: data.member_ids,
        template: data.template,
        issued_by: 'admin',
        custom_expiry: data.custom_expiry,
        send_email: data.send_email
      });
      return response.data.data.bulk_generation_result;
    },
    onSuccess: (result) => {
      setGenerationResult(result);
    }
  });

  // Bulk download mutation
  const bulkDownloadMutation = useMutation({
    mutationFn: async (data: {
      member_ids: string[];
      template: string;
    }) => {
      const response = await api.post('/digital-cards/bulk-download', {
        member_ids: data.member_ids,
        template: data.template,
        issued_by: 'admin'
      });
      return response.data.data;
    },
    onSuccess: (result) => {
      showSuccess(`Bulk download prepared: ${result.download_info.filename} with ${result.download_info.total_cards} cards`, 'Download Ready');
    }
  });

  const handleAddMemberId = () => {
    setMemberIds([...memberIds, '']);
  };

  const handleRemoveMemberId = (index: number) => {
    const newMemberIds = memberIds.filter((_, i) => i !== index);
    setMemberIds(newMemberIds.length > 0 ? newMemberIds : ['']);
  };

  const handleMemberIdChange = (index: number, value: string) => {
    const newMemberIds = [...memberIds];
    newMemberIds[index] = value;
    setMemberIds(newMemberIds);
  };

  const handleBulkGenerate = () => {
    const validMemberIds = memberIds.filter(id => id.trim() !== '');

    if (validMemberIds.length === 0) {
      showWarning('Please add at least one member ID', 'No Members Selected');
      return;
    }

    bulkGenerateMutation.mutate({
      member_ids: validMemberIds,
      template: selectedTemplate,
      custom_expiry: customExpiry || undefined,
      send_email: sendEmail
    });
  };

  const handleBulkDownload = () => {
    const validMemberIds = memberIds.filter(id => id.trim() !== '');

    if (validMemberIds.length === 0) {
      showWarning('Please add at least one member ID', 'No Members Selected');
      return;
    }

    bulkDownloadMutation.mutate({
      member_ids: validMemberIds,
      template: selectedTemplate
    });
  };

  const handleImportFromCSV = () => {
    // In a real implementation, this would open a file picker
    const csvData = prompt('Enter comma-separated member IDs:');
    if (csvData) {
      const ids = csvData.split(',').map(id => id.trim()).filter(id => id !== '');
      setMemberIds(ids.length > 0 ? ids : ['']);
    }
  };

  const validMemberIds = memberIds.filter(id => id.trim() !== '');

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupAdd color="primary" />
            Bulk Digital Card Generation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Generate digital membership cards for multiple members simultaneously
          </Typography>

          {/* Member IDs Input */}
          <Typography variant="subtitle1" gutterBottom>
            Member IDs ({validMemberIds.length} members)
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleImportFromCSV}
              sx={{ mr: 1 }}
            >
              Import from CSV
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={handleAddMemberId}
            >
              Add Member ID
            </Button>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {memberIds.map((memberId, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={`Member ID ${index + 1}`}
                    value={memberId}
                    onChange={(e) => handleMemberIdChange(index, e.target.value)}
                    placeholder="Enter member ID"
                  />
                  {memberIds.length > 1 && (
                    <Tooltip title="Remove">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveMemberId(index)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* Generation Options */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Card Template</InputLabel>
                <Select
                  value={selectedTemplate}
                  label="Card Template"
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  <MenuItem value="standard">Standard Card</MenuItem>
                  <MenuItem value="premium">Premium Card</MenuItem>
                  <MenuItem value="executive">Executive Card</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Custom Expiry Date"
                type="date"
                value={customExpiry}
                onChange={(e) => setCustomExpiry(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty for default expiry"
              />
            </Grid>
          </Grid>

          {/* Summary */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Generation Summary:</strong> {validMemberIds.length} members selected • 
              Template: {selectedTemplate} • 
              {customExpiry ? `Custom expiry: ${customExpiry}` : 'Default expiry (1 year)'}
            </Typography>
          </Alert>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              startIcon={bulkGenerateMutation.isPending ? <CircularProgress size={20} /> : <PlayArrow />}
              onClick={handleBulkGenerate}
              disabled={validMemberIds.length === 0 || bulkGenerateMutation.isPending}
            >
              {bulkGenerateMutation.isPending ? 'Generating...' : 'Generate Cards'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={handleBulkDownload}
              disabled={validMemberIds.length === 0 || bulkDownloadMutation.isPending}
            >
              Prepare Bulk Download
            </Button>
          </Box>

          {/* Progress */}
          {bulkGenerateMutation.isPending && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Generating cards for {validMemberIds.length} members...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Error Display */}
          {bulkGenerateMutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to generate cards. Please check the member IDs and try again.
            </Alert>
          )}

          {/* Generation Results */}
          {generationResult && (
            <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Bulk Generation Results
              </Typography>

              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="h4" color="success.contrastText" fontWeight="bold">
                      {generationResult.successful_generations}
                    </Typography>
                    <Typography variant="body2" color="success.contrastText">
                      Successful
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography variant="h4" color="error.contrastText" fontWeight="bold">
                      {generationResult.failed_generations}
                    </Typography>
                    <Typography variant="body2" color="error.contrastText">
                      Failed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                    <Typography variant="h4" color="primary.contrastText" fontWeight="bold">
                      {validMemberIds.length}
                    </Typography>
                    <Typography variant="body2" color="primary.contrastText">
                      Total Processed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="h4" color="info.contrastText" fontWeight="bold">
                      {((generationResult.successful_generations / validMemberIds.length) * 100).toFixed(0)}%
                    </Typography>
                    <Typography variant="body2" color="info.contrastText">
                      Success Rate
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Detailed Results Table */}
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Member ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Card Number</TableCell>
                      <TableCell>Generation Time</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {generationResult.generation_details.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell>{detail.member_id}</TableCell>
                        <TableCell>
                          <Chip
                            label={detail.success ? 'Success' : 'Failed'}
                            color={detail.success ? 'success' : 'error'}
                            size="small"
                            icon={detail.success ? <CheckCircle /> : <Error />}
                          />
                        </TableCell>
                        <TableCell>
                          {detail.success ? detail.card_number : '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(detail.generation_time).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          {detail.success ? 
                            `PDF: ${(detail.pdf_size / 1024).toFixed(1)}KB` : 
                            detail.error
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Export Results */}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => {
                    const csvContent = generationResult.generation_details.map(detail => 
                      `${detail.member_id},${detail.success ? 'Success' : 'Failed'},${detail.success ? detail.card_number : ''},${detail.generation_time}`
                    ).join('\n');
                    const blob = new Blob([`Member ID,Status,Card Number,Generation Time\n${csvContent}`], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `bulk-card-generation-results-${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                    window.URL.revokeObjectURL(url);
                  }}
                >
                  Export Results
                </Button>
              </Box>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default BulkCardGenerator;
