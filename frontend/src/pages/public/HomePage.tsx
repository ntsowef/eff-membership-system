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
  ArrowForward,
} from '@mui/icons-material';
import PublicHeader from '../../components/layout/PublicHeader';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <People />,
      title: 'Revolutionary Membership',
      description: 'Join a movement of fighters committed to radical economic transformation and social justice',
      color: '#DC143C',
    },
    {
      icon: <SupervisorAccount />,
      title: 'Democratic Leadership',
      description: 'Transparent leadership structures from branch to national level, elected by the people',
      color: '#8B0000',
    },
    {
      icon: <HowToVote />,
      title: 'People\'s Elections',
      description: 'Fair and transparent elections ensuring every fighter\'s voice is heard in our democracy',
      color: '#DC143C',
    },
    {
      icon: <Event />,
      title: 'Mass Mobilization',
      description: 'Coordinate meetings, rallies, and actions to advance the struggle for economic freedom',
      color: '#8B0000',
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
      {/* Sticky Header */}
      <PublicHeader />

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #8B0000 100%)',
          color: 'white',
          py: 7,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(220, 20, 60, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 0, 0, 0.15) 0%, transparent 50%)',
            pointerEvents: 'none'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            pointerEvents: 'none'
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h1"
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '2.5rem', md: '3.75rem' },
                  lineHeight: 1.1,
                  mb: 3,
                  textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  animation: 'fadeInUp 0.8s ease-out 0.2s both',
                  '@keyframes fadeInUp': {
                    '0%': { opacity: 0, transform: 'translateY(20px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' }
                  }
                }}
              >
                Join the Fight for
                <Box component="span" sx={{ color: '#DC143C', display: 'block' }}>
                  Economic Freedom
                </Box>
              </Typography>
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{
                  mb: 5,
                  fontWeight: 400,
                  opacity: 0.95,
                  lineHeight: 1.5,
                  color: 'rgba(255, 255, 255, 0.9)',
                  animation: 'fadeInUp 0.8s ease-out 0.4s both',
                  '@keyframes fadeInUp': {
                    '0%': { opacity: 0, transform: 'translateY(20px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' }
                  }
                }}
              >
                Be part of a revolutionary movement dedicated to radical economic transformation,
                land redistribution, and true democratic governance.
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2.5,
                  flexWrap: 'wrap',
                  mt: 2,
                  animation: 'fadeInUp 0.8s ease-out 0.6s both',
                  '@keyframes fadeInUp': {
                    '0%': { opacity: 0, transform: 'translateY(20px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' }
                  }
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/apply')}
                  sx={{
                    background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                    color: 'white',
                    fontWeight: 700,
                    px: 4,
                    py: 1.8,
                    borderRadius: 3,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    boxShadow: '0 6px 20px rgba(220, 20, 60, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 8px 28px rgba(220, 20, 60, 0.5)',
                    },
                  }}
                >
                  Join the Movement
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/application-status')}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    color: 'white',
                    fontWeight: 600,
                    px: 4,
                    py: 1.8,
                    borderRadius: 3,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    borderWidth: '2px',
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#DC143C',
                      backgroundColor: 'rgba(220, 20, 60, 0.15)',
                      borderWidth: '2px',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 6px 20px rgba(220, 20, 60, 0.3)',
                    },
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
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    color: 'white',
                    fontWeight: 600,
                    px: 4,
                    py: 1.8,
                    borderRadius: 3,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    borderWidth: '2px',
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#DC143C',
                      backgroundColor: 'rgba(220, 20, 60, 0.15)',
                      borderWidth: '2px',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 6px 20px rgba(220, 20, 60, 0.3)',
                    },
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
                  animation: 'fadeInRight 0.8s ease-out 0.4s both',
                  '@keyframes fadeInRight': {
                    '0%': { opacity: 0, transform: 'translateX(30px)' },
                    '100%': { opacity: 1, transform: 'translateX(0)' }
                  }
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 5,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    color: 'text.primary',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(220, 20, 60, 0.2)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 100px rgba(220, 20, 60, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 24px 70px rgba(0, 0, 0, 0.4), 0 0 120px rgba(220, 20, 60, 0.15)',
                    }
                  }}
                >
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{
                      color: '#DC143C',
                      fontWeight: 700,
                      mb: 4,
                      textAlign: 'center',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Our Growing Movement
                  </Typography>
                  <Grid container spacing={4}>
                    <Grid item xs={6}>
                      <Box
                        textAlign="center"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.05) 0%, rgba(220, 20, 60, 0.1) 100%)',
                          border: '1px solid rgba(220, 20, 60, 0.1)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 8px 24px rgba(220, 20, 60, 0.15)',
                          }
                        }}
                      >
                        <Typography
                          variant="h3"
                          sx={{
                            color: '#DC143C',
                            fontWeight: 700,
                            mb: 1,
                          }}
                        >
                          15,000+
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'text.secondary',
                          }}
                        >
                          Active Fighters
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box
                        textAlign="center"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.05) 0%, rgba(139, 0, 0, 0.1) 100%)',
                          border: '1px solid rgba(139, 0, 0, 0.1)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 8px 24px rgba(139, 0, 0, 0.15)',
                          }
                        }}
                      >
                        <Typography
                          variant="h3"
                          sx={{
                            color: '#8B0000',
                            fontWeight: 700,
                            mb: 1,
                          }}
                        >
                          200+
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'text.secondary',
                          }}
                        >
                          Leadership Positions
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box
                        textAlign="center"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.05) 0%, rgba(220, 20, 60, 0.1) 100%)',
                          border: '1px solid rgba(220, 20, 60, 0.1)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 8px 24px rgba(220, 20, 60, 0.15)',
                          }
                        }}
                      >
                        <Typography
                          variant="h3"
                          sx={{
                            color: '#DC143C',
                            fontWeight: 700,
                            mb: 1,
                          }}
                        >
                          500+
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'text.secondary',
                          }}
                        >
                          Monthly Meetings
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box
                        textAlign="center"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.05) 0%, rgba(139, 0, 0, 0.1) 100%)',
                          border: '1px solid rgba(139, 0, 0, 0.1)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 8px 24px rgba(139, 0, 0, 0.15)',
                          }
                        }}
                      >
                        <Typography
                          variant="h3"
                          sx={{
                            color: '#8B0000',
                            fontWeight: 700,
                            mb: 1,
                          }}
                        >
                          9
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
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
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Box textAlign="center" sx={{ mb: 10 }}>
          <Typography
            variant="overline"
            sx={{
              color: '#DC143C',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '0.15em',
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
              fontSize: { xs: '2rem', md: '2.75rem' },
            }}
          >
            Tools for the Struggle
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              maxWidth: '700px',
              mx: 'auto',
              lineHeight: 1.7,
              fontSize: '1.1rem',
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
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 1) 100%)',
                  backdropFilter: 'blur(10px)',
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                  '@keyframes fadeInUp': {
                    '0%': { opacity: 0, transform: 'translateY(30px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' }
                  },
                  '&:hover': {
                    transform: 'translateY(-12px)',
                    boxShadow: `0 16px 48px ${feature.color}40`,
                    borderColor: `${feature.color}80`,
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '5px',
                    background: `linear-gradient(90deg, ${feature.color} 0%, ${feature.color}90 100%)`,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: 90,
                      height: 90,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${feature.color}10 0%, ${feature.color}20 100%)`,
                      border: `3px solid ${feature.color}25`,
                      mx: 'auto',
                      mb: 3,
                      transition: 'all 0.4s ease',
                      boxShadow: `0 4px 16px ${feature.color}20`,
                      '&:hover': {
                        transform: 'scale(1.1) rotate(5deg)',
                        boxShadow: `0 8px 24px ${feature.color}35`,
                      }
                    }}
                  >
                    {React.cloneElement(feature.icon, {
                      sx: {
                        fontSize: 42,
                        color: feature.color,
                      }
                    })}
                  </Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary',
                      mb: 2,
                      fontSize: '1.15rem',
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.7,
                      fontSize: '0.95rem',
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
          background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 50%, #8B0000 100%)',
          color: 'white',
          py: 12,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 30% 50%, rgba(220, 20, 60, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(139, 0, 0, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Cpath d="M20 20c0 11.046-8.954 20-20 20v-40c11.046 0 20 8.954 20 20z"/%3E%3C/g%3E%3C/svg%3E")',
            pointerEvents: 'none'
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: '#DC143C',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    letterSpacing: '0.15em',
                    textShadow: '0 2px 8px rgba(220, 20, 60, 0.3)'
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
                  fontSize: { xs: '2rem', md: '2.75rem' },
                  textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
              >
                Why Fight with the EFF?
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  mb: 5,
                  opacity: 0.95,
                  lineHeight: 1.7,
                  fontWeight: 400,
                  fontSize: '1.1rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                Join a revolutionary movement that puts the people first, fights for economic justice,
                and works tirelessly to transform South Africa into a truly democratic society.
              </Typography>
              <List sx={{ '& .MuiListItem-root': { py: 1.5 } }}>
                {benefits.map((benefit, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      px: 0,
                      alignItems: 'flex-start',
                      animation: `fadeInLeft 0.6s ease-out ${index * 0.1}s both`,
                      '@keyframes fadeInLeft': {
                        '0%': { opacity: 0, transform: 'translateX(-20px)' },
                        '100%': { opacity: 1, transform: 'translateX(0)' }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                      <CheckCircle
                        sx={{
                          color: '#DC143C',
                          fontSize: 26,
                          filter: 'drop-shadow(0 2px 4px rgba(220, 20, 60, 0.3))',
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={benefit}
                      primaryTypographyProps={{
                        sx: {
                          color: 'rgba(255, 255, 255, 0.95)',
                          fontWeight: 500,
                          fontSize: '1.05rem',
                          lineHeight: 1.6,
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                  color: 'white',
                  border: '2px solid rgba(220, 20, 60, 0.3)',
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(220, 20, 60, 0.3)',
                  transition: 'all 0.4s ease',
                  animation: 'fadeInRight 0.8s ease-out 0.4s both',
                  '@keyframes fadeInRight': {
                    '0%': { opacity: 0, transform: 'translateX(30px)' },
                    '100%': { opacity: 1, transform: 'translateX(0)' }
                  },
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 24px 70px rgba(220, 20, 60, 0.4)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
                    opacity: 0.5,
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -30,
                    left: -30,
                    width: '150px',
                    height: '150px',
                    background: 'radial-gradient(circle, rgba(139, 0, 0, 0.3) 0%, transparent 70%)',
                  },
                }}
              >
                <CardContent sx={{ p: 6, position: 'relative', zIndex: 1 }}>
                  <Typography
                    variant="h4"
                    gutterBottom
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                      fontSize: { xs: '1.75rem', md: '2rem' },
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    Ready to Join the Fight?
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 5,
                      opacity: 0.95,
                      lineHeight: 1.6,
                      fontWeight: 400,
                      fontSize: '1.1rem',
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
                      endIcon={<ArrowForward />}
                      onClick={() => navigate('/apply')}
                      fullWidth
                      sx={{
                        backgroundColor: 'white',
                        color: '#DC143C',
                        fontWeight: 700,
                        py: 2.5,
                        fontSize: '1.15rem',
                        textTransform: 'none',
                        borderRadius: 3,
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                          transform: 'translateY(-3px)',
                          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.3)',
                        },
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
