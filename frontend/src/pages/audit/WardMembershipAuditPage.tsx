import React from 'react';
import { Box } from '@mui/material';
import PageHeader from '../../components/ui/PageHeader';
import WardMembershipAuditDashboard from '../../components/audit/WardMembershipAuditDashboard';
import { useMunicipalityContext } from '../../hooks/useMunicipalityContext';

const WardMembershipAuditPage: React.FC = () => {
  const municipalityContext = useMunicipalityContext();

  const getPageTitle = () => {
    if (municipalityContext.shouldRestrictToMunicipality) {
      return `${municipalityContext.assignedMunicipality?.name || 'Municipality'} Ward Membership Audit`;
    }
    return 'Ward Membership Audit';
  };

  const getPageSubtitle = () => {
    if (municipalityContext.shouldRestrictToMunicipality) {
      return `Ward performance monitoring and compliance oversight for ${municipalityContext.assignedMunicipality?.name || 'your municipality'}`;
    }
    return 'Comprehensive oversight of ward performance and municipality compliance';
  };

  return (
    <Box>
      <PageHeader
        title={getPageTitle()}
        subtitle={getPageSubtitle()}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Audit', href: '/admin/audit' },
          { label: 'Ward Membership Audit', href: '/admin/audit/ward-membership' }
        ]}
      />
      <WardMembershipAuditDashboard />
    </Box>
  );
};

export default WardMembershipAuditPage;
