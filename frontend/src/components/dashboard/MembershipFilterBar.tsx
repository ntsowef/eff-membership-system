import React from 'react';
import { Box, ToggleButtonGroup, ToggleButton, Paper, Typography, Chip } from '@mui/material';
import { People, CheckCircle, HowToReg } from '@mui/icons-material';
import type { MembershipFilterType } from '../../types/membership';

interface MembershipFilterBarProps {
  value: MembershipFilterType;
  onChange: (value: MembershipFilterType) => void;
}

const MembershipFilterBar: React.FC<MembershipFilterBarProps> = ({ value, onChange }) => {
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: MembershipFilterType | null
  ) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  const getFilterLabel = (filter: MembershipFilterType): string => {
    switch (filter) {
      case 'all':
        return 'All Members';
      case 'good_standing':
        return 'Good Standing Only';
      case 'active':
        return 'Active Members Only';
      default:
        return 'All Members';
    }
  };

  const getFilterDescription = (filter: MembershipFilterType): string => {
    switch (filter) {
      case 'all':
        return 'Showing all members regardless of status';
      case 'good_standing':
        return 'Showing only members with Active status (membership_status_id = 1)';
      case 'active':
        return 'Showing only members with active membership statuses';
      default:
        return '';
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 3,
        backgroundColor: 'background.paper',
        borderLeft: 4,
        borderColor: value === 'all' ? 'primary.main' : value === 'good_standing' ? 'success.main' : 'info.main',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Membership Filter
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getFilterDescription(value)}
            </Typography>
          </Box>
          
          <Chip
            label={`Current: ${getFilterLabel(value)}`}
            color={value === 'all' ? 'default' : value === 'good_standing' ? 'success' : 'info'}
            variant="filled"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {/* Toggle Buttons */}
        <ToggleButtonGroup
          value={value}
          exclusive
          onChange={handleChange}
          aria-label="membership filter"
          fullWidth
          sx={{
            '& .MuiToggleButton-root': {
              py: 1.5,
              px: 3,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            },
          }}
        >
          <ToggleButton value="all" aria-label="all members">
            <People sx={{ mr: 1 }} />
            All Members
          </ToggleButton>
          <ToggleButton value="good_standing" aria-label="good standing">
            <CheckCircle sx={{ mr: 1 }} />
            Good Standing
          </ToggleButton>
          <ToggleButton value="active" aria-label="active members">
            <HowToReg sx={{ mr: 1 }} />
            Active Status
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Paper>
  );
};

export default MembershipFilterBar;

