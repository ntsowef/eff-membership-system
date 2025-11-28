import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload,
  Download,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Info,
  Visibility,
  GetApp,
} from '@mui/icons-material';
import { useRenewalBulkUpload } from '../../hooks/useRenewalBulkUpload';

const BulkUploadManager: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [showFraudDialog, setShowFraudDialog] = useState(false);

  // Use custom hook
  const {
    currentUpload,
    recentUploads,
    fraudCases,
    isUploading,
    isPolling,
    error,
    upload,
    fetchRecentUploads,
    fetchFraudCases,
    downloadTemplateFile,
    downloadReportFile,
    clearError,
  } = useRenewalBulkUpload();

  const provinces = [
    { code: 'EC', name: 'Eastern Cape' },
    { code: 'FS', name: 'Free State' },
    { code: 'GP', name: 'Gauteng' },
    { code: 'KZN', name: 'KwaZulu-Natal' },
    { code: 'LP', name: 'Limpopo' },
    { code: 'MP', name: 'Mpumalanga' },
    { code: 'NC', name: 'Northern Cape' },
    { code: 'NW', name: 'North West' },
    { code: 'WC', name: 'Western Cape' },
  ];

  const handleFetchFraudCases = async (uploadUuid: string) => {
    await fetchFraudCases(uploadUuid);
    setShowFraudDialog(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        clearError();
        return;
      }
      setSelectedFile(file);
      clearError();
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        return;
      }
      setSelectedFile(file);
      clearError();
    }
  }, [clearError]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !selectedProvince) {
      return;
    }

    await upload(selectedFile, selectedProvince);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Processing':
        return 'info';
      case 'Failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle />;
      case 'Processing':
        return <Refresh />;
      case 'Failed':
        return <Error />;
      default:
        return <Info />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Bulk Upload Manager
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload Excel or CSV files to process multiple membership renewals at once
        </Typography>
      </Box>

      {/* Upload Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload File
            </Typography>

            {/* Download Template Button */}
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={downloadTemplateFile}
              fullWidth
              sx={{ mb: 2 }}
            >
              Download Template
            </Button>

            {/* File Drop Zone */}
            <Box
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              sx={{
                border: '2px dashed',
                borderColor: selectedFile ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: selectedFile ? 'action.hover' : 'background.paper',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  {selectedFile ? selectedFile.name : 'Drag and drop file here or click to browse'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported formats: .xlsx, .xls, .csv (Max 50MB)
                </Typography>
              </label>
            </Box>

            {/* Province Selection */}
            <FormControl fullWidth sx={{ mt: 3 }}>
              <InputLabel>Province</InputLabel>
              <Select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                label="Province"
              >
                {provinces.map((province) => (
                  <MenuItem key={province.code} value={province.code}>
                    {province.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Upload Button */}
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={handleUpload}
              disabled={!selectedFile || !selectedProvince || isUploading}
              fullWidth
              sx={{ mt: 2 }}
            >
              {isUploading ? 'Uploading...' : 'Upload and Process'}
            </Button>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={clearError}>
                {error}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Status Section */}
        <Grid item xs={12} md={6}>
          {currentUpload && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Processing Status
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Chip
                  icon={getStatusIcon(currentUpload.upload_status)}
                  label={currentUpload.upload_status}
                  color={getStatusColor(currentUpload.upload_status)}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  File: {currentUpload.file_name}
                </Typography>
              </Box>

              {/* Progress Bar */}
              {currentUpload.upload_status === 'Processing' && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={parseFloat(currentUpload.progress_percentage)}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {currentUpload.progress_percentage}% Complete
                  </Typography>
                </Box>
              )}

              {/* Statistics */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Total Records
                      </Typography>
                      <Typography variant="h6">{currentUpload.total_records}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Processed
                      </Typography>
                      <Typography variant="h6">{currentUpload.processed_records}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Failed Validations
                      </Typography>
                      <Typography variant="h6" color="error.main">
                        {currentUpload.failed_validations}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Fraud Detected
                      </Typography>
                      <Typography variant="h6" color="warning.main">
                        {currentUpload.fraud_detected}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Action Buttons */}
              {currentUpload.upload_status === 'Completed' && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  {currentUpload.fraud_detected > 0 && (
                    <Button
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => handleFetchFraudCases(currentUpload.upload_uuid)}
                      size="small"
                    >
                      View Fraud Cases
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<GetApp />}
                    onClick={() => downloadReportFile(currentUpload.upload_uuid, currentUpload.file_name)}
                    size="small"
                  >
                    Download Report
                  </Button>
                </Box>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Recent Uploads Table */}
      <Paper sx={{ mt: 3, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Recent Uploads
          </Typography>
          <Button
            startIcon={<Refresh />}
            onClick={fetchRecentUploads}
            size="small"
          >
            Refresh
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>File Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Total Records</TableCell>
                <TableCell align="right">Processed</TableCell>
                <TableCell align="right">Fraud Detected</TableCell>
                <TableCell>Uploaded At</TableCell>
                <TableCell>Uploaded By</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentUploads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No uploads yet
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                recentUploads.map((upload) => (
                  <TableRow key={upload.upload_uuid}>
                    <TableCell>{upload.file_name}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(upload.upload_status)}
                        label={upload.upload_status}
                        color={getStatusColor(upload.upload_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{upload.total_records}</TableCell>
                    <TableCell align="right">{upload.processed_records}</TableCell>
                    <TableCell align="right">
                      {upload.fraud_detected > 0 ? (
                        <Chip
                          label={upload.fraud_detected}
                          color="warning"
                          size="small"
                        />
                      ) : (
                        upload.fraud_detected
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(upload.uploaded_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{upload.uploaded_by_name}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {upload.fraud_detected > 0 && (
                          <Tooltip title="View Fraud Cases">
                            <IconButton
                              size="small"
                              onClick={() => handleFetchFraudCases(upload.upload_uuid)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {upload.upload_status === 'Completed' && (
                          <Tooltip title="Download Report">
                            <IconButton
                              size="small"
                              onClick={() => downloadReportFile(upload.upload_uuid, upload.file_name)}
                            >
                              <GetApp fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Fraud Cases Dialog */}
      <Dialog
        open={showFraudDialog}
        onClose={() => setShowFraudDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            Fraud Cases Detected
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {fraudCases.length} fraud case(s) detected. Please review and take appropriate action.
          </Alert>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member ID</TableCell>
                  <TableCell>Member Name</TableCell>
                  <TableCell>Fraud Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Current Ward</TableCell>
                  <TableCell>Attempted Ward</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fraudCases.map((fraudCase) => (
                  <TableRow key={fraudCase.fraud_case_id}>
                    <TableCell>{fraudCase.member_id_number}</TableCell>
                    <TableCell>{fraudCase.member_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={fraudCase.fraud_type}
                        size="small"
                        color={fraudCase.fraud_type === 'Ward Mismatch' ? 'error' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fraudCase.fraud_severity}
                        size="small"
                        color={fraudCase.fraud_severity === 'High' ? 'error' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      {fraudCase.current_ward_code}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        {fraudCase.current_ward_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {fraudCase.attempted_ward_code}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        {fraudCase.attempted_ward_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {fraudCase.fraud_description}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFraudDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BulkUploadManager;

