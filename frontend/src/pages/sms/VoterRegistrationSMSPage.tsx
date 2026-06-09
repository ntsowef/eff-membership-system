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
    useTheme,
    alpha,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress,
    Snackbar,
} from '@mui/material';
import {
    Send as SendIcon,
    HowToVote as VoteIcon,
    People as PeopleIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    Campaign as CampaignIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import StatsCard from '../../components/ui/StatsCard';
import PageHeader from '../../components/ui/PageHeader';

interface UnregisteredMember {
    member_id: number;
    firstname: string;
    surname: string;
    full_name: string;
    cell_number: string;
    ward_code: string;
    municipality_code?: string;
    municipality_name?: string;
}

interface VoterRegStats {
    total_unregistered: number;
    sent_today: number;
    failed_today: number;
}

interface BulkSendResult {
    total_targeted: number;
    sent: number;
    failed: number;
    skipped: number;
}

const VoterRegistrationSMSPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<VoterRegStats | null>(null);
    const [members, setMembers] = useState<UnregisteredMember[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalMembers, setTotalMembers] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [sendingMemberId, setSendingMemberId] = useState<number | null>(null);
    const [bulkSendDialog, setBulkSendDialog] = useState(false);
    const [bulkSending, setBulkSending] = useState(false);
    const [bulkResult, setBulkResult] = useState<BulkSendResult | null>(null);

    // Load stats on mount
    const loadStats = useCallback(async () => {
        try {
            const response = await api.get('/voter-registration-sms/stats');
            setStats(response.data.data);
        } catch (err: any) {
            console.error('Failed to load stats:', err);
        }
    }, []);

    // Load unregistered members
    const loadMembers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/voter-registration-sms/unregistered-members', {
                params: { page: page + 1, limit: rowsPerPage },
            });
            setMembers(response.data.data.members);
            setTotalMembers(response.data.data.pagination.total);
        } catch (err: any) {
            setError('Failed to load unregistered voters');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        loadStats();
        loadMembers();
    }, [loadStats, loadMembers]);

    // Send to single member
    const handleSendSingle = async (memberId: number) => {
        try {
            setSendingMemberId(memberId);
            setError(null);
            const response = await api.post(`/voter-registration-sms/send-single/${memberId}`);
            if (response.data.success) {
                setSuccess(response.data.data.message);
                loadStats();
            } else {
                setError(response.data.error?.message || 'Failed to send SMS');
            }
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to send SMS');
        } finally {
            setSendingMemberId(null);
        }
    };

    // Bulk send
    const handleBulkSend = async () => {
        try {
            setBulkSending(true);
            setError(null);
            setBulkResult(null);
            const response = await api.post('/voter-registration-sms/send-reminders');
            setBulkResult(response.data.data);
            setSuccess(`Campaign complete: ${response.data.data.sent} sent, ${response.data.data.failed} failed, ${response.data.data.skipped} skipped`);
            loadStats();
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Bulk send failed');
        } finally {
            setBulkSending(false);
        }
    };

    const formatPhone = (phone: string) => {
        if (phone.startsWith('27') && phone.length === 11) {
            return `0${phone.substring(2, 5)} ${phone.substring(5, 8)} ${phone.substring(8)}`;
        }
        return phone;
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/admin/sms')}
                        size="small"
                        sx={{ borderRadius: 2 }}
                    >
                        SMS Management
                    </Button>
                    <Box>
                        <PageHeader
                            title="Voter Registration SMS Campaign"
                            subtitle="Send reminders to members who are not yet registered voters"
                        />
                    </Box>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => { loadStats(); loadMembers(); }}
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                >
                    Refresh
                </Button>
            </Box>

            {/* Alerts */}
            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            <Snackbar
                open={!!success}
                autoHideDuration={5000}
                onClose={() => setSuccess(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity="success" onClose={() => setSuccess(null)} variant="filled" sx={{ borderRadius: 2 }}>
                    {success}
                </Alert>
            </Snackbar>

            {/* Stats Cards */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Unregistered Voters"
                        value={stats?.total_unregistered ?? '—'}
                        subtitle="Members without voter registration"
                        icon={PeopleIcon}
                        color="warning"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Sent Today"
                        value={stats?.sent_today ?? 0}
                        subtitle="Reminders sent today"
                        icon={SendIcon}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Failed Today"
                        value={stats?.failed_today ?? 0}
                        subtitle="Failed delivery attempts"
                        icon={ErrorIcon}
                        color="error"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
                            },
                        }}
                        onClick={() => setBulkSendDialog(true)}
                    >
                        <CardContent sx={{ textAlign: 'center', py: 3 }}>
                            <CampaignIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
                            <Typography variant="h6" fontWeight={600} color="primary">
                                Send to All
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Bulk campaign to all unregistered
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Members Table */}
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        background: alpha(theme.palette.background.default, 0.5),
                    }}
                >
                    <Box display="flex" alignItems="center" gap={1}>
                        <VoteIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            Unregistered Voter Members
                        </Typography>
                        <Chip
                            label={totalMembers.toLocaleString()}
                            size="small"
                            color="warning"
                            sx={{ fontWeight: 600 }}
                        />
                    </Box>
                </Box>

                {loading && <LinearProgress />}

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' } }}>
                                <TableCell>Member</TableCell>
                                <TableCell>Phone</TableCell>
                                <TableCell>Ward</TableCell>
                                <TableCell>Municipality</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {members.length === 0 && !loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                        <Typography variant="body1" color="text.secondary">
                                            No unregistered voter members found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                members.map((member) => (
                                    <TableRow
                                        key={member.member_id}
                                        hover
                                        sx={{
                                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.02) },
                                            transition: 'background-color 0.2s',
                                        }}
                                    >
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {member.full_name || `${member.firstname} ${member.surname}`}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    ID: {member.member_id}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {formatPhone(member.cell_number)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={member.ward_code || '—'} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {member.municipality_name || member.municipality_code || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={
                                                    sendingMemberId === member.member_id ? (
                                                        <CircularProgress size={16} color="inherit" />
                                                    ) : (
                                                        <SendIcon />
                                                    )
                                                }
                                                onClick={() => handleSendSingle(member.member_id)}
                                                disabled={sendingMemberId !== null}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    px: 2,
                                                    boxShadow: 'none',
                                                    '&:hover': { boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` },
                                                }}
                                            >
                                                {sendingMemberId === member.member_id ? 'Sending...' : 'Send SMS'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={totalMembers}
                    page={page}
                    onPageChange={(_e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
                />
            </Paper>

            {/* Bulk Send Confirmation Dialog */}
            <Dialog
                open={bulkSendDialog}
                onClose={() => { if (!bulkSending) setBulkSendDialog(false); }}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <CampaignIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            Bulk Voter Registration SMS
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {!bulkResult ? (
                        <Box>
                            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                                You are about to send voter registration reminders to <strong>{stats?.total_unregistered?.toLocaleString() ?? '—'}</strong> unregistered members.
                                Members who already received a reminder today will be skipped.
                            </Alert>
                            <Typography variant="body2" color="text.secondary">
                                The message will be personalized with each member's first name using the <strong>VOTER_REGISTRATION</strong> template.
                            </Typography>
                            {bulkSending && (
                                <Box mt={2}>
                                    <LinearProgress sx={{ borderRadius: 1 }} />
                                    <Typography variant="caption" color="text.secondary" mt={1} display="block" textAlign="center">
                                        Sending in progress... This may take several minutes.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box>
                            <Alert
                                severity={bulkResult.failed === 0 ? 'success' : 'warning'}
                                sx={{ mb: 2, borderRadius: 2 }}
                            >
                                Campaign completed!
                            </Alert>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                                        <Typography variant="h4" fontWeight={700} color="info.main">{bulkResult.total_targeted}</Typography>
                                        <Typography variant="caption" color="text.secondary">Targeted</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                                        <Typography variant="h4" fontWeight={700} color="success.main">{bulkResult.sent}</Typography>
                                        <Typography variant="caption" color="text.secondary">Sent</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                                        <Typography variant="h4" fontWeight={700} color="error.main">{bulkResult.failed}</Typography>
                                        <Typography variant="caption" color="text.secondary">Failed</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.05) }}>
                                        <Typography variant="h4" fontWeight={700} color="warning.main">{bulkResult.skipped}</Typography>
                                        <Typography variant="caption" color="text.secondary">Skipped (already sent)</Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    {!bulkResult ? (
                        <>
                            <Button onClick={() => setBulkSendDialog(false)} disabled={bulkSending} sx={{ borderRadius: 2 }}>
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={bulkSending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                                onClick={handleBulkSend}
                                disabled={bulkSending}
                                sx={{ borderRadius: 2, px: 3 }}
                            >
                                {bulkSending ? 'Sending...' : 'Send to All'}
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={() => { setBulkSendDialog(false); setBulkResult(null); }}
                            sx={{ borderRadius: 2 }}
                        >
                            Close
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default VoterRegistrationSMSPage;
