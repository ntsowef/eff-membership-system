import React from 'react';
import { Box } from '@mui/material';
import MemberRegistrationForm from '../../components/members/MemberRegistrationForm';

const MemberCreatePage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <MemberRegistrationForm />
    </Box>
  );
};

export default MemberCreatePage;
