import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { Download, PictureAsPdf, TableChart, Description } from '@mui/icons-material';

const PDFExportTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastExport, setLastExport] = useState<{
    format: string;
    timestamp: string;
    success: boolean;
    error?: string;
  } | null>(null);

  const [exportParams, setExportParams] = useState({
    format: 'pdf',
    ward_code: '59500105',
    gender_id: '',
    age_min: '',
    age_max: '',
    search: ''
  });

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    setLoading(true);
    setLastExport(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('format', format);
      
      if (exportParams.ward_code) params.append('ward_code', exportParams.ward_code);
      if (exportParams.gender_id) params.append('gender_id', exportParams.gender_id);
      if (exportParams.age_min) params.append('age_min', exportParams.age_min);
      if (exportParams.age_max) params.append('age_max', exportParams.age_max);
      if (exportParams.search) params.append('search', exportParams.search);

      const url = `http://localhost:5000/api/v1/members/export?${params.toString()}`;
      console.log('🔄 Exporting:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': format === 'pdf' ? 'application/pdf' : 'application/octet-stream'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Export failed';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Get the blob and create download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'excel' ? 'xlsx' : format;
      link.download = `members-export-${timestamp}.${extension}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(downloadUrl);

      setLastExport({
        format,
        timestamp: new Date().toLocaleString(),
        success: true
      });

    } catch (error) {
      console.error('Export error:', error);
      setLastExport({
        format,
        timestamp: new Date().toLocaleString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVotingDistrictsExport = async () => {
    setLoading(true);
    
    try {
      const url = `http://localhost:5000/api/v1/voting-districts/export/pdf?ward_code=${exportParams.ward_code}`;
      console.log('🗳️ Exporting voting districts:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        throw new Error('Voting districts export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `voting-districts-${new Date().toISOString().split('T')[0]}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);

      setLastExport({
        format: 'pdf',
        timestamp: new Date().toLocaleString(),
        success: true
      });

    } catch (error) {
      console.error('Voting districts export error:', error);
      setLastExport({
        format: 'pdf',
        timestamp: new Date().toLocaleString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        PDF Export Test
      </Typography>
      
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>✅ PDF Export is now working!</strong> You can export members and voting districts to PDF format.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Export Parameters */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Export Parameters
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Ward Code"
                    value={exportParams.ward_code}
                    onChange={(e) => setExportParams(prev => ({ ...prev, ward_code: e.target.value }))}
                    placeholder="e.g., 59500105"
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={exportParams.gender_id}
                      onChange={(e) => setExportParams(prev => ({ ...prev, gender_id: e.target.value }))}
                      label="Gender"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="1">Male</MenuItem>
                      <MenuItem value="2">Female</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Min Age"
                    type="number"
                    value={exportParams.age_min}
                    onChange={(e) => setExportParams(prev => ({ ...prev, age_min: e.target.value }))}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Max Age"
                    type="number"
                    value={exportParams.age_max}
                    onChange={(e) => setExportParams(prev => ({ ...prev, age_max: e.target.value }))}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Search"
                    value={exportParams.search}
                    onChange={(e) => setExportParams(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search by name, phone, email..."
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Export Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Export Actions
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdf />}
                  onClick={() => handleExport('pdf')}
                  disabled={loading}
                  fullWidth
                >
                  Export Members to PDF
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<TableChart />}
                  onClick={() => handleExport('csv')}
                  disabled={loading}
                  fullWidth
                >
                  Export Members to CSV
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Description />}
                  onClick={() => handleExport('excel')}
                  disabled={loading}
                  fullWidth
                >
                  Export Members to Excel
                </Button>
                
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<PictureAsPdf />}
                  onClick={handleVotingDistrictsExport}
                  disabled={loading}
                  fullWidth
                >
                  Export Voting Districts to PDF
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export Results */}
      {lastExport && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Last Export Result
            </Typography>
            
            {lastExport.success ? (
              <Alert severity="success">
                <Typography variant="body2">
                  <strong>✅ Export Successful!</strong>
                  <br />Format: <Chip label={lastExport.format.toUpperCase()} size="small" />
                  <br />Time: {lastExport.timestamp}
                  <br />The file should have been downloaded to your Downloads folder.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="error">
                <Typography variant="body2">
                  <strong>❌ Export Failed</strong>
                  <br />Format: <Chip label={lastExport.format.toUpperCase()} size="small" color="error" />
                  <br />Time: {lastExport.timestamp}
                  <br />Error: {lastExport.error}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How to Test PDF Export
          </Typography>
          
          <Typography variant="body2" paragraph>
            1. <strong>Set Parameters:</strong> Configure ward code, gender, age range, or search terms
          </Typography>
          
          <Typography variant="body2" paragraph>
            2. <strong>Click Export:</strong> Choose PDF, CSV, or Excel format
          </Typography>
          
          <Typography variant="body2" paragraph>
            3. <strong>Download:</strong> The file will be automatically downloaded
          </Typography>
          
          <Typography variant="body2" paragraph>
            4. <strong>Verify:</strong> Open the downloaded file to verify the export worked
          </Typography>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Sample Ward Codes to Test:</strong>
              <br />• 59500105 (eThekwini Ward 105)
              <br />• 49400041 (Mangaung Ward 41)
              <br />• 79900105 (Tshwane Ward 105)
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PDFExportTest;
