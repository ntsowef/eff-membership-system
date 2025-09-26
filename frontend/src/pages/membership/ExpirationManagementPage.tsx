import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Home,
  Schedule,
} from '@mui/icons-material';
import MembershipExpirationDashboard from '../../components/membership/MembershipExpirationDashboard';
import { useMembershipExpirationStore } from '../../store/membershipExpirationStore';

const ExpirationManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { setActiveTab, setExpiringSoonFilters, setExpiredFilters } = useMembershipExpirationStore();

  useEffect(() => {
    // Check URL parameters for initial state
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const tab = searchParams.get('tab');

    // Set active tab based on URL parameter
    if (tab === 'expiring-soon') {
      setActiveTab('expiring-soon');
    } else if (tab === 'expired') {
      setActiveTab('expired');
    } else if (tab === 'overview') {
      setActiveTab('overview');
    }

    // Apply filters based on URL parameters
    if (priority && (tab === 'expiring-soon' || status === 'expiring')) {
      setActiveTab('expiring-soon');
      setExpiringSoonFilters({ priority: priority as any });
    }

    if (category && (tab === 'expired' || status === 'expired')) {
      setActiveTab('expired');
      setExpiredFilters({ category: category as any });
    }

    // Legacy status parameter support
    if (status === 'expiring') {
      setActiveTab('expiring-soon');
    } else if (status === 'expired') {
      setActiveTab('expired');
    }
  }, [searchParams, setActiveTab, setExpiringSoonFilters, setExpiredFilters]);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center' }}
            color="inherit"
            href="/admin/dashboard"
          >
            <Home sx={{ mr: 0.5 }} fontSize="inherit" />
            Dashboard
          </Link>
          <Typography
            sx={{ display: 'flex', alignItems: 'center' }}
            color="text.primary"
          >
            <Schedule sx={{ mr: 0.5 }} fontSize="inherit" />
            Membership Expiration
          </Typography>
        </Breadcrumbs>

        {/* Enhanced Membership Expiration Dashboard */}
        <MembershipExpirationDashboard />
      </Container>
    </Box>
  );
};

export default ExpirationManagementPage;
