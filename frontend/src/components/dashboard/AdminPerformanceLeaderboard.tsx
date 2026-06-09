import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  EmojiEvents,
  WorkspacePremium,
  Star,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSecureApi } from '../../hooks/useSecureApi';
import AdminPerformanceModal from './AdminPerformanceModal';

export interface LeaderboardEntry {
  user_id: number;
  full_name: string;
  email: string;
  province_code: string;
  province_name: string;
  new_registrations_count: number;
  registrations_approved: number;
  renewals_processed: number;
  renewals_completed: number;
  renewal_revenue: number;
  total_members_managed: number;
  active_members_count: number;
  expired_members_count: number;
  total_actions_count: number;
  login_count: number;
  score: number;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <EmojiEvents sx={{ color: '#FFD700', fontSize: 28 }} />;
  if (rank === 2) return <WorkspacePremium sx={{ color: '#C0C0C0', fontSize: 26 }} />;
  if (rank === 3) return <Star sx={{ color: '#CD7F32', fontSize: 24 }} />;
  return null;
};

const getRankColor = (rank: number): string => {
  if (rank === 1) return '#FFF8E1';
  if (rank === 2) return '#F5F5F5';
  if (rank === 3) return '#FBE9E7';
  return 'transparent';
};

const AdminPerformanceLeaderboard: React.FC = () => {
  const theme = useTheme();
  const { secureGet } = useSecureApi();

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState<string>(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState<string>(today);
  const [sortBy, setSortBy] = useState<string>('score');
  const [selectedAdmin, setSelectedAdmin] = useState<LeaderboardEntry | null>(null);

  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ['admin-leaderboard', dateFrom, dateTo, sortBy],
    queryFn: () =>
      secureGet('/admin-performance/leaderboard', {
        date_from: dateFrom,
        date_to: dateTo,
        sort_by: sortBy,
        sort_order: 'desc',
        limit: 20,
      }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const leaderboard: LeaderboardEntry[] = Array.isArray(leaderboardData) ? leaderboardData : (leaderboardData as any)?.data || [];

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load admin performance leaderboard.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          type="date"
          label="From"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort By</InputLabel>
          <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
            <MenuItem value="score">Overall Score</MenuItem>
            <MenuItem value="total_actions_count">Total Actions</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : leaderboard.length === 0 ? (
        <Alert severity="info">
          No provincial admin performance data available for the selected period.
        </Alert>
      ) : (
        <TableContainer component={Card} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: 60 }}>Rank</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Admin</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Province</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Registrations</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Renewals</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Logins</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Actions</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                return (
                  <TableRow
                    key={entry.user_id}
                    onClick={() => setSelectedAdmin(entry)}
                    sx={{ backgroundColor: getRankColor(rank), cursor: 'pointer', '&:hover': { backgroundColor: theme.palette.action.hover } }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getRankIcon(rank) || (
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: theme.palette.grey[400] }}>
                            {rank}
                          </Avatar>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={rank <= 3 ? 'bold' : 'normal'}>
                        {entry.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{entry.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={entry.province_name || entry.province_code || 'N/A'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">{Number(entry.registrations_approved || 0).toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">approved</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">{Number(entry.renewals_completed || 0).toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">completed</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{Number(entry.login_count || 0).toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{Number(entry.total_actions_count || 0).toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={Number(entry.score || 0).toLocaleString()}
                        size="small"
                        color={rank <= 3 ? 'primary' : 'default'}
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Admin Performance Detail Modal */}
      <AdminPerformanceModal
        open={!!selectedAdmin}
        onClose={() => setSelectedAdmin(null)}
        admin={selectedAdmin}
      />
    </Box>
  );
};

export default AdminPerformanceLeaderboard;

