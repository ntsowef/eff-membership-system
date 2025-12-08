import React from 'react';
import { Grid, Card, CardContent, Typography, Box, LinearProgress, Chip } from '@mui/material';
import { CheckCircle, Cancel, HowToReg, TrendingUp } from '@mui/icons-material';
import type { MembershipAnalyticsData } from '../../types/membership';

interface MembershipAnalyticsCardsProps {
  data: MembershipAnalyticsData | null;
  isLoading: boolean;
}

const MembershipAnalyticsCards: React.FC<MembershipAnalyticsCardsProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card>
              <CardContent>
                <LinearProgress />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!data) {
    return null;
  }

  const { summary } = data;

  const analyticsCards = [
    {
      title: 'Good Standing',
      value: summary.good_standing_count.toLocaleString(),
      percentage: `${summary.good_standing_percentage}%`,
      subtitle: `${summary.good_standing_percentage}% of total members`,
      icon: CheckCircle,
      color: 'success.main',
      bgColor: 'success.light',
    },
    {
      title: 'Active Members',
      value: summary.active_count.toLocaleString(),
      percentage: `${summary.active_percentage}%`,
      subtitle: `${summary.active_percentage}% of total members`,
      icon: HowToReg,
      color: 'info.main',
      bgColor: 'info.light',
    },
    {
      title: 'Inactive Members',
      value: summary.inactive_count.toLocaleString(),
      percentage: `${summary.inactive_percentage}%`,
      subtitle: `${summary.inactive_percentage}% of total members`,
      icon: Cancel,
      color: 'warning.main',
      bgColor: 'warning.light',
    },
    {
      title: 'Total Members',
      value: summary.total_members.toLocaleString(),
      percentage: '100%',
      subtitle: 'All members in database',
      icon: TrendingUp,
      color: 'primary.main',
      bgColor: 'primary.light',
    },
  ];

  return (
    <Grid container spacing={3}>
      {analyticsCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: '50px', // Oval/pill shape
                      backgroundColor: card.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      width: 48,
                      height: 48,
                    }}
                  >
                    <Icon sx={{ color: card.color, fontSize: 28 }} />
                  </Box>
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {card.title}
                  </Typography>
                </Box>

                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {card.value}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={card.percentage}
                    size="small"
                    sx={{
                      backgroundColor: card.bgColor,
                      color: card.color,
                      fontWeight: 'bold',
                      borderRadius: '50px', // Pill shape for percentage chip
                    }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {card.subtitle}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default MembershipAnalyticsCards;

