import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import EFFLogo from './EFFLogo';

const LogoShowcase: React.FC = () => {
  return (
    <Paper sx={{ p: 4, m: 2 }}>
      <Typography variant="h4" gutterBottom align="center">
        EFF Logo Showcase
      </Typography>
      
      <Grid container spacing={4} justifyContent="center" alignItems="center">
        <Grid item>
          <Box textAlign="center">
            <EFFLogo size={32} />
            <Typography variant="caption" display="block" mt={1}>
              Small (32px)
            </Typography>
          </Box>
        </Grid>
        
        <Grid item>
          <Box textAlign="center">
            <EFFLogo size={48} />
            <Typography variant="caption" display="block" mt={1}>
              Medium (48px)
            </Typography>
          </Box>
        </Grid>
        
        <Grid item>
          <Box textAlign="center">
            <EFFLogo size={64} />
            <Typography variant="caption" display="block" mt={1}>
              Large (64px)
            </Typography>
          </Box>
        </Grid>
        
        <Grid item>
          <Box textAlign="center">
            <EFFLogo size={96} />
            <Typography variant="caption" display="block" mt={1}>
              Extra Large (96px)
            </Typography>
          </Box>
        </Grid>
      </Grid>
      
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Color Variations
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Box textAlign="center" p={2} bgcolor="#000000" borderRadius={2}>
              <EFFLogo size={48} color="#FE0000" />
              <Typography variant="caption" display="block" mt={1} color="white">
                Red on Black
              </Typography>
            </Box>
          </Grid>
          
          <Grid item>
            <Box textAlign="center" p={2} bgcolor="#FFFFFF" border="1px solid #ccc" borderRadius={2}>
              <EFFLogo size={48} color="#FE0000" />
              <Typography variant="caption" display="block" mt={1}>
                Red on White
              </Typography>
            </Box>
          </Grid>
          
          <Grid item>
            <Box textAlign="center" p={2} bgcolor="#FE0000" borderRadius={2}>
              <EFFLogo size={48} color="#FFFFFF" />
              <Typography variant="caption" display="block" mt={1} color="white">
                White on Red
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default LogoShowcase;
