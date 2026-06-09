import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Grid,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import { Close, TrendingUp, TrendingDown, Remove } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useSecureApi } from '../../hooks/useSecureApi';
import type { LeaderboardEntry } from './AdminPerformanceLeaderboard';

type PeriodType = 'hourly' | 'daily' | 'weekly' | 'monthly';

interface AdminPerformanceModalProps {
  open: boolean;
  onClose: () => void;
  admin: LeaderboardEntry | null;
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  hourly: 'Today (Hourly)',
  daily: 'Last 7 Days',
  weekly: 'Last 4 Weeks',
  monthly: 'Last 6 Months',
};

const AdminPerformanceModal: React.FC<AdminPerformanceModalProps> = ({ open, onClose, admin }) => {
  const theme = useTheme();
  const { secureGet } = useSecureApi();
  const [period, setPeriod] = useState<PeriodType>('daily');

  const { data: perfData, isLoading, error } = useQuery({
    queryKey: ['admin-performance-detail', admin?.user_id, period],
    queryFn: () => secureGet(`/admin-performance/admin/${admin!.user_id}`, { period }),
    enabled: open && !!admin,
    staleTime: 2 * 60 * 1000,
  });

  if (!admin) return null;

  const rank = perfData?.rank;
  const summary = perfData?.summary;
  const timeSeries: any[] = perfData?.time_series || [];

  const getMovementIcon = () => {
    if (!rank || rank.movement === 0) return <Remove sx={{ color: 'grey.500', fontSize: 20 }} />;
    if (rank.movement > 0) return <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />;
    return <TrendingDown sx={{ color: 'error.main', fontSize: 20 }} />;
  };

  const getMovementText = () => {
    if (!rank || rank.movement === 0) return 'No change';
    if (rank.movement > 0) return `▲ Up ${rank.movement} position${rank.movement > 1 ? 's' : ''}`;
    return `▼ Down ${Math.abs(rank.movement)} position${Math.abs(rank.movement) > 1 ? 's' : ''}`;
  };

  const getMovementColor = () => {
    if (!rank || rank.movement === 0) return 'text.secondary';
    return rank.movement > 0 ? 'success.main' : 'error.main';
  };

  const formatXAxis = (val: string) => {
    const d = new Date(val);
    if (period === 'hourly') return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    if (period === 'daily') return `${d.getMonth() + 1}/${d.getDate()}`;
    if (period === 'weekly') return `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('default', { month: 'short' })}`;
    return d.toLocaleString('default', { month: 'short', year: '2-digit' });
  };

  const summaryCards = [
    { label: 'Registrations', value: summary?.registrations ?? 0, color: theme.palette.primary.main },
    { label: 'Renewals', value: summary?.renewals ?? 0, color: theme.palette.success.main },
    { label: 'Logins', value: summary?.logins ?? 0, color: theme.palette.info.main },
    { label: 'Actions', value: summary?.total_actions ?? 0, color: theme.palette.warning.main },
    { label: 'Score', value: summary?.score ?? 0, color: theme.palette.secondary.main },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" component="span">{admin.full_name}</Typography>
          <Typography variant="body2" color="text.secondary">{admin.email}</Typography>
          <Chip label={admin.province_name || admin.province_code || 'N/A'} size="small" sx={{ mt: 0.5 }} />
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* Rank Position */}
        {rank && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
            <Box sx={{ textAlign: 'center', minWidth: 80 }}>
              <Typography variant="h4" fontWeight="bold" color="primary.main">#{rank.current}</Typography>
              <Typography variant="caption" color="text.secondary">of {rank.total_admins}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getMovementIcon()}
                <Typography variant="body2" color={getMovementColor()} fontWeight="bold">{getMovementText()}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Previous rank: #{rank.previous || '—'} • {PERIOD_LABELS[period]}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Period Tabs */}
        <Tabs value={period} onChange={(_, v) => setPeriod(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Hourly" value="hourly" />
          <Tab label="Daily" value="daily" />
          <Tab label="Weekly" value="weekly" />
          <Tab label="Monthly" value="monthly" />
        </Tabs>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>Failed to load performance data.</Alert>
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              {summaryCards.map((card) => (
                <Grid item xs={6} sm={2.4} key={card.label}>
                  <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: card.color }}>{Number(card.value).toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Performance Trend Chart */}
            {timeSeries.length > 0 ? (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Performance Trend — {PERIOD_LABELS[period]}
                  </Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis dataKey="period_start" tickFormatter={formatXAxis} fontSize={11} />
                      <YAxis fontSize={11} />
                      <RechartsTooltip
                        labelFormatter={(label) => {
                          const d = new Date(label as string);
                          if (period === 'hourly') return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                          return d.toLocaleDateString();
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="registrations" stroke={theme.palette.primary.main} strokeWidth={2} name="Registrations" dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="renewals" stroke={theme.palette.success.main} strokeWidth={2} name="Renewals" dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="score" stroke={theme.palette.secondary.main} strokeWidth={2} name="Score" dot={false} activeDot={{ r: 4 }} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>No activity data for this period.</Alert>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminPerformanceModal;

