import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from '@mui/material';
import {
  AccountBalanceWallet,
  ShoppingCart,
  TrendingDown,
  Warning,
  Add,
} from '@mui/icons-material';
import { api } from '../../../lib/api';

interface CreditBalance {
  credits_remaining: number;
  total_purchased: number;
  total_used: number;
  low_credit_threshold: number;
  last_alert_sent_at: string | null;
  updated_at: string;
}

interface CreditTransaction {
  id: number;
  transaction_type: 'purchase' | 'deduction' | 'adjustment';
  amount: number;
  balance_after: number;
  reference: string | null;
  notes: string | null;
  created_by: number | null;
  created_by_name?: string | null;
  created_at: string;
}

const SMSCreditManagement: React.FC = () => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [addAmount, setAddAmount] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.get('/sms/credits/balance');
      if (res.data.success) {
        setBalance(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch credit balance', err);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const params: any = { page: page + 1, limit: rowsPerPage };
      if (typeFilter) params.type = typeFilter;
      const res = await api.get('/sms/credits/transactions', { params });
      if (res.data.success) {
        setTransactions(res.data.data.transactions);
        setTotalTransactions(res.data.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    }
  }, [page, rowsPerPage, typeFilter]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchBalance(), fetchTransactions()]);
      setLoading(false);
    };
    load();
  }, [fetchBalance, fetchTransactions]);

  const handleAddCredits = async () => {
    const amount = parseInt(addAmount, 10);
    if (!amount || amount <= 0) return;

    setSubmitting(true);
    try {
      const res = await api.post('/sms/credits/add', { amount, notes: addNotes });
      if (res.data.success) {
        setSnackbar({ open: true, message: `${amount.toLocaleString()} credits added successfully`, severity: 'success' });
        setAddAmount('');
        setAddNotes('');
        await Promise.all([fetchBalance(), fetchTransactions()]);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.error?.message || 'Failed to add credits', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getBalanceColor = (remaining: number): string => {
    if (remaining < 100) return '#d32f2f';
    if (remaining < 1000) return '#ed6c02';
    return '#2e7d32';
  };

  const getTypeChip = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Chip label="Purchase" color="success" size="small" />;
      case 'deduction':
        return <Chip label="Deduction" color="warning" size="small" />;
      case 'adjustment':
        return <Chip label="Adjustment" color="info" size="small" />;
      default:
        return <Chip label={type} size="small" />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        SMS Credit Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Monitor credit balance, add credits, and view transaction history.
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccountBalanceWallet sx={{ fontSize: 40, color: getBalanceColor(balance?.credits_remaining ?? 0) }} />
              <Typography variant="h4" fontWeight={700} sx={{ color: getBalanceColor(balance?.credits_remaining ?? 0), mt: 1 }}>
                {(balance?.credits_remaining ?? 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">Credits Remaining</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ShoppingCart sx={{ fontSize: 40, color: '#1976d2' }} />
              <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                {(balance?.total_purchased ?? 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">Total Purchased</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingDown sx={{ fontSize: 40, color: '#ed6c02' }} />
              <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                {(balance?.total_used ?? 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">Total Used</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: '#9c27b0' }} />
              <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                {(balance?.low_credit_threshold ?? 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">Alert Threshold</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {(balance?.credits_remaining ?? 0) === 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          SMS sending is currently blocked — credit balance is zero. Add credits to resume sending.
        </Alert>
      )}
      {(balance?.credits_remaining ?? 0) > 0 && (balance?.credits_remaining ?? 0) <= (balance?.low_credit_threshold ?? 1000) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Credit balance is below the alert threshold. Consider purchasing more credits soon.
        </Alert>
      )}

      {/* Add Credits Form */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Add Credits
        </Typography>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={3}>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              inputProps={{ min: 1 }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Notes / Reference (e.g. Invoice #12345)"
              fullWidth
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<Add />}
              onClick={handleAddCredits}
              disabled={submitting || !addAmount || parseInt(addAmount, 10) <= 0}
            >
              {submitting ? 'Adding...' : 'Add Credits'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Transaction History */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Transaction History
          </Typography>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Type Filter</InputLabel>
            <Select
              value={typeFilter}
              label="Type Filter"
              onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="purchase">Purchase</MenuItem>
              <MenuItem value="deduction">Deduction</MenuItem>
              <MenuItem value="adjustment">Adjustment</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Balance After</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Added By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No transactions found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
                    <TableCell>{getTypeChip(tx.transaction_type)}</TableCell>
                    <TableCell align="right" sx={{ color: tx.transaction_type === 'deduction' ? '#d32f2f' : '#2e7d32', fontWeight: 600 }}>
                      {tx.transaction_type === 'deduction' ? '-' : '+'}{tx.amount.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">{tx.balance_after.toLocaleString()}</TableCell>
                    <TableCell>{tx.reference || tx.notes || '-'}</TableCell>
                    <TableCell>{tx.created_by_name || (tx.created_by ? `User #${tx.created_by}` : 'System')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalTransactions}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SMSCreditManagement;
