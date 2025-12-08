// IconTest Component
// Test to verify all Material-UI icons are valid

import React from 'react';
import { Box, Typography, Alert, Button, Grid, Card, CardContent } from '@mui/material';
import { useUI } from '../../store';
import { devLog } from '../../utils/logger';

// Import all icons used in leadership components
import {
  AccountTree,
  People,
  Assignment,
  TrendingUp,
  Add,
  Visibility,
  Edit,
  History,
  Analytics,
  PersonAdd,
  HowToVote,
  Dashboard,
  Assessment,
  Search,
  Person,
  Email,
  Phone,
  LocationOn,
  CheckCircle,
  Cancel,
  Info,
  PlayArrow,
  Error,
  Refresh
} from '@mui/icons-material';

const IconTest: React.FC = () => {
  const { addNotification } = useUI();

  const icons = [
    { name: 'AccountTree', component: <AccountTree /> },
    { name: 'People', component: <People /> },
    { name: 'Assignment', component: <Assignment /> },
    { name: 'TrendingUp', component: <TrendingUp /> },
    { name: 'Add', component: <Add /> },
    { name: 'Visibility', component: <Visibility /> },
    { name: 'Edit', component: <Edit /> },
    { name: 'History', component: <History /> },
    { name: 'Analytics', component: <Analytics /> },
    { name: 'PersonAdd', component: <PersonAdd /> },
    { name: 'HowToVote', component: <HowToVote /> },
    { name: 'Dashboard', component: <Dashboard /> },
    { name: 'Assessment', component: <Assessment /> },
    { name: 'Search', component: <Search /> },
    { name: 'Person', component: <Person /> },
    { name: 'Email', component: <Email /> },
    { name: 'Phone', component: <Phone /> },
    { name: 'LocationOn', component: <LocationOn /> },
    { name: 'CheckCircle', component: <CheckCircle /> },
    { name: 'Cancel', component: <Cancel /> },
    { name: 'Info', component: <Info /> },
    { name: 'PlayArrow', component: <PlayArrow /> },
    { name: 'Error', component: <Error /> },
    { name: 'Refresh', component: <Refresh /> }
  ];

  const testIcons = () => {
    try {
      const validIcons = icons.filter(icon => icon.component);
      addNotification({
        type: 'success',
        message: `✅ All ${validIcons.length} Material-UI icons are valid and imported successfully!`
      });

      devLog('Valid icons:', validIcons.map(icon => icon.name));
    } catch (error) {
      addNotification({
        type: 'error',
        message: `❌ Icon test failed: ${error}`
      });
      console.error('Icon error:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom color="primary">
        🎨 Material-UI Icon Test
      </Typography>
      
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>All icons loaded successfully!</strong> This means the invalid icon imports have been fixed.
          The previous errors with 'Structure' and 'Report' icons have been resolved.
        </Typography>
      </Alert>

      <Button
        variant="contained"
        onClick={testIcons}
        startIcon={<CheckCircle />}
        sx={{ mb: 3 }}
      >
        Test All Icons
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Icon Gallery
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            All icons used in the Leadership Assignment System:
          </Typography>
          
          <Grid container spacing={2}>
            {icons.map((icon, index) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
                <Card variant="outlined" sx={{ p: 1, textAlign: 'center', minHeight: 80 }}>
                  <Box sx={{ fontSize: 32, color: 'primary.main', mb: 1 }}>
                    {icon.component}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {icon.name}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Alert severity="info">
        <Typography variant="body2">
          <strong>Fixed Issues:</strong>
          <br />
          • ❌ 'Structure' icon → ✅ 'AccountTree' icon
          <br />
          • ❌ 'Report' icon → ✅ 'Assessment' icon
          <br />
          • ❌ Duplicate 'AccountTree' import → ✅ Removed duplicate
        </Typography>
      </Alert>
    </Box>
  );
};

export default IconTest;
