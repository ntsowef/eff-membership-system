import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useTheme,
    alpha,
    Tooltip,
    Autocomplete,
    InputAdornment,
} from '@mui/material';
import {
    Security as SecurityIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Refresh as RefreshIcon,
    Person as PersonIcon,
    Search as SearchIcon,
    Timer as TimerIcon,
    Warning as WarningIcon,
    History as HistoryIcon,
    Shield as ShieldIcon,
    LockOpen as LockOpenIcon,
    Block as BlockIcon,
} from '@mui/icons-material';
import { api } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';

// Interfaces
interface BypassPermission {
    bypass_id: number;
    user_id: number;
    user_name?: string;
    user_email?: string;
    admin_level?: string;
    granted_by_user_id: number;
    granted_by_name?: string;
    reason: string;
    granted_at: string;
    expires_at: string;
    is_active: boolean;
    revoked_at?: string;
    revoked_by_name?: string;
    revocation_reason?: string;
}

interface EmergencyRequest {
    request_id: number;
    user_id: number;
    user_name?: string;
    user_email?: string;
    admin_level?: string;
    reason: string;
    urgency_level: 'low' | 'normal' | 'high' | 'critical';
    status: 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';
    requested_at: string;
    contact_phone?: string;
    contact_email?: string;
    bypass_duration_hours: number;
    reviewed_at?: string;
    reviewed_by_name?: string;
    review_notes?: string;
}

interface UserSearchResult {
    user_id: number;
    name: string;
    email: string;
    admin_level: string;
    province_name?: string;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const MFAEmergencyAccess: React.FC = () => {
    const theme = useTheme();
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Data state
    const [activeBypasses, setActiveBypasses] = useState<BypassPermission[]>([]);
    const [pendingRequests, setPendingRequests] = useState<EmergencyRequest[]>([]);
    
    // Grant bypass dialog state
    const [grantDialogOpen, setGrantDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [bypassReason, setBypassReason] = useState('');
    const [bypassDuration, setBypassDuration] = useState(24);
    const [grantingBypass, setGrantingBypass] = useState(false);

    // Revoke dialog state
    const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
    const [selectedBypass, setSelectedBypass] = useState<BypassPermission | null>(null);
    const [revokeReason, setRevokeReason] = useState('');
    const [revokingBypass, setRevokingBypass] = useState(false);

    // Review request dialog state
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [reviewDuration, setReviewDuration] = useState(24);
    const [reviewingRequest, setReviewingRequest] = useState(false);

    // Load data
    const loadActiveBypasses = useCallback(async () => {
        try {
            const response = await api.get('/emergency-access/bypass/active');
            setActiveBypasses(response.data.data || []);
        } catch (err) {
            console.error('Failed to load active bypasses:', err);
        }
    }, []);

    const loadPendingRequests = useCallback(async () => {
        try {
            const response = await api.get('/emergency-access/requests/pending');
            setPendingRequests(response.data.data || []);
        } catch (err) {
            console.error('Failed to load pending requests:', err);
        }
    }, []);

    const loadAllData = useCallback(async () => {
        setLoading(true);
        await Promise.all([loadActiveBypasses(), loadPendingRequests()]);
        setLoading(false);
    }, [loadActiveBypasses, loadPendingRequests]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // Search users for bypass grant
    const searchUsers = useCallback(async (query: string) => {
        if (query.length < 2) {
            setUserSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const response = await api.get(`/user-management/admins?search=${encodeURIComponent(query)}&limit=10`);
            const admins = response.data.data?.admins || response.data.data || [];
            setUserSearchResults(admins.map((a: any) => ({
                user_id: a.id || a.user_id,
                name: a.name,
                email: a.email,
                admin_level: a.admin_level,
                province_name: a.province_name
            })));
        } catch (err) {
            console.error('User search failed:', err);
            setUserSearchResults([]);
        }
        setSearchLoading(false);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (userSearchQuery) searchUsers(userSearchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [userSearchQuery, searchUsers]);

    // Grant bypass permission
    const handleGrantBypass = async () => {
        if (!selectedUser || !bypassReason.trim()) {
            setError('Please select a user and provide a reason');
            return;
        }
        setGrantingBypass(true);
        try {
            await api.post('/emergency-access/bypass/grant', {
                user_id: selectedUser.user_id,
                reason: bypassReason,
                duration_hours: bypassDuration
            });
            setSuccess(`MFA bypass granted to ${selectedUser.name} for ${bypassDuration} hours`);
            setGrantDialogOpen(false);
            setSelectedUser(null);
            setBypassReason('');
            setBypassDuration(24);
            loadActiveBypasses();
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to grant bypass');
        }
        setGrantingBypass(false);
    };

    // Revoke bypass permission
    const handleRevokeBypass = async () => {
        if (!selectedBypass || !revokeReason.trim()) {
            setError('Please provide a reason for revocation');
            return;
        }
        setRevokingBypass(true);
        try {
            await api.post(`/emergency-access/bypass/revoke/${selectedBypass.bypass_id}`, {
                reason: revokeReason
            });
            setSuccess('MFA bypass revoked successfully');
            setRevokeDialogOpen(false);
            setSelectedBypass(null);
            setRevokeReason('');
            loadActiveBypasses();
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to revoke bypass');
        }
        setRevokingBypass(false);
    };

    // Approve emergency request
    const handleApproveRequest = async () => {
        if (!selectedRequest) return;
        setReviewingRequest(true);
        try {
            await api.post(`/emergency-access/requests/${selectedRequest.request_id}/approve`, {
                review_notes: reviewNotes,
                duration_hours: reviewDuration
            });
            setSuccess(`Emergency access approved for ${selectedRequest.user_name || 'user'}`);
            setReviewDialogOpen(false);
            setSelectedRequest(null);
            setReviewNotes('');
            loadPendingRequests();
            loadActiveBypasses();
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to approve request');
        }
        setReviewingRequest(false);
    };

    // Deny emergency request
    const handleDenyRequest = async () => {
        if (!selectedRequest || !reviewNotes.trim()) {
            setError('Please provide a reason for denial');
            return;
        }
        setReviewingRequest(true);
        try {
            await api.post(`/emergency-access/requests/${selectedRequest.request_id}/deny`, {
                review_notes: reviewNotes
            });
            setSuccess('Emergency access request denied');
            setReviewDialogOpen(false);
            setSelectedRequest(null);
            setReviewNotes('');
            loadPendingRequests();
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to deny request');
        }
        setReviewingRequest(false);
    };

    const getUrgencyColor = (level: string) => {
        switch (level) {
            case 'critical': return 'error';
            case 'high': return 'warning';
            case 'normal': return 'info';
            case 'low': return 'default';
            default: return 'default';
        }
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const getTimeRemaining = (expiresAt: string) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - now.getTime();
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m remaining`;
    };

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
            <PageHeader
                title="MFA Emergency Access"
                subtitle="Manage MFA bypass permissions and emergency access requests for provincial administrators"
                gradient={true}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Admin', href: '/admin' },
                    { label: 'MFA Emergency Access' },
                ]}
                actions={
                    <Box display="flex" gap={2}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={loadAllData}
                            disabled={loading}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setGrantDialogOpen(true)}
                            sx={{
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            }}
                        >
                            Grant Bypass
                        </Button>
                    </Box>
                }
            />

            <Container maxWidth="xl" sx={{ pb: 4 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                        {success}
                    </Alert>
                )}

                {/* Statistics Cards */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <ShieldIcon color="primary" />
                                    <Box>
                                        <Typography variant="h4">{activeBypasses.length}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Active Bypasses
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <WarningIcon color="warning" />
                                    <Box>
                                        <Typography variant="h4">{pendingRequests.length}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Pending Requests
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <TimerIcon color="info" />
                                    <Box>
                                        <Typography variant="h4">
                                            {pendingRequests.filter(r => r.urgency_level === 'critical' || r.urgency_level === 'high').length}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Urgent Requests
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Tabs */}
                <Paper sx={{ mb: 3 }}>
                    <Tabs
                        value={currentTab}
                        onChange={(_, newValue) => setCurrentTab(newValue)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab icon={<ShieldIcon />} label="Active Bypasses" iconPosition="start" />
                        <Tab
                            icon={<WarningIcon />}
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    Pending Requests
                                    {pendingRequests.length > 0 && (
                                        <Chip size="small" label={pendingRequests.length} color="warning" />
                                    )}
                                </Box>
                            }
                            iconPosition="start"
                        />
                    </Tabs>

                    {/* Active Bypasses Tab */}
                    <TabPanel value={currentTab} index={0}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>User</TableCell>
                                            <TableCell>Admin Level</TableCell>
                                            <TableCell>Reason</TableCell>
                                            <TableCell>Granted By</TableCell>
                                            <TableCell>Granted At</TableCell>
                                            <TableCell>Time Remaining</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {activeBypasses.length > 0 ? activeBypasses.map((bypass) => (
                                            <TableRow key={bypass.bypass_id} hover>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {bypass.user_name || `User #${bypass.user_id}`}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {bypass.user_email}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip size="small" label={bypass.admin_level || 'N/A'} />
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 200 }}>
                                                    <Tooltip title={bypass.reason}>
                                                        <Typography variant="body2" noWrap>
                                                            {bypass.reason}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>{bypass.granted_by_name || `User #${bypass.granted_by_user_id}`}</TableCell>
                                                <TableCell>{formatDateTime(bypass.granted_at)}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        icon={<TimerIcon />}
                                                        label={getTimeRemaining(bypass.expires_at)}
                                                        color={new Date(bypass.expires_at) > new Date() ? 'success' : 'error'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title="Revoke Bypass">
                                                        <IconButton
                                                            color="error"
                                                            size="small"
                                                            onClick={() => {
                                                                setSelectedBypass(bypass);
                                                                setRevokeDialogOpen(true);
                                                            }}
                                                        >
                                                            <BlockIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center">
                                                    <Typography color="text.secondary" sx={{ py: 4 }}>
                                                        No active bypass permissions
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </TabPanel>

                    {/* Pending Requests Tab */}
                    <TabPanel value={currentTab} index={1}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>User</TableCell>
                                            <TableCell>Urgency</TableCell>
                                            <TableCell>Reason</TableCell>
                                            <TableCell>Contact</TableCell>
                                            <TableCell>Requested At</TableCell>
                                            <TableCell>Duration</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pendingRequests.length > 0 ? pendingRequests.map((request) => (
                                            <TableRow key={request.request_id} hover>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {request.user_name || `User #${request.user_id}`}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {request.user_email}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={request.urgency_level.toUpperCase()}
                                                        color={getUrgencyColor(request.urgency_level) as any}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 200 }}>
                                                    <Tooltip title={request.reason}>
                                                        <Typography variant="body2" noWrap>
                                                            {request.reason}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption">
                                                        {request.contact_phone || request.contact_email || 'N/A'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{formatDateTime(request.requested_at)}</TableCell>
                                                <TableCell>{request.bypass_duration_hours}h</TableCell>
                                                <TableCell>
                                                    <Box display="flex" gap={1}>
                                                        <Tooltip title="Approve">
                                                            <IconButton
                                                                color="success"
                                                                size="small"
                                                                onClick={() => {
                                                                    setSelectedRequest(request);
                                                                    setReviewDuration(request.bypass_duration_hours);
                                                                    setReviewDialogOpen(true);
                                                                }}
                                                            >
                                                                <CheckIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Deny">
                                                            <IconButton
                                                                color="error"
                                                                size="small"
                                                                onClick={() => {
                                                                    setSelectedRequest(request);
                                                                    setReviewDialogOpen(true);
                                                                }}
                                                            >
                                                                <CloseIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center">
                                                    <Typography color="text.secondary" sx={{ py: 4 }}>
                                                        No pending emergency access requests
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </TabPanel>
                </Paper>
            </Container>

            {/* Grant Bypass Dialog */}
            <Dialog open={grantDialogOpen} onClose={() => setGrantDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <LockOpenIcon color="primary" />
                        Grant MFA Bypass
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Autocomplete
                            options={userSearchResults}
                            getOptionLabel={(option) => `${option.name} (${option.email})`}
                            value={selectedUser}
                            onChange={(_, newValue) => setSelectedUser(newValue)}
                            onInputChange={(_, newInputValue) => setUserSearchQuery(newInputValue)}
                            loading={searchLoading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Search Admin User"
                                    placeholder="Type to search by name or email..."
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props}>
                                    <Box>
                                        <Typography variant="body2">{option.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {option.email} • {option.admin_level}
                                            {option.province_name && ` • ${option.province_name}`}
                                        </Typography>
                                    </Box>
                                </li>
                            )}
                        />
                        <TextField
                            label="Reason for Bypass"
                            multiline
                            rows={3}
                            value={bypassReason}
                            onChange={(e) => setBypassReason(e.target.value)}
                            placeholder="Explain why MFA bypass is needed..."
                            required
                        />
                        <FormControl fullWidth>
                            <InputLabel>Bypass Duration</InputLabel>
                            <Select
                                value={bypassDuration}
                                label="Bypass Duration"
                                onChange={(e) => setBypassDuration(Number(e.target.value))}
                            >
                                <MenuItem value={1}>1 hour</MenuItem>
                                <MenuItem value={4}>4 hours</MenuItem>
                                <MenuItem value={8}>8 hours</MenuItem>
                                <MenuItem value={24}>24 hours</MenuItem>
                                <MenuItem value={48}>48 hours</MenuItem>
                                <MenuItem value={72}>72 hours (3 days)</MenuItem>
                                <MenuItem value={168}>168 hours (1 week)</MenuItem>
                            </Select>
                        </FormControl>
                        <Alert severity="info">
                            The user will be able to login without MFA verification for the specified duration.
                            This action is logged for audit purposes.
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGrantDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleGrantBypass}
                        disabled={grantingBypass || !selectedUser || !bypassReason.trim()}
                        startIcon={grantingBypass ? <CircularProgress size={20} /> : <CheckIcon />}
                    >
                        Grant Bypass
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Revoke Bypass Dialog */}
            <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <BlockIcon color="error" />
                        Revoke MFA Bypass
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {selectedBypass && (
                            <Alert severity="warning">
                                You are about to revoke MFA bypass for <strong>{selectedBypass.user_name || `User #${selectedBypass.user_id}`}</strong>.
                                They will be required to use MFA for their next login.
                            </Alert>
                        )}
                        <TextField
                            label="Reason for Revocation"
                            multiline
                            rows={3}
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            placeholder="Explain why the bypass is being revoked..."
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRevokeDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleRevokeBypass}
                        disabled={revokingBypass || !revokeReason.trim()}
                        startIcon={revokingBypass ? <CircularProgress size={20} /> : <BlockIcon />}
                    >
                        Revoke Bypass
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Review Request Dialog */}
            <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <SecurityIcon color="primary" />
                        Review Emergency Access Request
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {selectedRequest && (
                            <>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Requester</Typography>
                                            <Typography variant="body2">{selectedRequest.user_name || `User #${selectedRequest.user_id}`}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Urgency</Typography>
                                            <Box>
                                                <Chip
                                                    size="small"
                                                    label={selectedRequest.urgency_level.toUpperCase()}
                                                    color={getUrgencyColor(selectedRequest.urgency_level) as any}
                                                />
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="caption" color="text.secondary">Reason</Typography>
                                            <Typography variant="body2">{selectedRequest.reason}</Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="caption" color="text.secondary">Contact</Typography>
                                            <Typography variant="body2">
                                                {selectedRequest.contact_phone || selectedRequest.contact_email || 'Not provided'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Paper>
                                <FormControl fullWidth>
                                    <InputLabel>Approved Duration</InputLabel>
                                    <Select
                                        value={reviewDuration}
                                        label="Approved Duration"
                                        onChange={(e) => setReviewDuration(Number(e.target.value))}
                                    >
                                        <MenuItem value={1}>1 hour</MenuItem>
                                        <MenuItem value={4}>4 hours</MenuItem>
                                        <MenuItem value={8}>8 hours</MenuItem>
                                        <MenuItem value={24}>24 hours</MenuItem>
                                        <MenuItem value={48}>48 hours</MenuItem>
                                        <MenuItem value={72}>72 hours (3 days)</MenuItem>
                                    </Select>
                                </FormControl>
                            </>
                        )}
                        <TextField
                            label="Review Notes"
                            multiline
                            rows={3}
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Add notes for your decision (required for denial)..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleDenyRequest}
                        disabled={reviewingRequest || !reviewNotes.trim()}
                        startIcon={reviewingRequest ? <CircularProgress size={20} /> : <CloseIcon />}
                    >
                        Deny
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleApproveRequest}
                        disabled={reviewingRequest}
                        startIcon={reviewingRequest ? <CircularProgress size={20} /> : <CheckIcon />}
                    >
                        Approve
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MFAEmergencyAccess;