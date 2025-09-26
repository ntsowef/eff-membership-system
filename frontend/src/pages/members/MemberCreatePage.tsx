import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { PersonAdd } from '@mui/icons-material';

const MemberCreatePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Add New Member
      </Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <PersonAdd sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Member Registration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Form to register new members directly into the system
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MemberCreatePage;
