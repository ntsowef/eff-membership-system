import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import LoginForm from '../../components/auth/LoginForm';
import { useAuth } from '../../store';

const LoginDemo: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleLoginSuccess = (userData: any, token: string) => {
    login(userData, token);
    setLoginSuccess(true);
  };

  const handleLogout = () => {
    logout();
    setLoginSuccess(false);
  };

  if (isAuthenticated && user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={3}>
              <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" component="h1" gutterBottom color="success.main">
                Login Successful!
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Welcome to the Membership Management System
              </Typography>
            </Box>

            <Alert severity="success" sx={{ mb: 3 }}>
              Authentication successful! You are now logged in as an admin user.
            </Alert>

            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                User Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <AccountIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Name"
                    secondary={`${user.firstname} ${user.surname || ''}`.trim()}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={user.email}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AdminIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Admin Level"
                    secondary={
                      <Chip 
                        label={`Level ${user.admin_level}`} 
                        color="primary" 
                        size="small" 
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Status"
                    secondary={
                      <Chip 
                        label={user.is_active ? 'Active' : 'Inactive'} 
                        color={user.is_active ? 'success' : 'error'} 
                        size="small" 
                      />
                    }
                  />
                </ListItem>
              </List>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box textAlign="center">
              <Typography variant="h6" gutterBottom>
                Next Steps
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                You can now access the user management system and perform administrative tasks.
              </Typography>
              
              <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                <Button 
                  variant="contained" 
                  color="primary"
                  href="/system/user-management"
                >
                  Go to User Management
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary"
                  href="/dashboard"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Box>
      <LoginForm onLoginSuccess={handleLoginSuccess} />
      
      {/* Demo Information */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Management System Demo
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              This demo showcases the complete user management system with hierarchical admin levels,
              multi-factor authentication support, and comprehensive security features.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              Available Demo Accounts:
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <AdminIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary="Super Administrator"
                  secondary="admin@membership.org / Admin123! - Full system access"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AdminIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Province Administrator"
                  secondary="gauteng.admin@membership.org / ProvAdmin123! - Gauteng province access"
                />
              </ListItem>
            </List>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              System Features:
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="Hierarchical admin levels (National → Province → District → Municipality → Ward)" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="Geographic boundary enforcement" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="Multi-factor authentication (MFA) support" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="Session management with concurrent login limits" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="User creation workflow with approval system" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="Comprehensive audit logging" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText primary="Real-time statistics and monitoring" />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginDemo;
