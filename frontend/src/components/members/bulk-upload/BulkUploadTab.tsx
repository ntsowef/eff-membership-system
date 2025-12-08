import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  FormControlLabel,
  Switch,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error,
  Info,
  ContentCopy,
  VerifiedUser,
  Warning,
  Description,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { memberApplicationBulkUploadApi } from '../../../services/api';

interface UploadStatus {
  upload_uuid: string;
  file_name: string;
  status: string;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
}

interface IECStatus extends UploadStatus {
  iec_verification_enabled: boolean;
  iec_verified_count: number;
  iec_not_registered_count: number;
  iec_failed_count: number;
  iec_rate_limited: boolean;
  iec_rate_limit_reset_time: string;
  report_available: boolean;
}

const BulkUploadTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [iecStatus, setIecStatus] = useState<IECStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [polling, setPolling] = useState(false);
  const [enableIECVerification, setEnableIECVerification] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setSuccess(false);
      setUploadStatus(null);
      setIecStatus(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // Use IEC verification endpoint if enabled
      const response = enableIECVerification
        ? await memberApplicationBulkUploadApi.uploadFileWithIEC(file)
        : await memberApplicationBulkUploadApi.uploadFile(file);
      const { upload_uuid } = response.data;
      setSuccess(true);

      // Start polling for status
      startPolling(upload_uuid, enableIECVerification);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const startPolling = (upload_uuid: string, withIEC: boolean) => {
    setPolling(true);

    const pollInterval = setInterval(async () => {
      try {
        if (withIEC) {
          // Poll IEC status endpoint
          const response = await memberApplicationBulkUploadApi.getIECStatus(upload_uuid);
          const status = response.data as IECStatus;
          setIecStatus(status);
          setUploadStatus(status);

          // Stop polling if completed, failed, or rate limited
          if (status.status === 'Completed' || status.status === 'Failed' || status.status === 'Rate Limited') {
            clearInterval(pollInterval);
            setPolling(false);
          }
        } else {
          // Poll regular status endpoint
          const response = await memberApplicationBulkUploadApi.getUploadStatus(upload_uuid);
          const status = response.data;
          setUploadStatus(status);

          // Stop polling if completed or failed
          if (status.status === 'Completed' || status.status === 'Failed') {
            clearInterval(pollInterval);
            setPolling(false);
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
        clearInterval(pollInterval);
        setPolling(false);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleDownloadReport = async () => {
    if (!iecStatus?.upload_uuid) return;

    setDownloadingReport(true);
    try {
      const blob = await memberApplicationBulkUploadApi.downloadIECReport(iecStatus.upload_uuid);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `IEC_Verification_Report_${iecStatus.upload_uuid}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download report');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await memberApplicationBulkUploadApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Member_Application_Bulk_Upload_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download template');
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadStatus(null);
    setIecStatus(null);
    setError(null);
    setSuccess(false);
    setPolling(false);
  };

  const getProgressPercentage = () => {
    if (!uploadStatus || uploadStatus.total_records === 0) return 0;
    return Math.round((uploadStatus.processed_records / uploadStatus.total_records) * 100);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Left Column - Upload Area */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Membership Applications
              </Typography>

              {/* IEC Verification Toggle */}
              <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableIECVerification}
                      onChange={(e) => setEnableIECVerification(e.target.checked)}
                      color="primary"
                      disabled={uploading || polling}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VerifiedUser color={enableIECVerification ? 'primary' : 'disabled'} />
                      <Typography variant="body2">
                        Enable IEC Verification
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  {enableIECVerification
                    ? 'ID numbers will be verified against the IEC database to retrieve voter registration status and geographic details.'
                    : 'Applications will be processed without IEC verification.'}
                </Typography>
              </Box>

              {/* Download Template Button */}
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Download />}
                onClick={handleDownloadTemplate}
                sx={{ mb: 3 }}
              >
                Download Template
              </Button>

              {/* Dropzone */}
              <Paper
                {...getRootProps()}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                {isDragActive ? (
                  <Typography>Drop the file here...</Typography>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Drag & drop file here
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      or click to select file
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Supported formats: Excel (.xlsx, .xls), CSV (.csv)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Maximum file size: 50MB
                    </Typography>
                  </>
                )}
              </Paper>

              {/* Selected File */}
              {file && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Selected file:</strong> {file.name}
                  </Typography>
                  <Typography variant="caption">
                    Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Alert>
              )}

              {/* Error Message */}
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Success Message */}
              {success && !uploadStatus && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  File uploaded successfully! Processing...
                </Alert>
              )}

              {/* Upload Button */}
              <Button
                fullWidth
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={handleUpload}
                disabled={!file || uploading || polling}
                sx={{ mt: 2 }}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>

              {/* Reset Button */}
              {(file || uploadStatus) && (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleReset}
                  disabled={uploading || polling}
                  sx={{ mt: 1 }}
                >
                  Reset
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Instructions & Status */}
        <Grid item xs={12} md={6}>
          {/* Processing Status */}
          {uploadStatus && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Processing Status
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Progress</Typography>
                    <Typography variant="body2">{getProgressPercentage()}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressPercentage()}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Total Records
                    </Typography>
                    <Typography variant="h6">{uploadStatus.total_records}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Processed
                    </Typography>
                    <Typography variant="h6">{uploadStatus.processed_records}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="success.main">
                      ✓ Successful
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {uploadStatus.successful_records}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="error.main">
                      ✗ Failed/Blocked
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {uploadStatus.failed_records}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="warning.main">
                      ⚠ Duplicates
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {uploadStatus.duplicate_records}
                    </Typography>
                  </Grid>
                </Grid>

                {/* IEC Verification Results */}
                {iecStatus && enableIECVerification && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VerifiedUser color="primary" fontSize="small" />
                      IEC Verification Results
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Tooltip title="ID numbers successfully verified with IEC">
                          <Box>
                            <Typography variant="caption" color="primary.main">
                              ✓ Verified
                            </Typography>
                            <Typography variant="h6" color="primary.main">
                              {iecStatus.iec_verified_count || 0}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Grid>
                      <Grid item xs={4}>
                        <Tooltip title="Members not registered to vote (VD code: 999999999)">
                          <Box>
                            <Typography variant="caption" color="warning.main">
                              ⚠ Not Registered
                            </Typography>
                            <Typography variant="h6" color="warning.main">
                              {iecStatus.iec_not_registered_count || 0}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Grid>
                      <Grid item xs={4}>
                        <Tooltip title="IEC verification failed for these records">
                          <Box>
                            <Typography variant="caption" color="error.main">
                              ✗ IEC Failed
                            </Typography>
                            <Typography variant="h6" color="error.main">
                              {iecStatus.iec_failed_count || 0}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Grid>
                    </Grid>

                    {/* Rate Limit Warning */}
                    {iecStatus.iec_rate_limited && (
                      <Alert severity="warning" sx={{ mt: 2 }} icon={<Warning />}>
                        <Typography variant="body2">
                          <strong>Rate Limit Reached:</strong> IEC verification was paused due to API rate limits.
                        </Typography>
                        {iecStatus.iec_rate_limit_reset_time && (
                          <Typography variant="caption">
                            Resets at: {new Date(iecStatus.iec_rate_limit_reset_time).toLocaleTimeString()}
                          </Typography>
                        )}
                      </Alert>
                    )}

                    {/* Download Report Button */}
                    {iecStatus.report_available && (
                      <Button
                        fullWidth
                        variant="outlined"
                        color="primary"
                        startIcon={<Description />}
                        onClick={handleDownloadReport}
                        disabled={downloadingReport}
                        sx={{ mt: 2 }}
                      >
                        {downloadingReport ? 'Downloading...' : 'Download IEC Verification Report'}
                      </Button>
                    )}
                  </Box>
                )}

                {/* Additional Info */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    <strong>Note:</strong> Failed/Blocked includes:
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    • Suspended members (blocked until suspension lifted)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    • Resigned members (requires manual review)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    • Fraud cases (permanently blocked)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    • Validation errors (missing/invalid data)
                  </Typography>
                  {enableIECVerification && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      • IEC verification failures
                    </Typography>
                  )}
                </Box>

                {uploadStatus.status === 'Completed' && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Processing completed successfully!
                    {enableIECVerification && ' IEC verification report is available for download.'}
                  </Alert>
                )}

                {uploadStatus.status === 'Rate Limited' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Processing paused due to IEC API rate limits. Some records may not have been verified.
                  </Alert>
                )}

                {uploadStatus.status === 'Failed' && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    Processing failed. Please check the error logs.
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Instructions
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Info color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Download the template"
                    secondary="Use the provided Excel template to ensure correct format"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <ContentCopy color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Fill in applicant data"
                    secondary="Complete all required fields for each applicant"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Upload the file"
                    secondary="Drag and drop or click to select your completed file"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <Error color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Review results"
                    secondary="Check processing status and fix any errors"
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Required Fields:
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                First Name, Last Name, ID Number, Date of Birth, Gender, Cell Number, Address, Ward Code
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                File Requirements:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Maximum file size: 50MB<br />
                • Supported formats: Excel (.xlsx, .xls), CSV<br />
                • Duplicate ID numbers will be rejected<br />
                • Invalid data will be flagged for review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BulkUploadTab;

