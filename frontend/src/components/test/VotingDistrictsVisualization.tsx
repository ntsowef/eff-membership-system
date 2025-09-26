import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { geographicApi } from '../../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VotingDistrictsVisualization: React.FC = () => {
  const [selectedWard, setSelectedWard] = useState<string>('59500105'); // eThekwini Ward 105

  // Fetch voting districts for the selected ward
  const { data: votingDistricts, isLoading, error } = useQuery({
    queryKey: ['voting-districts-viz', selectedWard],
    queryFn: () => geographicApi.getVotingDistrictsByWard(selectedWard),
    enabled: !!selectedWard,
  });

  // Fetch wards for eThekwini to show options
  const { data: wards } = useQuery({
    queryKey: ['wards-eth'],
    queryFn: () => geographicApi.getWards('ETH'),
  });

  // Sample data for charts
  const sampleWards = [
    { ward: 'Ward 101', votingDistricts: 25, members: 120 },
    { ward: 'Ward 102', votingDistricts: 22, members: 98 },
    { ward: 'Ward 103', votingDistricts: 30, members: 145 },
    { ward: 'Ward 104', votingDistricts: 18, members: 87 },
    { ward: 'Ward 105', votingDistricts: 28, members: 156 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Voting Districts Visualization
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          This page demonstrates voting districts display in both dropdown and chart formats.
          Currently showing data for eThekwini Municipality, KwaZulu-Natal.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Left Column - Controls and Data */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ward Selection
              </Typography>
              
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                {['59500101', '59500102', '59500103', '59500104', '59500105'].map((wardCode) => (
                  <Chip
                    key={wardCode}
                    label={`Ward ${wardCode.slice(-3)}`}
                    onClick={() => setSelectedWard(wardCode)}
                    color={selectedWard === wardCode ? 'primary' : 'default'}
                    variant={selectedWard === wardCode ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Click on a ward to see its voting districts
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Voting Districts for Ward {selectedWard.slice(-3)}
              </Typography>
              
              {isLoading && (
                <Box display="flex" alignItems="center" gap={2}>
                  <CircularProgress size={20} />
                  <Typography>Loading voting districts...</Typography>
                </Box>
              )}
              
              {error && (
                <Alert severity="error">
                  <Typography variant="body2">
                    Error loading voting districts: {error.message}
                  </Typography>
                </Alert>
              )}
              
              {votingDistricts && (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Found {votingDistricts.data?.length || 0} voting districts</strong>
                    </Typography>
                  </Alert>
                  
                  {votingDistricts.data && votingDistricts.data.length > 0 && (
                    <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {votingDistricts.data.map((vd: any, index: number) => (
                        <React.Fragment key={vd.voting_district_code}>
                          <ListItem>
                            <ListItemText
                              primary={`VD ${vd.voting_district_number} - ${vd.voting_district_name}`}
                              secondary={
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Code: {vd.voting_district_code}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Members: {vd.member_count || 0}
                                  </Typography>
                                  <Chip 
                                    label={vd.is_active ? 'Active' : 'Inactive'} 
                                    size="small" 
                                    color={vd.is_active ? 'success' : 'default'}
                                    sx={{ mt: 0.5 }}
                                  />
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < votingDistricts.data.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Charts */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Voting Districts Distribution (Sample Data)
              </Typography>
              
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sampleWards}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ ward, votingDistricts }) => `${ward}: ${votingDistricts}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="votingDistricts"
                  >
                    {sampleWards.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Members by Ward (Sample Data)
              </Typography>
              
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sampleWards}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ward" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="members" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary Statistics */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Summary
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  21,656
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Voting Districts
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  4,468
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Wards
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  213
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Municipalities
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  9
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Provinces
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How to Test Voting Districts
          </Typography>
          
          <Typography variant="body2" paragraph>
            1. <strong>Dropdown Test:</strong> Use the GeographicSelector test page to see voting districts in dropdown format
          </Typography>
          
          <Typography variant="body2" paragraph>
            2. <strong>Chart Visualization:</strong> This page shows how voting districts can be displayed in charts
          </Typography>
          
          <Typography variant="body2" paragraph>
            3. <strong>API Integration:</strong> The data is loaded from the backend API in real-time
          </Typography>
          
          <Typography variant="body2" paragraph>
            4. <strong>Member Assignment:</strong> Members can be assigned to specific voting districts during registration
          </Typography>
          
          <Box mt={2}>
            <Button 
              variant="outlined" 
              href="/admin/test/geographic-selector"
              sx={{ mr: 2 }}
            >
              Test GeographicSelector
            </Button>
            <Button 
              variant="outlined" 
              href="/admin/test/voting-districts"
            >
              Test API Directly
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VotingDistrictsVisualization;
