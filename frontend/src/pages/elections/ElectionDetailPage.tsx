import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { HowToVote } from '@mui/icons-material';

const ElectionDetailPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Election Details
      </Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <HowToVote sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Election Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Detailed election management and voting interface
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ElectionDetailPage;
