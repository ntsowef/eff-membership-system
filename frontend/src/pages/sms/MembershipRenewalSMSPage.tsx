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
    Chip,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import {
    Message as MessageIcon,
    Refresh as RefreshIcon,
    Send as SendIcon,
    Error as ErrorIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import StatsCard from '../../components/ui/StatsCard';
import PageHeader from '../../components/ui/PageHeader';

interface EligibleMember {
    member_id: number;
    firstname: string;
    surname: string;
    full_name: string;
    cell_number: string;
    expiry_date: string;
    days_until_expiry?: number;
    days_expired?: number;
    category?: string;
    type: 'expiring' | 'expired';
}

interface RenewalSMSStats {
    totals: {
        expiring_30_days: number;
        expiring_14_days: number;
        expiring_7_days: number;
        expired_recently: number;
        expired_30_plus: number;
    };
    sent_today: number;
    failed_today: number;
}

interface BulkSendResult {
    total_targeted: number;
    sent: number;
    failed: number;
    skipped: number;
}

export type TargetGroup = 'expiring_30_days' | 'expiring_14_days' | 'expiring_7_days' | 'expired_recently' | 'expired_30_plus';

const targetGroupLabels: Record<TargetGroup, string> = {
    expiring_30_days: 'Expiring in 30 Days (Medium Priority)',
    expiring_14_days: 'Expiring in 14 Days (High Priority)',
    expiring_7_days: 'Expiring in 7 Days (Urgent Priority)',
    expired_recently: 'Recently Expired (1-30 Days)',
    expired_30_plus: 'Expired Over 30 Days Ago',
};

const MembershipRenewalSMSPage: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [stats, setStats] = useState<RenewalSMSStats | null>(null);
    const [members, setMembers] = useState<EligibleMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [targetGroup, setTargetGroup] = useState<TargetGroup>('expiring_30_days');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalMembers, setTotalMembers] = useState(0);

    // Bulk Send Dialog
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkResult, setBulkResult] = useState<BulkSendResult | null>(null);

    // Initial data fetch
    const fetchStats = async () => {
        try {
            const response = await api.get('/membership-renewal-sms/stats');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (err: any) {
            console.error('Failed to fetch stats', err);
        }
    };

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/membership-renewal-sms/eligible', {
                params: {
                    targetGroup,
                    page: page + 1,
                    limit: rowsPerPage
                }
            });
            if (response.data.success) {
                setMembers(response.data.members || []);
                setTotalMembers(response.data.total || 0);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch members data');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, targetGroup]);

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    // Send to single member
    const handleSendSingle = async (memberId: number) => {
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await api.post(`/membership-renewal-sms/send-single/${memberId}`, { targetGroup });
            if (response.data.success) {
                setSuccessMessage(response.data.message || 'SMS sent successfully');
                fetchStats();
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send SMS');
        } finally {
            setActionLoading(false);
            setTimeout(() => setSuccessMessage(null), 5000);
        }
    };

    // Bulk send
    const handleBulkSend = async () => {
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);
        setBulkResult(null);

        try {
            const response = await api.post('/membership-renewal-sms/send-bulk', { targetGroup });
            if (response.data.success) {
                setBulkResult(response.data);
                fetchStats();
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send bulk SMS messages');
            setBulkDialogOpen(false);
        } finally {
            setActionLoading(false);
        }
    };

    const handleTargetGroupChange = (event: any) => {
        setTargetGroup(event.target.value as TargetGroup);
        setPage(0); // Reset page on filter change
    };

    const formatPhone = (phone: string) => {
        if (!phone) return 'N/A';
        return phone;
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <PageHeader
                title="Membership Renewal SMS Campaigns"
                subtitle="Send automated renewal reminders to members expiring soon or already expired."
            />

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
                    {successMessage}
                </Alert>
            )}

            {/* Stats Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Medium Priority (30 Days)"
                        value={stats?.totals?.expiring_30_days || 0}
                        icon={ScheduleIcon}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Urgent (7 Days)"
                        value={stats?.totals?.expiring_7_days || 0}
                        icon={WarningIcon}
                        color="warning"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Over 30 Days Expired"
                        value={stats?.totals?.expired_30_plus || 0}
                        icon={ErrorIcon}
                        color="error"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%', bgcolor: '#f8f9fa' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Today's Activity</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                <Box>
                                    <Typography variant="h5" color="success.main">
                                        {stats?.sent_today || 0}
                                    </Typography>
                                    <Typography variant="body2">Sent</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h5" color="error.main">
                                        {stats?.failed_today || 0}
                                    </Typography>
                                    <Typography variant="body2">Failed</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Main Content Area */}
            <Paper sx={{ width: '100%', mb: 2 }}>
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" component="div">
                            Eligible Members
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 250 }}>
                            <InputLabel id="target-group-label">Target Group</InputLabel>
                            <Select
                                labelId="target-group-label"
                                value={targetGroup}
                                label="Target Group"
                                onChange={handleTargetGroupChange}
                            >
                                <MenuItem value="expiring_30_days">{targetGroupLabels['expiring_30_days']}</MenuItem>
                                <MenuItem value="expiring_14_days">{targetGroupLabels['expiring_14_days']}</MenuItem>
                                <MenuItem value="expiring_7_days">{targetGroupLabels['expiring_7_days']}</MenuItem>
                                <MenuItem value="expired_recently">{targetGroupLabels['expired_recently']}</MenuItem>
                                <MenuItem value="expired_30_plus">{targetGroupLabels['expired_30_plus']}</MenuItem>
                            </Select>
                        </FormControl>
                        <Chip
                            label={`Total matching: ${totalMembers}`}
                            color="primary"
                            variant="outlined"
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => { fetchStats(); fetchMembers(); }}
                            disabled={loading || actionLoading}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<MessageIcon />}
                            onClick={() => { setBulkResult(null); setBulkDialogOpen(true); }}
                            disabled={loading || actionLoading || members.length === 0}
                        >
                            Bulk Send SMS to Group
                        </Button>
                    </Box>
                </Box>

                <TableContainer>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Table size="medium">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Phone Number</TableCell>
                                    <TableCell>Expiry Date</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {members.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ p: 4 }}>
                                            <Typography variant="body1" color="textSecondary">
                                                No eligible members found in this group with valid phone numbers.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    members.map((member) => (
                                        <TableRow key={member.member_id} hover>
                                            <TableCell>
                                                <Typography variant="subtitle2">
                                                    {member.full_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{formatPhone(member.cell_number)}</TableCell>
                                            <TableCell>{new Date(member.expiry_date).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                {member.type === 'expiring' ? (
                                                    <Chip size="small" color="warning" label={`Expiring in ${member.days_until_expiry} days`} />
                                                ) : (
                                                    <Chip size="small" color="error" label={`Expired ${member.days_expired} days ago`} />
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<SendIcon />}
                                                    onClick={() => handleSendSingle(member.member_id)}
                                                    disabled={actionLoading}
                                                >
                                                    Send SMS
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={totalMembers}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </Paper>

            {/* Bulk Send Dialog */}
            <Dialog
                open={bulkDialogOpen}
                onClose={() => !actionLoading && setBulkDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {bulkResult ? "Campaign Results" : "Send Bulk SMS Reminders"}
                </DialogTitle>
                <DialogContent dividers>
                    {bulkResult ? (
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Alert severity={bulkResult.failed === 0 ? "success" : "warning"}>
                                    Bulk SMS operation completed. Check the details below.
                                </Alert>
                            </Grid>
                            <Grid item xs={6}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                                    <Typography variant="h4" color="primary">{bulkResult.total_targeted}</Typography>
                                    <Typography variant="body2">Targeted</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                                    <Typography variant="h4" color="success.main">{bulkResult.sent}</Typography>
                                    <Typography variant="body2">Sent Success</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                                    <Typography variant="h4" color="warning.main">{bulkResult.skipped}</Typography>
                                    <Typography variant="body2">Skipped (Duplicate Limit)</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
                                    <Typography variant="h4" color="error.main">{bulkResult.failed}</Typography>
                                    <Typography variant="body2">Failed / Error</Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    ) : (
                        <Box>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                You are about to send an automated renewal SMS to the **{targetGroupLabels[targetGroup]}** group.
                            </Alert>
                            <Typography variant="body1" paragraph>
                                <strong>Total recipients eligible:</strong> {totalMembers}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" paragraph>
                                The system includes built-in duplicate prevention. If a member has already received an expiration reminder via this system in the past 7 days, they will be skipped, ensuring we do not spam members.
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                NOTE: The system will send out messages in batches. It may take some time depending on provider rate limits.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    {bulkResult ? (
                        <Button
                            onClick={() => { setBulkDialogOpen(false); setBulkResult(null); }}
                            color="primary"
                        >
                            Close
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={() => setBulkDialogOpen(false)}
                                disabled={actionLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBulkSend}
                                variant="contained"
                                color="primary"
                                disabled={actionLoading}
                                startIcon={actionLoading ? <CircularProgress size={20} /> : <SendIcon />}
                            >
                                {actionLoading ? 'Sending...' : 'Confirm Bulk Send'}
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default MembershipRenewalSMSPage;
