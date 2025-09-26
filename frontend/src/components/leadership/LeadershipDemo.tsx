// LeadershipDemo Component
// Demo component to test leadership assignment functionality

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import {
  PlayArrow,
  Assignment,
  Person,
  CheckCircle,
  Info
} from '@mui/icons-material';
import { useUI } from '../../store';
import { LeadershipManagement, LeadershipAssignment, MemberSelector } from './index';

// =====================================================
// LeadershipDemo Component
// =====================================================

const LeadershipDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [memberSelectorOpen, setMemberSelectorOpen] = useState(false);
  const { addNotification } = useUI();

  // ==================== Demo Scenarios ====================
  
  const demoScenarios = [
    {
      id: 'full-management',
      title: 'Full Leadership Management',
      description: 'Complete leadership management dashboard with all features',
      component: 'LeadershipManagement',
      features: [
        'Leadership statistics overview',
        'Quick action buttons',
        'Recent appointments tracking',
        'Tabbed interface navigation',
        'Organizational structure view'
      ]
    },
    {
      id: 'assignment-only',
      title: 'Assignment Interface Only',
      description: 'Core assignment interface for creating new appointments',
      component: 'LeadershipAssignment',
      features: [
        'Position filtering by hierarchy',
        'Search functionality',
        'Vacant position highlighting',
        'Member selection integration',
        'Assignment form validation'
      ]
    },
    {
      id: 'member-selector',
      title: 'Member Selector Dialog',
      description: 'Advanced member selection with filtering and search',
      component: 'MemberSelector',
      features: [
        'Advanced search capabilities',
        'Geographic filtering',
        'Member eligibility validation',
        'Profile preview',
        'Pagination support'
      ]
    }
  ];

  // ==================== Event Handlers ====================
  
  const handleStartDemo = (demoId: string) => {
    setActiveDemo(demoId);
    addNotification({
      type: 'info',
      message: `Starting ${demoId} demo`
    });
  };

  const handleStopDemo = () => {
    setActiveDemo(null);
    setMemberSelectorOpen(false);
    addNotification({
      type: 'info',
      message: 'Demo stopped'
    });
  };

  const handleMemberSelect = (member: any) => {
    addNotification({
      type: 'success',
      message: `Selected member: ${member.full_name}`
    });
    setMemberSelectorOpen(false);
  };

  const handleAssignmentComplete = () => {
    addNotification({
      type: 'success',
      message: 'Assignment completed successfully!'
    });
  };

  // ==================== Render Demo Content ====================
  
  const renderDemoContent = () => {
    switch (activeDemo) {
      case 'full-management':
        return <LeadershipManagement />;
      
      case 'assignment-only':
        return <LeadershipAssignment onAssignmentComplete={handleAssignmentComplete} />;
      
      case 'member-selector':
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Click the button below to open the Member Selector dialog.
            </Alert>
            <Button
              variant="contained"
              startIcon={<Person />}
              onClick={() => setMemberSelectorOpen(true)}
            >
              Open Member Selector
            </Button>
            <MemberSelector
              open={memberSelectorOpen}
              onClose={() => setMemberSelectorOpen(false)}
              onSelect={handleMemberSelect}
              title="Demo Member Selection"
              filterByLevel="National"
              entityId={1}
            />
          </Box>
        );
      
      default:
        return null;
    }
  };

  // ==================== Render ====================
  
  if (activeDemo) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            Demo: {demoScenarios.find(s => s.id === activeDemo)?.title}
          </Typography>
          <Button variant="outlined" onClick={handleStopDemo}>
            Stop Demo
          </Button>
        </Box>
        {renderDemoContent()}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayArrow color="primary" />
          Leadership Assignment System Demo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Interactive demonstration of the leadership assignment components
        </Typography>
      </Box>

      {/* System Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Overview
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            This demo showcases the complete leadership assignment system with all its components and features.
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Key Features:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Complete assignment workflow" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Advanced member selection" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Real-time validation" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Comprehensive dashboard" />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Technical Stack:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                <Chip label="React 18+" size="small" color="primary" />
                <Chip label="TypeScript" size="small" color="secondary" />
                <Chip label="Material-UI" size="small" color="info" />
                <Chip label="React Query" size="small" color="success" />
                <Chip label="Date Pickers" size="small" color="warning" />
                <Chip label="Form Validation" size="small" color="error" />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Demo Scenarios */}
      <Typography variant="h5" gutterBottom>
        Available Demos
      </Typography>
      
      <Grid container spacing={3}>
        {demoScenarios.map((scenario) => (
          <Grid item xs={12} md={4} key={scenario.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Assignment color="primary" />
                  <Typography variant="h6">
                    {scenario.title}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {scenario.description}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  Features:
                </Typography>
                <List dense>
                  {scenario.features.map((feature, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Info fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
              
              <Box p={2} pt={0}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={() => handleStartDemo(scenario.id)}
                >
                  Start Demo
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Usage Instructions */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Usage Instructions
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            <strong>Ready to use!</strong> All components are fully implemented and integrated with the backend API.
          </Alert>
          
          <Typography variant="body2" paragraph>
            <strong>To use in your application:</strong>
          </Typography>
          
          <Box component="pre" sx={{ 
            bgcolor: 'grey.100', 
            p: 2, 
            borderRadius: 1, 
            overflow: 'auto',
            fontSize: '0.875rem'
          }}>
{`import { LeadershipManagement } from '../components/leadership';

function LeadershipPage() {
  return <LeadershipManagement />;
}`}
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2 }}>
            The system automatically handles authentication, validation, and API integration.
            Ensure your user has admin level 3 permissions for creating appointments.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LeadershipDemo;
