import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { geographicApi } from '../../services/api';

const VotingDistrictsTest: React.FC = () => {
  const [testWardCode, setTestWardCode] = useState('59500105'); // Sample ward with many voting districts
  const [manualTest, setManualTest] = useState(false);

  // Test voting districts query
  const { data: votingDistricts, isLoading, error, refetch } = useQuery({
    queryKey: ['test-voting-districts', testWardCode],
    queryFn: () => geographicApi.getVotingDistrictsByWard(testWardCode),
    enabled: !!testWardCode && manualTest,
  });

  const handleTest = () => {
    setManualTest(true);
    refetch();
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Voting Districts API Test
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Configuration
          </Typography>
          
          <Box display="flex" gap={2} alignItems="center" mb={2}>
            <TextField
              label="Ward Code"
              value={testWardCode}
              onChange={(e) => setTestWardCode(e.target.value)}
              placeholder="Enter ward code (e.g., 59500105)"
              size="small"
            />
            <Button 
              variant="contained" 
              onClick={handleTest}
              disabled={!testWardCode}
            >
              Test API Call
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Sample ward codes to test:
            <br />• 59500105 (eThekwini Ward 105 - 28 voting districts)
            <br />• 49400041 (Mangaung Ward 41 - 22 voting districts)
            <br />• 79900105 (Tshwane Ward 105 - 21 voting districts)
          </Typography>
        </CardContent>
      </Card>

      {manualTest && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              API Response for Ward: {testWardCode}
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
                  <strong>Error:</strong> {error.message}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  API Endpoint: GET /api/v1/geographic/voting-districts/by-ward/{testWardCode}
                </Typography>
              </Alert>
            )}
            
            {votingDistricts && (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Success!</strong> Retrieved {votingDistricts.data?.length || 0} voting districts
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    API Endpoint: GET /api/v1/geographic/voting-districts/by-ward/{testWardCode}
                  </Typography>
                </Alert>
                
                {votingDistricts.data && votingDistricts.data.length > 0 && (
                  <>
                    <Typography variant="subtitle1" gutterBottom>
                      Voting Districts ({votingDistricts.data.length}):
                    </Typography>
                    
                    <List dense>
                      {votingDistricts.data.slice(0, 10).map((vd: any, _index: number) => (
                        <ListItem key={vd.voting_district_code} divider>
                          <ListItemText
                            primary={`VD ${vd.voting_district_number} - ${vd.voting_district_name}`}
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  Code: {vd.voting_district_code}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Ward: {vd.ward_name} ({vd.ward_number})
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Members: {vd.member_count || 0}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Active: {vd.is_active ? 'Yes' : 'No'}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                    
                    {votingDistricts.data.length > 10 && (
                      <Typography variant="caption" color="text.secondary">
                        ... and {votingDistricts.data.length - 10} more voting districts
                      </Typography>
                    )}
                    
                    <Box mt={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Raw API Response Structure:
                      </Typography>
                      <Box 
                        component="pre" 
                        sx={{ 
                          backgroundColor: 'grey.100', 
                          p: 2, 
                          borderRadius: 1, 
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: 200
                        }}
                      >
                        {JSON.stringify(votingDistricts.data[0], null, 2)}
                      </Box>
                    </Box>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default VotingDistrictsTest;
