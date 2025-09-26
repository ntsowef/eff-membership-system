import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  Breadcrumbs,
  Link,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  CreditCard,
  VerifiedUser,
  GroupAdd,
  Analytics,
  Home,
  Business,
  Refresh,
  Security,
  QrCode,
  Download,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import DigitalCardGenerator from '../../components/cards/DigitalCardGenerator';
import CardVerification from '../../components/cards/CardVerification';
import BulkCardGenerator from '../../components/cards/BulkCardGenerator';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cards-tabpanel-${index}`}
      aria-labelledby={`cards-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `cards-tab-${index}`,
    'aria-controls': `cards-tabpanel-${index}`,
  };
}

const DigitalMembershipCards: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Fetch card statistics
  const { data: statisticsData, refetch: refetchStats } = useQuery({
    queryKey: ['card-statistics'],
    queryFn: async () => {
      const response = await api.get('/digital-cards/statistics');
      return response.data.data.card_statistics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    refetchStats();
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              color="inherit"
              onClick={() => navigate('/admin/dashboard')}
            >
              <Home sx={{ mr: 0.5 }} fontSize="inherit" />
              Dashboard
            </Link>
            <Link
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              color="inherit"
              onClick={() => navigate('/admin')}
            >
              <Business sx={{ mr: 0.5 }} fontSize="inherit" />
              Administration
            </Link>
            <Typography
              sx={{ display: 'flex', alignItems: 'center' }}
              color="text.primary"
            >
              <CreditCard sx={{ mr: 0.5 }} fontSize="inherit" />
              Digital Membership Cards
            </Typography>
          </Breadcrumbs>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Digital Membership Cards
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Generate, verify, and manage secure digital membership cards with QR codes
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
            >
              Refresh Data
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        {statisticsData && (
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    {statisticsData.total_cards_issued.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Cards Issued
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {statisticsData.active_cards.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Cards
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {statisticsData.cards_issued_this_month.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Issued This Month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {statisticsData.verification_requests_today}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Verifications Today
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* System Status */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label="QR Code Generation: Active"
            color="success"
            variant="outlined"
            size="small"
            icon={<QrCode />}
          />
          <Chip
            label="PDF Generation: Ready"
            color="success"
            variant="outlined"
            size="small"
            icon={<Download />}
          />
          <Chip
            label="Security Features: Enabled"
            color="success"
            variant="outlined"
            size="small"
            icon={<Security />}
          />
          <Chip
            label="Bulk Processing: Available"
            color="info"
            variant="outlined"
            size="small"
            icon={<GroupAdd />}
          />
        </Box>
      </Paper>

      {/* Main Content */}
      <Paper sx={{ mx: 3, mb: 3 }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="digital cards tabs">
            <Tab 
              label="Generate Card" 
              icon={<CreditCard />} 
              iconPosition="start"
              {...a11yProps(0)} 
            />
            <Tab 
              label="Verify Card" 
              icon={<VerifiedUser />} 
              iconPosition="start"
              {...a11yProps(1)} 
            />
            <Tab 
              label="Bulk Generation" 
              icon={<GroupAdd />} 
              iconPosition="start"
              {...a11yProps(2)} 
            />
            <Tab 
              label="Analytics" 
              icon={<Analytics />} 
              iconPosition="start"
              {...a11yProps(3)} 
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 3 }}>
            <DigitalCardGenerator />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <CardVerification />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <BulkCardGenerator />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            {statisticsData && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Digital Cards Analytics
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Template Usage
                        </Typography>
                        {Object.entries(statisticsData.template_usage).map(([template, percentage]) => (
                          <Box key={template} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                {template}
                              </Typography>
                              <Typography variant="body2">
                                {percentage}%
                              </Typography>
                            </Box>
                            <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                              <Box
                                sx={{
                                  width: `${percentage}%`,
                                  bgcolor: 'primary.main',
                                  height: 8,
                                  borderRadius: 1,
                                }}
                              />
                            </Box>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Recent Activity
                        </Typography>
                        {statisticsData.recent_activity.map((activity: any, index: number) => (
                          <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {activity.date}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Cards Generated: {activity.cards_generated}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Verifications: {activity.verifications}
                            </Typography>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Feature Information */}
      <Paper sx={{ mx: 3, mb: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Digital Membership Cards Features
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                🔐 Security Features
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • QR code with encrypted member data
                <br />
                • SHA-256 security hash protection
                <br />
                • Tamper-evident digital signatures
                <br />
                • Real-time verification system
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                📱 Digital Features
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Professional PDF card generation
                <br />
                • Mobile-friendly QR codes
                <br />
                • Multiple card templates
                <br />
                • Instant download and email delivery
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                ⚡ Management Tools
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Bulk card generation for multiple members
                <br />
                • Real-time card verification
                <br />
                • Comprehensive analytics and reporting
                <br />
                • Card revocation and reactivation
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default DigitalMembershipCards;
