import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button
} from '@mui/material';
import {
  AccountTree,
  People,
  Assignment,
  TrendingUp,
  Settings,
  Dashboard
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import { LeadershipManagement } from '../../components/leadership';
import WarCouncilStructure from '../../components/leadership/WarCouncilStructure';

// Interfaces
interface LeadershipStructure {
  id: number;
  structure_name: string;
  structure_code: string;
  hierarchy_level: string;
  total_positions: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OrganizationalStructure {
  structure_name: string;
  structure_code: string;
  hierarchy_level: string;
  total_positions: number;
  defined_positions: number;
  filled_positions: number;
  vacant_positions: number;
  fill_rate_percentage: number;
}

interface LeadershipAnalytics {
  total_positions: number;
  filled_positions: number;
  vacant_positions: number;
  total_elections: number;
  completed_elections: number;
  upcoming_elections: number;
  organizational_structures: OrganizationalStructure[];
  positions_by_hierarchy: Array<{
    hierarchy_level: string;
    total_positions: number;
    filled_positions: number;
    vacancy_rate: number;
  }>;
}

const LeadershipPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [showManagement, setShowManagement] = useState(false);

  // Fetch leadership structures
  const { data: structuresData, isLoading: structuresLoading, error: structuresError } = useQuery({
    queryKey: ['leadership-structures'],
    queryFn: () => apiGet('/leadership/structures'),
  });

  // Fetch leadership analytics
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['leadership-analytics'],
    queryFn: () => apiGet('/analytics/leadership'),
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // If management mode is enabled, show the full management interface
  if (showManagement) {
    return (
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Leadership Management System
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Dashboard />}
            onClick={() => setShowManagement(false)}
          >
            Back to Overview
          </Button>
        </Box>
        <LeadershipManagement />
      </Box>
    );
  }

  const getHierarchyColor = (level: string) => {
    switch (level) {
      case 'National': return 'error';
      case 'Province': return 'warning';
      case 'Municipality': return 'info';
      case 'Ward': return 'success';
      default: return 'default';
    }
  };

  const getHierarchyIcon = (level: string) => {
    switch (level) {
      case 'National': return '🏛️';
      case 'Province': return '🏢';
      case 'Municipality': return '🏘️';
      case 'Ward': return '🏠';
      default: return '📍';
    }
  };

  if (structuresLoading || analyticsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (structuresError || analyticsError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load leadership data. Please try again later.
      </Alert>
    );
  }

  const structures: LeadershipStructure[] = (structuresData as any)?.data?.structures || [];
  const analytics: LeadershipAnalytics = (analyticsData as any)?.data?.analytics || {};

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountTree color="primary" />
              Organizational Leadership Structure
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive overview of the organizational leadership hierarchy and structure analytics
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Settings />}
            onClick={() => setShowManagement(true)}
            sx={{ mt: 1 }}
          >
            Manage Leadership
          </Button>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <People sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {analytics.total_positions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Positions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Assignment sx={{ fontSize: 40, color: 'success.main' }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {analytics.filled_positions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Filled Positions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUp sx={{ fontSize: 40, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {analytics.vacant_positions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vacant Positions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AccountTree sx={{ fontSize: 40, color: 'info.main' }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {structures.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Command Teams
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Organizational Structures" />
          <Tab label="War Council" />
          <Tab label="Analytics Dashboard" />
          <Tab label="Organizational Chart" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {structures.map((structure) => {
            const structureAnalytics = analytics.organizational_structures?.find(
              s => s.structure_code === structure.structure_code
            );

            return (
              <Grid item xs={12} md={6} key={structure.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Typography variant="h2" sx={{ fontSize: '2rem' }}>
                        {getHierarchyIcon(structure.hierarchy_level)}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="h3">
                          {structure.structure_name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            label={structure.structure_code}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                          <Chip
                            label={structure.hierarchy_level}
                            size="small"
                            color={getHierarchyColor(structure.hierarchy_level) as any}
                          />
                        </Box>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {structure.description}
                    </Typography>

                    {structureAnalytics && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">
                            Fill Rate: {structureAnalytics.fill_rate_percentage}%
                          </Typography>
                          <Typography variant="body2">
                            {structureAnalytics.filled_positions} / {structureAnalytics.total_positions}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={parseFloat(structureAnalytics.fill_rate_percentage.toString())}
                          sx={{ mb: 2 }}
                        />

                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Total</Typography>
                            <Typography variant="h6">{structureAnalytics.total_positions}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Filled</Typography>
                            <Typography variant="h6" color="success.main">
                              {structureAnalytics.filled_positions}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Vacant</Typography>
                            <Typography variant="h6" color="warning.main">
                              {structureAnalytics.vacant_positions}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* War Council Tab */}
      {tabValue === 1 && (
        <WarCouncilStructure />
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Leadership Fill Rates by Hierarchy
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Hierarchy Level</TableCell>
                        <TableCell align="right">Total Positions</TableCell>
                        <TableCell align="right">Filled Positions</TableCell>
                        <TableCell align="right">Vacancy Rate</TableCell>
                        <TableCell align="center">Progress</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.positions_by_hierarchy?.map((row) => (
                        <TableRow key={row.hierarchy_level}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">
                                {getHierarchyIcon(row.hierarchy_level)}
                              </Typography>
                              <Typography variant="body2">
                                {row.hierarchy_level}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{row.total_positions}</TableCell>
                          <TableCell align="right">{row.filled_positions}</TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              color={parseFloat(row.vacancy_rate.toString()) > 50 ? 'error.main' : 'text.primary'}
                            >
                              {row.vacancy_rate}%
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ width: 100 }}>
                              <LinearProgress
                                variant="determinate"
                                value={100 - parseFloat(row.vacancy_rate.toString())}
                                color={parseFloat(row.vacancy_rate.toString()) > 50 ? 'error' : 'primary'}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
                  Organizational Command Structure Hierarchy
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
                  Simplified example showing the hierarchical reporting structure from National to Ward levels
                </Typography>

                {/* Organizational Chart */}
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  py: 3,
                  minHeight: '600px'
                }}>

                  {/* National Level - CCT */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{
                      bgcolor: 'error.main',
                      color: 'white',
                      px: 4,
                      py: 2,
                      borderRadius: 2,
                      minWidth: 280,
                      boxShadow: 3
                    }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        🏛️ NATIONAL LEVEL
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        Central Command Team (CCT)
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        66 Leadership Positions
                      </Typography>
                    </Box>
                  </Box>

                  {/* Connection Line */}
                  <Box sx={{
                    width: 2,
                    height: 40,
                    bgcolor: 'grey.400',
                    position: 'relative'
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 100,
                      height: 2,
                      bgcolor: 'grey.400'
                    }} />
                  </Box>

                  {/* Provincial Level - PCT */}
                  <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['Limpopo PCT', 'Gauteng PCT', 'KwaZulu-Natal PCT'].map((province, index) => (
                      <Box key={province} sx={{ textAlign: 'center' }}>
                        <Box sx={{
                          bgcolor: 'warning.main',
                          color: 'white',
                          px: 3,
                          py: 2,
                          borderRadius: 2,
                          minWidth: 200,
                          boxShadow: 2
                        }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                            🏢 PROVINCIAL
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {province}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            35 Positions Each
                          </Typography>
                        </Box>

                        {/* Connection Line Down */}
                        <Box sx={{
                          width: 2,
                          height: 40,
                          bgcolor: 'grey.400',
                          mx: 'auto',
                          mt: 2
                        }} />

                        {/* Municipal Level - SRCT */}
                        <Box sx={{
                          bgcolor: 'info.main',
                          color: 'white',
                          px: 2,
                          py: 1.5,
                          borderRadius: 2,
                          minWidth: 180,
                          boxShadow: 2,
                          mt: 2
                        }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                            🏘️ MUNICIPAL
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            SRCT - Municipality {index + 1}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            15 Positions
                          </Typography>
                        </Box>

                        {/* Connection Line Down */}
                        <Box sx={{
                          width: 2,
                          height: 40,
                          bgcolor: 'grey.400',
                          mx: 'auto',
                          mt: 2
                        }} />

                        {/* Ward Level - BCT */}
                        <Box sx={{
                          bgcolor: 'success.main',
                          color: 'white',
                          px: 2,
                          py: 1.5,
                          borderRadius: 2,
                          minWidth: 160,
                          boxShadow: 2,
                          mt: 2
                        }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                            🏠 WARD
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            BCT - Ward {index + 1}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            7 Positions
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Legend */}
                  <Box sx={{
                    mt: 4,
                    p: 3,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    width: '100%',
                    maxWidth: 800
                  }}>
                    <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                      Command Structure Legend
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 20,
                            height: 20,
                            bgcolor: 'error.main',
                            borderRadius: 1
                          }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              CCT - National
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Central Command Team
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 20,
                            height: 20,
                            bgcolor: 'warning.main',
                            borderRadius: 1
                          }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              PCT - Provincial
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Provincial Command Team
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 20,
                            height: 20,
                            bgcolor: 'info.main',
                            borderRadius: 1
                          }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              SRCT - Municipal
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Sub-Regional Command Team
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 20,
                            height: 20,
                            bgcolor: 'success.main',
                            borderRadius: 1
                          }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              BCT - Ward
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Branch Command Team
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        📊 Full Scale Structure:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • <strong>1 CCT</strong> (National) → <strong>9 PCTs</strong> (Provinces) → <strong>200+ SRCTs</strong> (Municipalities) → <strong>4400+ BCTs</strong> (Wards)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        • Total Leadership Positions: <strong>~34,000+</strong> across all levels
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default LeadershipPage;
