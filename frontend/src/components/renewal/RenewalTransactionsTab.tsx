import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Stack,
} from '@mui/material';
import {
  Search,
  Refresh,
  Receipt,
  Visibility,
  Download,
  FilterList,
  AttachFile,
  Clear,
  OpenInNew,
  CreditCard,
  AccountBalance,
  Payments,
  PhoneAndroid,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface RenewalTransaction {
  payment_id: number;
  member_id: number;
  first_name: string;
  last_name: string;
  id_number: string;
  membership_number: string | null;
  email: string | null;
  phone_number: string | null;
  province_name: string;
  renewal_date: string;
  status: string;
  payment_method: string;
  amount: number | string;
  payment_reference: string;
  verification_notes: string | null;
  document_id: number | null;
  proof_of_payment_filename: string | null;
}

interface TransactionsResponse {
  transactions: RenewalTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

const RenewalTransactionsTab: React.FC = () => {
  const [page, setPage] = useState(0); // 0-indexed for MUI TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [status, setStatus] = useState('all');

  // Preview dialog state
  const [selectedDoc, setSelectedDoc] = useState<{ id: number; filename: string } | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<TransactionsResponse>({
    queryKey: ['renewal-transactions', page + 1, rowsPerPage, debouncedSearch, paymentMethod, status],
    queryFn: async () => {
      const params: Record<string, any> = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (paymentMethod !== 'all') params.payment_method = paymentMethod;
      if (status !== 'all') params.status = status;

      const res = await api.get('/membership-renewal/transactions', { params });
      return res.data?.data;
    },
    staleTime: 30 * 1000,
  });

  const transactions = data?.transactions || [];
  const totalCount = data?.pagination?.total || 0;

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setPaymentMethod('all');
    setStatus('all');
    setPage(0);
  };

  const getStatusChip = (s: string) => {
    const norm = (s || '').toLowerCase();
    let color: 'success' | 'warning' | 'error' | 'default' = 'default';
    if (norm === 'completed') color = 'success';
    else if (norm === 'pending') color = 'warning';
    else if (norm === 'failed') color = 'error';

    return <Chip label={s || 'Unknown'} color={color} size="small" variant="filled" />;
  };

  const getMethodBadge = (m: string) => {
    const norm = (m || '').toLowerCase();
    let icon = <Payments fontSize="small" sx={{ mr: 0.5 }} />;
    let label = m;

    if (norm.includes('card') || norm.includes('online')) {
      icon = <CreditCard fontSize="small" sx={{ mr: 0.5, color: '#1976d2' }} />;
      label = 'Card / Online';
    } else if (norm.includes('bank') || norm.includes('transfer')) {
      icon = <AccountBalance fontSize="small" sx={{ mr: 0.5, color: '#0288d1' }} />;
      label = 'Bank Transfer';
    } else if (norm.includes('eft')) {
      icon = <PhoneAndroid fontSize="small" sx={{ mr: 0.5, color: '#ed6c02' }} />;
      label = 'EFT';
    } else if (norm.includes('cash')) {
      icon = <Payments fontSize="small" sx={{ mr: 0.5, color: '#2e7d32' }} />;
      label = 'Cash';
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {icon}
        <Typography variant="body2">{label}</Typography>
      </Box>
    );
  };

  const formatCurrency = (val: number | string) => {
    const n = typeof val === 'number' ? val : parseFloat(val || '0');
    return isNaN(n) ? 'R0.00' : `R${n.toFixed(2)}`;
  };

  const getDocViewUrl = (docId: number) => {
    const baseURL = api.defaults.baseURL || 'http://localhost:5000/api/v1';
    return `${baseURL}/membership-renewal/documents/${docId}/view`;
  };

  const getDocDownloadUrl = (docId: number) => {
    const baseURL = api.defaults.baseURL || 'http://localhost:5000/api/v1';
    return `${baseURL}/membership-renewal/documents/${docId}/download`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Filters & Actions Bar */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }} elevation={1}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <TextField
            placeholder="Search member name, ID number, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: { xs: '100%', md: 360 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="payment-method-filter-label">Payment Method</InputLabel>
              <Select
                labelId="payment-method-filter-label"
                value={paymentMethod}
                label="Payment Method"
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Methods</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Card">Card</MenuItem>
                <MenuItem value="EFT">EFT</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={status}
                label="Status"
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Failed">Failed</MenuItem>
              </Select>
            </FormControl>

            {(searchTerm || paymentMethod !== 'all' || status !== 'all') && (
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<FilterList />}
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            )}

            <Tooltip title="Refresh transactions">
              <IconButton onClick={() => refetch()} size="small" color="primary" disabled={isFetching}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Main Table Card */}
      <Card sx={{ borderRadius: 2 }} elevation={1}>
        <CardContent sx={{ p: 0 }}>
          {isError && (
            <Alert severity="error" sx={{ m: 2 }}>
              Failed to load transactions: {(error as any)?.message || 'Unknown error'}
            </Alert>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
              <CircularProgress size={48} />
              <Typography color="text.secondary">Loading renewal transactions...</Typography>
            </Box>
          ) : transactions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
              <Receipt sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                No renewal transactions found
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                {debouncedSearch || paymentMethod !== 'all' || status !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Renewals and payments processed will appear here.'}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="medium">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell><strong>Date & Time</strong></TableCell>
                      <TableCell><strong>Member Details</strong></TableCell>
                      <TableCell><strong>Reference</strong></TableCell>
                      <TableCell><strong>Method</strong></TableCell>
                      <TableCell align="right"><strong>Amount</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                      <TableCell align="center"><strong>Proof of Payment</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.payment_id} hover>
                        {/* Date */}
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {new Date(tx.renewal_date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(tx.renewal_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>

                        {/* Member */}
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {tx.first_name} {tx.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            ID: {tx.id_number || 'N/A'}
                            {tx.membership_number ? ` • Mem#: ${tx.membership_number}` : ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tx.province_name} {tx.phone_number ? `• ${tx.phone_number}` : ''}
                          </Typography>
                        </TableCell>

                        {/* Reference */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                            {tx.payment_reference || '-'}
                          </Typography>
                          {tx.verification_notes && (
                            <Tooltip title={tx.verification_notes}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  maxWidth: 220,
                                }}
                              >
                                {tx.verification_notes}
                              </Typography>
                            </Tooltip>
                          )}
                        </TableCell>

                        {/* Method */}
                        <TableCell>{getMethodBadge(tx.payment_method)}</TableCell>

                        {/* Amount */}
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {formatCurrency(tx.amount)}
                          </Typography>
                        </TableCell>

                        {/* Status */}
                        <TableCell align="center">{getStatusChip(tx.status)}</TableCell>

                        {/* Proof of Payment Document */}
                        <TableCell align="center">
                          {tx.document_id ? (
                            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<Visibility fontSize="small" />}
                                onClick={() =>
                                  setSelectedDoc({
                                    id: tx.document_id!,
                                    filename: tx.proof_of_payment_filename || `Document #${tx.document_id}`,
                                  })
                                }
                                sx={{ textTransform: 'none', py: 0.2 }}
                              >
                                View
                              </Button>
                              <Tooltip title="Download file">
                                <IconButton
                                  size="small"
                                  color="default"
                                  component="a"
                                  href={getDocDownloadUrl(tx.document_id)}
                                  download
                                >
                                  <Download fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              None
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[10, 15, 25, 50]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Proof of Payment Preview Dialog */}
      <Dialog
        open={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachFile color="primary" />
            <Typography variant="h6">{selectedDoc?.filename || 'Proof of Payment'}</Typography>
          </Box>
          <IconButton onClick={() => setSelectedDoc(null)} size="small">
            <Clear />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 1, minHeight: 400, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f5f5f5' }}>
          {selectedDoc && (
            selectedDoc.filename.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={getDocViewUrl(selectedDoc.id)}
                title="Proof of Payment PDF"
                width="100%"
                height="500px"
                style={{ border: 'none', borderRadius: 4 }}
              />
            ) : (
              <Box
                component="img"
                src={getDocViewUrl(selectedDoc.id)}
                alt="Proof of Payment"
                sx={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  objectFit: 'contain',
                  borderRadius: 1,
                  boxShadow: 1,
                }}
              />
            )
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {selectedDoc && (
            <Button
              startIcon={<OpenInNew />}
              component="a"
              href={getDocViewUrl(selectedDoc.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in New Tab
            </Button>
          )}
          {selectedDoc && (
            <Button
              startIcon={<Download />}
              variant="contained"
              component="a"
              href={getDocDownloadUrl(selectedDoc.id)}
              download
            >
              Download
            </Button>
          )}
          <Button onClick={() => setSelectedDoc(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RenewalTransactionsTab;
