import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  People,
  HowToVote,
  Event,
  CheckCircle,
  Assignment,
  SupervisorAccount,
  CreditCard,
} from '@mui/icons-material';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <People />,
      title: 'Revolutionary Membership',
      description: 'Join a movement of fighters committed to radical economic transformation and social justice',
      color: '#FE0000',
    },
    {
      icon: <SupervisorAccount />,
      title: 'Democratic Leadership',
      description: 'Transparent leadership structures from branch to national level, elected by the people',
      color: '#055305',
    },
    {
      icon: <HowToVote />,
      title: 'People\'s Elections',
      description: 'Fair and transparent elections ensuring every fighter\'s voice is heard in our democracy',
      color: '#FFAB00',
    },
    {
      icon: <Event />,
      title: 'Mass Mobilization',
      description: 'Coordinate meetings, rallies, and actions to advance the struggle for economic freedom',
      color: '#FE0000',
    },
  ];

  const benefits = [
    'Be part of the radical economic transformation of South Africa',
    'Participate in transparent and democratic leadership elections',
    'Join mass mobilization efforts and revolutionary actions',
    'Access to political education and ideological development',
    'Connect with fellow fighters across all nine provinces',
    'Contribute to the fight against white monopoly capital',
    'Support land redistribution without compensation',
    'Advance free quality education and healthcare for all',
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #FE0000 0%, #E20202 100%)',
          color: 'white',
          py: 10,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: '#FFAB00',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    letterSpacing: '0.1em'
                  }}
                >
                  ECONOMIC FREEDOM FIGHTERS
                </Typography>
              </Box>
              <Typography
                variant="h1"
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  lineHeight: 1.1,
                  mb: 3,
                }}
              >
                Join the Fight for
                <Box component="span" sx={{ color: '#FFAB00', display: 'block' }}>
                  Economic Freedom
                </Box>
              </Typography>
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{
                  mb: 4,
                  fontWeight: 400,
                  opacity: 0.95,
                  lineHeight: 1.4,
                }}
              >
                Be part of a revolutionary movement dedicated to radical economic transformation,
                land redistribution, and true democratic governance.
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/apply')}
                  sx={{
                    backgroundColor: '#FFAB00',
                    color: '#000000',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    boxShadow: '0px 4px 20px rgba(255, 171, 0, 0.4)',
                    '&:hover': {
                      backgroundColor: '#FF8F00',
                      transform: 'translateY(-2px)',
                      boxShadow: '0px 6px 25px rgba(255, 171, 0, 0.5)',
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  Join the Movement
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/application-status')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    fontWeight: 500,
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    borderWidth: '2px',
                    '&:hover': {
                      borderColor: '#FFAB00',
                      backgroundColor: 'rgba(255, 171, 0, 0.1)',
                      borderWidth: '2px',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  Check Application Status
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<CreditCard />}
                  onClick={() => navigate('/my-card')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    fontWeight: 500,
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    borderWidth: '2px',
                    '&:hover': {
                      borderColor: '#FFAB00',
                      backgroundColor: 'rgba(255, 171, 0, 0.1)',
                      borderWidth: '2px',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  My Digital Card
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <Paper
                  elevation={12}
                  sx={{
                    p: 5,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    color: 'text.primary',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 171, 0, 0.2)',
                    boxShadow: '0px 8px 40px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{
                      color: '#FE0000',
                      fontWeight: 600,
                      mb: 3,
                      textAlign: 'center',
                    }}
                  >
                    Our Growing Movement
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography
                          variant="h3"
                          sx={{
                            color: '#FE0000',
                            fontWeight: 700,
                            mb: 1,
                          }}
                        >
                          15,000+
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: 'text.secondary',
                          }}
                        >
                          Active Fighters
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography
                          variant="h3"
                          sx={{
                            color: '#055305',
                            fontWeight: 700,
                            mb: 1,
                          }}
                        >
                          200+
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: 'text.secondary',
                          }}
                        >
                          Leadership Positions
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography
                          variant="h3"
                          sx={{
                            color: '#FFAB00',
                            fontWeight: 700,
                            mb: 1,
                          }}
                        >
                          500+
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: 'text.secondary',
                          }}
                        >
                          Monthly Meetings
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography
                          variant="h3"
                          sx={{
                            color: '#FE0000',
                            fontWeight: 700,
                            mb: 1,
                          }}
                        >
                          9
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: 'text.secondary',
                          }}
                        >
                          Provinces
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box textAlign="center" sx={{ mb: 8 }}>
          <Typography
            variant="overline"
            sx={{
              color: '#FE0000',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.1em',
              mb: 2,
              display: 'block',
            }}
          >
            OUR REVOLUTIONARY PLATFORM
          </Typography>
          <Typography
            variant="h2"
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              mb: 3,
            }}
          >
            Tools for the Struggle
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              maxWidth: '600px',
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Our digital platform empowers fighters with the tools needed for
            democratic participation, mass mobilization, and revolutionary change
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 4,
                  border: `2px solid ${feature.color}20`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: `0px 12px 40px ${feature.color}30`,
                    borderColor: `${feature.color}60`,
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: `linear-gradient(90deg, ${feature.color} 0%, ${feature.color}80 100%)`,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${feature.color}15 0%, ${feature.color}25 100%)`,
                      border: `2px solid ${feature.color}30`,
                      mx: 'auto',
                      mb: 3,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {React.cloneElement(feature.icon, {
                      sx: {
                        fontSize: 36,
                        color: feature.color,
                      }
                    })}
                  </Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      mb: 2,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.6,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Benefits Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #055305 0%, #033303 100%)',
          color: 'white',
          py: 10,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M20 20c0 11.046-8.954 20-20 20v-40c11.046 0 20 8.954 20 20z"/%3E%3C/g%3E%3C/svg%3E")',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: '#FFAB00',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    letterSpacing: '0.1em'
                  }}
                >
                  JOIN THE REVOLUTION
                </Typography>
              </Box>
              <Typography
                variant="h2"
                component="h2"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  mb: 4,
                  lineHeight: 1.2,
                }}
              >
                Why Fight with the EFF?
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  mb: 5,
                  opacity: 0.95,
                  lineHeight: 1.6,
                  fontWeight: 400,
                }}
              >
                Join a revolutionary movement that puts the people first, fights for economic justice,
                and works tirelessly to transform South Africa into a truly democratic society.
              </Typography>
              <List sx={{ '& .MuiListItem-root': { py: 1 } }}>
                {benefits.map((benefit, index) => (
                  <ListItem key={index} sx={{ px: 0, alignItems: 'flex-start' }}>
                    <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                      <CheckCircle
                        sx={{
                          color: '#FFAB00',
                          fontSize: 24,
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={benefit}
                      primaryTypographyProps={{
                        sx: {
                          color: 'white',
                          fontWeight: 500,
                          fontSize: '1rem',
                          lineHeight: 1.5,
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card
                elevation={12}
                sx={{
                  background: 'linear-gradient(135deg, #FE0000 0%, #E20202 100%)',
                  color: 'white',
                  border: '2px solid #FFAB00',
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100px',
                    height: '100px',
                    background: 'radial-gradient(circle, #FFAB00 0%, transparent 70%)',
                    opacity: 0.3,
                  },
                }}
              >
                <CardContent sx={{ p: 5, position: 'relative', zIndex: 1 }}>
                  <Typography
                    variant="h4"
                    gutterBottom
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                    }}
                  >
                    Ready to Join the Fight?
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 4,
                      opacity: 0.95,
                      lineHeight: 1.5,
                      fontWeight: 400,
                    }}
                  >
                    Take your place in the struggle for economic freedom.
                    Join thousands of fighters working to transform South Africa.
                  </Typography>
                  <CardActions sx={{ px: 0 }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<Assignment />}
                      onClick={() => navigate('/apply')}
                      fullWidth
                      sx={{
                        backgroundColor: '#FFAB00',
                        color: '#000000',
                        fontWeight: 600,
                        py: 2,
                        fontSize: '1.1rem',
                        textTransform: 'none',
                        borderRadius: 3,
                        boxShadow: '0px 4px 20px rgba(255, 171, 0, 0.4)',
                        '&:hover': {
                          backgroundColor: '#FF8F00',
                          transform: 'translateY(-2px)',
                          boxShadow: '0px 6px 25px rgba(255, 171, 0, 0.5)',
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      Join the Movement Now
                    </Button>
                  </CardActions>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
