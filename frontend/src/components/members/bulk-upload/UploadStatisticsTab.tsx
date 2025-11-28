import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error,
  ContentCopy,
  TrendingUp,
} from '@mui/icons-material';
import { memberApplicationBulkUploadApi } from '../../../services/api';

interface Statistics {
  total_uploads: number;
  total_records_processed: number;
  total_successful: number;
  total_failed: number;
  total_duplicates: number;
  success_rate: number;
  recent_uploads: number;
}

const UploadStatisticsTab: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await memberApplicationBulkUploadApi.getRecentUploads(100);
      const uploads = response.data || [];

      // Calculate statistics
      const statistics: Statistics = {
        total_uploads: uploads.length,
        total_records_processed: uploads.reduce((sum: number, u: any) => sum + (u.total_records || 0), 0),
        total_successful: uploads.reduce((sum: number, u: any) => sum + (u.successful_records || 0), 0),
        total_failed: uploads.reduce((sum: number, u: any) => sum + (u.failed_records || 0), 0),
        total_duplicates: uploads.reduce((sum: number, u: any) => sum + (u.duplicate_records || 0), 0),
        success_rate: 0,
        recent_uploads: uploads.filter((u: any) => {
          const uploadDate = new Date(u.created_at);
          const dayAgo = new Date();
          dayAgo.setDate(dayAgo.getDate() - 1);
          return uploadDate > dayAgo;
        }).length,
      };

      // Calculate success rate
      if (statistics.total_records_processed > 0) {
        statistics.success_rate = Math.round(
          (statistics.total_successful / statistics.total_records_processed) * 100
        );
      }

      setStats(statistics);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No statistics available</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Upload Statistics
      </Typography>

      <Grid container spacing={3}>
        {/* Total Uploads */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudUpload sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.total_uploads}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Uploads
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Records Processed */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.total_records_processed}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Records Processed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Success Rate */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.success_rate}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Successful Records */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {stats.total_successful}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Successful
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Failed Records */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Error sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {stats.total_failed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Duplicate Records */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ContentCopy sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {stats.total_duplicates}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Duplicates
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Uploads (Last 24 hours) */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <CloudUpload sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.recent_uploads}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uploads in the last 24 hours
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Average records per upload:
                  </Typography>
                  <Typography variant="h6">
                    {stats.total_uploads > 0
                      ? Math.round(stats.total_records_processed / stats.total_uploads)
                      : 0}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Processing efficiency:
                  </Typography>
                  <Typography variant="h6">
                    {stats.total_records_processed > 0
                      ? `${Math.round(
                          ((stats.total_successful + stats.total_duplicates) /
                            stats.total_records_processed) *
                            100
                        )}%`
                      : '0%'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UploadStatisticsTab;

