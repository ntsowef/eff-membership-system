import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Paper,
    Chip
} from '@mui/material';
import {
    Download as DownloadIcon,
    Search as SearchIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
import api from '../../../services/api';

const SMSReports = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [messages, setMessages] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        category: 'all',
        status: 'all',
        search: '',
    });

    const [duplicatesReport, setDuplicatesReport] = useState<any>(null);
    const [loadingDuplicates, setLoadingDuplicates] = useState(false);

    useEffect(() => {
        fetchSummary();
        fetchMessages();
    }, [page, rowsPerPage, filters.category, filters.status, filters.startDate, filters.endDate]);

    useEffect(() => {
        fetchDuplicates();
    }, [filters.search]);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            setError(null);
            const params: any = {
                page: page + 1,
                limit: rowsPerPage,
            };

            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.category !== 'all') params.category = filters.category;
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.search) params.search = filters.search;

            const response = await api.get('/sms/reports/messages', { params });
            if (response.data.success) {
                setMessages(response.data.data.messages || []);
                setTotalRecords(response.data.data.pagination?.totalCount || 0);
            }
        } catch (err: any) {
            console.error('Failed to fetch SMS messages report:', err);
            setError(err.response?.data?.error?.message || 'Failed to load messages report');
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const params: any = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.category !== 'all') params.category = filters.category;
            if (filters.status !== 'all') params.status = filters.status;

            const response = await api.get('/sms/reports/summary', { params });
            if (response.data.success) {
                setSummary(response.data.data.summary);
            }
        } catch (err: any) {
            console.error('Failed to fetch SMS report summary:', err);
        }
    };

    const fetchDuplicates = async () => {
        try {
            setLoadingDuplicates(true);
            const response = await api.get('/sms/reports/duplicates');
            if (response.data.success) {
                setDuplicatesReport(response.data.data);
            }
        } catch (err: any) {
            console.error('Failed to fetch duplicates report:', err);
        } finally {
            setLoadingDuplicates(false);
        }
    };

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(0); // Reset page on filter change
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(0);
        fetchMessages();
    };

    const handleExportCSV = async () => {
        try {
            const queryParams = new URLSearchParams();
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.category !== 'all') queryParams.append('category', filters.category);
            if (filters.status !== 'all') queryParams.append('status', filters.status);
            if (filters.search) queryParams.append('search', filters.search);

            // Fetch the authentication token from where it's stored (assuming localStorage or api interceptor)
            // For a simple GET download, we can't easily pass headers via window.open.
            // If the endpoint requires auth, it's better to use api.get with responseType: 'blob'.
            const response = await api.get('/sms/reports/export', {
                params: {
                    startDate: filters.startDate || undefined,
                    endDate: filters.endDate || undefined,
                    category: filters.category !== 'all' ? filters.category : undefined,
                    status: filters.status !== 'all' ? filters.status : undefined,
                    search: filters.search || undefined,
                },
                responseType: 'blob', // Important: tells axios to handle binary data
            });

            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'sms_report.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error('Failed to export CSV', err);
            alert('Failed to construct export file');
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">SMS Reports</Typography>
                <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportCSV}
                    disabled={loading || !messages || messages.length === 0}
                >
                    Export CSV
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Summary Cards */}
            {summary && (
                <Grid container spacing={3} mb={4}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Total Messages</Typography>
                                <Typography variant="h4">{(summary.total_sent || 0).toLocaleString()}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Delivered</Typography>
                                <Typography variant="h4" color="success.main">{(summary.total_delivered || 0).toLocaleString()}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {summary.total_sent > 0 ? Math.round((summary.total_delivered / summary.total_sent) * 100) : 0}% success rate
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Failed</Typography>
                                <Typography variant="h4" color="error.main">{(summary.total_failed || 0).toLocaleString()}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {summary.total_sent > 0 ? Math.round((summary.total_failed / summary.total_sent) * 100) : 0}% failure rate
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Est. Total Cost</Typography>
                                <Typography variant="h4">R{Number(summary.total_cost || 0).toFixed(2)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Duplicate Numbers Detection Card */}
            <Card sx={{ mb: 4, bgcolor: 'background.default' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Duplicate Number Detection</Typography>
                    {loadingDuplicates ? (
                        <CircularProgress size={24} />
                    ) : duplicatesReport ? (
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="textSecondary">Total Shared Numbers</Typography>
                                <Typography variant="h5">{duplicatesReport.stats?.uniqueDuplicateNumbers?.toLocaleString() || 0}</Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="textSecondary">Total Affected Members</Typography>
                                <Typography variant="h5">{duplicatesReport.stats?.totalAffectedMembers?.toLocaleString() || 0}</Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="textSecondary">Estimated Skipped Messages (Campaigns)</Typography>
                                <Typography variant="h5" color="primary">{duplicatesReport.stats?.estimatedMessagesSkipped?.toLocaleString() || 0}</Typography>
                            </Grid>
                        </Grid>
                    ) : (
                        <Typography variant="body2" color="textSecondary">Duplicate data unavailable.</Typography>
                    )}
                </CardContent>
            </Card>

            {/* Filters Box */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            fullWidth
                            label="Start Date"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            fullWidth
                            label="End Date"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={filters.category}
                                label="Category"
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                            >
                                <MenuItem value="all">All Categories</MenuItem>
                                <MenuItem value="Birthday">Birthday</MenuItem>
                                <MenuItem value="Voter Registration">Voter Registration</MenuItem>
                                <MenuItem value="Membership Renewal">Membership Renewal</MenuItem>
                                <MenuItem value="Campaign">Campaign</MenuItem>
                                <MenuItem value="Quick Send">Quick Send</MenuItem>
                                <MenuItem value="OTP">OTP</MenuItem>
                                <MenuItem value="System">System</MenuItem>
                                <MenuItem value="General">General</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filters.status}
                                label="Status"
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <MenuItem value="all">All Statuses</MenuItem>
                                <MenuItem value="sent">Sent (Pending)</MenuItem>
                                <MenuItem value="delivered">Delivered</MenuItem>
                                <MenuItem value="failed">Failed</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                            <TextField
                                fullWidth
                                label="Search Phone / Campaign"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                size="small"
                            />
                            <Button type="submit" variant="contained" color="primary" sx={{ minWidth: '40px', padding: '6px' }}>
                                <SearchIcon />
                            </Button>
                        </form>
                    </Grid>
                </Grid>
            </Paper>

            {/* Messages Table */}
            <TableContainer component={Paper}>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date/Time</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Campaign</TableCell>
                                <TableCell>Recipient</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Provider</TableCell>
                                <TableCell>Cost</TableCell>
                                <TableCell>Details</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {messages.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                        <Typography color="textSecondary">No messages found matching your criteria</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                messages.map((msg) => (
                                    <TableRow key={msg.id} hover>
                                        <TableCell>{new Date(msg.sent_at || msg.created_at).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={msg.category || 'General'}
                                                color={
                                                    msg.category === 'Birthday' ? 'secondary' :
                                                    msg.category === 'Campaign' ? 'primary' :
                                                    msg.category === 'Voter Registration' ? 'info' :
                                                    msg.category === 'OTP' ? 'warning' :
                                                    msg.category === 'Membership Renewal' ? 'success' : 'default'}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{msg.campaign_name || '-'}</TableCell>
                                        <TableCell>
                                            {msg.recipient_number}<br />
                                            <Typography variant="caption" color="textSecondary">{msg.recipient_name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={msg.delivery_status || msg.status || 'Pending'}
                                                color={
                                                    (msg.delivery_status || msg.status || '').toLowerCase() === 'delivered' ? 'success' :
                                                        (msg.delivery_status || msg.status || '').toLowerCase() === 'failed' ? 'error' : 'warning'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>{msg.provider_name || '-'}</TableCell>
                                        <TableCell>R{Number(msg.cost || 0).toFixed(4)}</TableCell>
                                        <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${msg.message_text || ''}\n${msg.error_message ? 'Error: ' + msg.error_message : ''}`}>
                                            <Typography variant="body2" noWrap>{msg.message_text || '-'}</Typography>
                                            {msg.error_message && (
                                                <Typography variant="caption" color="error" noWrap>
                                                    {msg.error_message}
                                                </Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={totalRecords}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </TableContainer>
        </Box>
    );
};

export default SMSReports;
