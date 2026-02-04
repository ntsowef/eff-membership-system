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
    TablePagination,
    useTheme,
    alpha,
    Tooltip,
    Autocomplete,
    InputAdornment,
} from '@mui/material';
import {
    WhatsApp as WhatsAppIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Send as SendIcon,
    Campaign as CampaignIcon,
    Message as MessageIcon,
    Analytics as AnalyticsIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    MonitorHeart as MonitorIcon,
    History as HistoryIcon,
    Description as TemplateIcon,
    Person as PersonIcon,
    Search as SearchIcon,
    Phone as PhoneIcon,
    Group as GroupIcon,
    People as PeopleIcon,
} from '@mui/icons-material';
import { api } from '../../lib/api';
import StatsCard from '../../components/ui/StatsCard';
import PageHeader from '../../components/ui/PageHeader';
import {
    type DeliveryChannel,
    type CommunicationCampaign,
    type MessageTemplate,
    type Message
} from '../../types/communication';

// Member interface for search results
interface MemberSearchResult {
    member_id: number;
    name: string;
    surname: string;
    cell_number: string | null;
    email: string | null;
    id_number: string;
    membership_number: string | null;
    province_name?: string;
}

// Outbound WhatsApp message interface
interface OutboundMessage {
    id: number;
    source: 'bot_message' | 'notification';
    phone_number: string;
    member_id: number | null;
    message_type: string;
    message_content: string;
    message_text: string;
    status: string;
    error_message: string | null;
    wasender_message_id: string | null;
    created_at: string;
    updated_at: string;
}

interface MessagePagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

// Communication group interface
interface CommunicationGroup {
    id: number;
    name: string;
    description: string;
    group_type: 'STATIC' | 'DYNAMIC';
    query_config: any;
    static_member_count?: number;
    created_at: string;
}

// Leadership position interface
interface LeadershipPosition {
    id: number;
    position_name: string;
    hierarchy_level: string;
}

// Province interface
interface Province {
    code: string;
    name: string;
    member_count?: number;
}

// Region/District interface
interface Region {
    code: string;
    name: string;
    province_code: string;
    province_name: string;
    member_count?: number;
}

const WhatsAppManagement: React.FC = () => {
    const theme = useTheme();
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState<any>(null);

    // Data state
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [campaigns, setCampaigns] = useState<CommunicationCampaign[]>([]);
    const [outboundMessages, setOutboundMessages] = useState<OutboundMessage[]>([]);
    const [messagePagination, setMessagePagination] = useState<MessagePagination>({ page: 1, limit: 50, total: 0, total_pages: 0 });
    const [analytics, setAnalytics] = useState<any>(null);
    const [templateDialog, setTemplateDialog] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
    const [templateForm, setTemplateForm] = useState({
        name: '',
        description: '',
        category: 'Custom',
        subject: '',
        content: '',
        is_active: true
    });

    // Send Message tab state
    const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<MemberSearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [singleMessage, setSingleMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

    // Groups tab state
    const [groups, setGroups] = useState<CommunicationGroup[]>([]);
    const [leadershipPositions, setLeadershipPositions] = useState<LeadershipPosition[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [groupDialog, setGroupDialog] = useState(false);
    const [groupForm, setGroupForm] = useState({
        name: '',
        description: '',
        group_type: 'DYNAMIC' as 'STATIC' | 'DYNAMIC',
        dynamic_type: 'LEADERSHIP' as 'LEADERSHIP' | 'GEOGRAPHIC',
        hierarchy_level: '',
        position_name: '',
        province_code: '',
        region_code: ''
    });
    const [sendToGroupDialog, setSendToGroupDialog] = useState(false);
    const [selectedGroupForMessage, setSelectedGroupForMessage] = useState<CommunicationGroup | null>(null);
    const [groupMessage, setGroupMessage] = useState('');
    const [sendingGroupMessage, setSendingGroupMessage] = useState(false);
    const [groupResult, setGroupResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        loadAllData();
    }, [currentTab]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            if (currentTab === 0) {
                await Promise.all([loadSessionStatus(), loadAnalytics()]);
            } else if (currentTab === 1) {
                await loadTemplates();
            } else if (currentTab === 2) {
                await loadCampaigns();
            } else if (currentTab === 3) {
                await loadMessages();
            } else if (currentTab === 5) {
                await Promise.all([loadGroups(), loadLeadershipPositions(), loadProvinces()]);
            }
        } catch (err) {
            console.error('Error loading WhatsApp data:', err);
            setError('Failed to load some data. Please check connection.');
        } finally {
            setLoading(false);
        }
    };

    const loadSessionStatus = async () => {
        try {
            const response = await api.get('/whatsapp/status');
            setSessionStatus(response.data.data);
        } catch (err) {
            console.error('Failed to load WhatsApp session status');
        }
    };

    const loadAnalytics = async () => {
        try {
            const response = await api.get('/communication/analytics/summary?delivery_channels=WhatsApp');
            setAnalytics(response.data.data);
        } catch (err) {
            console.error('Failed to load analytics');
        }
    };

    const loadTemplates = async () => {
        try {
            const response = await api.get('/communication/templates?template_type=WhatsApp');
            setTemplates(response.data.data.templates || []);
        } catch (err) {
            console.error('Failed to load templates');
        }
    };

    const loadCampaigns = async () => {
        try {
            const response = await api.get('/communication/campaigns?delivery_channels=WhatsApp');
            setCampaigns(response.data.data.campaigns || []);
        } catch (err) {
            console.error('Failed to load campaigns');
        }
    };

    const loadMessages = async (page: number = 1) => {
        try {
            const response = await api.get(`/whatsapp/messages/outbound?page=${page}&limit=50`);
            setOutboundMessages(response.data.data.messages || []);
            setMessagePagination(response.data.data.pagination || { page: 1, limit: 50, total: 0, total_pages: 0 });
        } catch (err) {
            console.error('Failed to load outbound messages');
        }
    };

    // Load groups
    const loadGroups = async () => {
        try {
            const response = await api.get('/whatsapp/groups');
            setGroups(response.data.data || []);
        } catch (err) {
            console.error('Failed to load groups');
        }
    };

    // Load leadership positions
    const loadLeadershipPositions = async () => {
        try {
            const response = await api.get('/whatsapp/leadership-positions');
            setLeadershipPositions(response.data.data || []);
        } catch (err) {
            console.error('Failed to load leadership positions');
        }
    };

    // Load provinces
    const loadProvinces = async () => {
        try {
            const response = await api.get('/members/provinces');
            setProvinces(response.data.data || []);
        } catch (err) {
            console.error('Failed to load provinces');
        }
    };

    // Load regions by province
    const loadRegions = async (provinceCode: string) => {
        try {
            const response = await api.get(`/members/regions?province=${provinceCode}`);
            setRegions(response.data.data || []);
        } catch (err) {
            console.error('Failed to load regions');
        }
    };

    // Debounce function for member search
    const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
        let timeout: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // Member search function
    const searchMembers = useCallback(
        debounce(async (query: string) => {
            if (query.length < 2) {
                setMemberSearchResults([]);
                return;
            }
            setSearchLoading(true);
            try {
                const response = await api.get(`/search/quick?q=${encodeURIComponent(query)}&limit=10`);
                const results = response.data.data?.results || [];
                // Filter out members without phone numbers
                setMemberSearchResults(results.filter((m: MemberSearchResult) => m.cell_number));
            } catch (err) {
                console.error('Member search failed:', err);
                setMemberSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300),
        []
    );

    // Send WhatsApp message to single member
    const handleSendSingleMessage = async () => {
        if (!selectedMember?.cell_number || !singleMessage.trim()) return;

        setSendingMessage(true);
        setSendResult(null);
        try {
            await api.post('/whatsapp/send', {
                to: selectedMember.cell_number,
                message: singleMessage,
                type: 'text'
            });
            setSendResult({ success: true, message: `Message sent successfully to ${selectedMember.name} ${selectedMember.surname}!` });
            setSingleMessage('');
        } catch (err: any) {
            setSendResult({
                success: false,
                message: err.response?.data?.error || 'Failed to send message. Please check the WhatsApp connection.'
            });
        } finally {
            setSendingMessage(false);
        }
    };

    // Handle member selection
    const handleMemberSelect = (member: MemberSearchResult | null) => {
        setSelectedMember(member);
        setSendResult(null);
    };

    // Clear send message form
    const clearSendMessageForm = () => {
        setSelectedMember(null);
        setMemberSearchQuery('');
        setMemberSearchResults([]);
        setSingleMessage('');
        setSendResult(null);
    };

    // Open create group dialog
    const openGroupDialog = () => {
        setGroupForm({
            name: '',
            description: '',
            group_type: 'DYNAMIC',
            dynamic_type: 'LEADERSHIP',
            hierarchy_level: '',
            position_name: '',
            province_code: '',
            region_code: ''
        });
        setGroupDialog(true);
    };

    // Create new group
    const handleCreateGroup = async () => {
        try {
            setLoading(true);
            let queryConfig: any = null;

            if (groupForm.group_type === 'DYNAMIC') {
                if (groupForm.dynamic_type === 'LEADERSHIP') {
                    queryConfig = {
                        type: 'LEADERSHIP',
                        hierarchy_level: groupForm.hierarchy_level || null,
                        position_name: groupForm.position_name || null
                    };
                } else if (groupForm.dynamic_type === 'GEOGRAPHIC') {
                    queryConfig = {
                        type: 'GEOGRAPHIC',
                        province_code: groupForm.province_code || null,
                        region_code: groupForm.region_code || null
                    };
                }
            }

            await api.post('/whatsapp/groups', {
                name: groupForm.name,
                description: groupForm.description,
                group_type: groupForm.group_type,
                query_config: queryConfig
            });

            setGroupDialog(false);
            loadGroups();
            setGroupResult({ success: true, message: 'Group created successfully!' });
        } catch (err: any) {
            setGroupResult({
                success: false,
                message: err.response?.data?.error || 'Failed to create group'
            });
        } finally {
            setLoading(false);
        }
    };

    // Open send to group dialog
    const openSendToGroupDialog = (group: CommunicationGroup) => {
        setSelectedGroupForMessage(group);
        setGroupMessage('');
        setSendToGroupDialog(true);
    };

    // Send message to group
    const handleSendToGroup = async () => {
        if (!selectedGroupForMessage || !groupMessage.trim()) return;

        setSendingGroupMessage(true);
        setGroupResult(null);
        try {
            const response = await api.post('/whatsapp/send/group', {
                groupId: selectedGroupForMessage.id,
                message: groupMessage
            });
            setGroupResult({
                success: true,
                message: `Message queued for ${response.data.recipient_count} recipients!`
            });
            setSendToGroupDialog(false);
            setGroupMessage('');
        } catch (err: any) {
            setGroupResult({
                success: false,
                message: err.response?.data?.error || 'Failed to send group message'
            });
        } finally {
            setSendingGroupMessage(false);
        }
    };

    // Delete group
    const handleDeleteGroup = async (groupId: number) => {
        if (!window.confirm('Are you sure you want to delete this group?')) return;
        try {
            await api.delete(`/whatsapp/groups/${groupId}`);
            loadGroups();
            setGroupResult({ success: true, message: 'Group deleted successfully!' });
        } catch (err: any) {
            setGroupResult({
                success: false,
                message: err.response?.data?.error || 'Failed to delete group'
            });
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const openTemplateDialog = (template?: MessageTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setTemplateForm({
                name: template.name,
                description: template.description || '',
                category: template.category || 'Custom',
                subject: template.subject || '',
                content: template.content,
                is_active: template.is_active
            });
        } else {
            setEditingTemplate(null);
            setTemplateForm({
                name: '',
                description: '',
                category: 'Custom',
                subject: '',
                content: '',
                is_active: true
            });
        }
        setTemplateDialog(true);
    };

    const handleSaveTemplate = async () => {
        try {
            setLoading(true);
            if (editingTemplate) {
                await api.put(`/communication/templates/${editingTemplate.id}`, {
                    ...templateForm,
                    template_type: 'WhatsApp'
                });
            } else {
                await api.post('/communication/templates', {
                    ...templateForm,
                    template_type: 'WhatsApp'
                });
            }
            setTemplateDialog(false);
            loadTemplates();
        } catch (err) {
            console.error('Error saving template:', err);
            setError('Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;
        try {
            setLoading(true);
            await api.delete(`/communication/templates/${id}`);
            loadTemplates();
        } catch (err) {
            console.error('Error deleting template:', err);
            setError('Failed to delete template');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <PageHeader
                title="WhatsApp Communication"
                subtitle="Manage WhatsApp campaigns, templates, and individual messages"
                actions={
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<WhatsAppIcon />}
                        onClick={() => setCurrentTab(4)}
                    >
                        Send Message
                    </Button>
                }
            />

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                    <StatsCard
                        title="Total Sent"
                        value={analytics?.whatsapp_stats?.sent || '0'}
                        icon={SendIcon as any}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatsCard
                        title="Delivered"
                        value={analytics?.whatsapp_stats?.delivered || '0'}
                        icon={CheckCircleIcon as any}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatsCard
                        title="Failed"
                        value={analytics?.whatsapp_stats?.failed || '0'}
                        icon={ErrorIcon as any}
                        color="error"
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <MonitorIcon
                                    color={sessionStatus?.session?.status === 'connected' ? 'success' : 'error'}
                                    sx={{ mr: 1 }}
                                />
                                <Typography variant="h6">API Status</Typography>
                            </Box>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                Connection: <Chip
                                    size="small"
                                    label={sessionStatus?.session?.status || 'Unknown'}
                                    color={sessionStatus?.session?.status === 'connected' ? 'success' : 'default'}
                                />
                            </Typography>
                            <Typography variant="caption" display="block" color="textSecondary">
                                Enabled: {sessionStatus?.enabled ? 'Yes' : 'No'}
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                sx={{ mt: 1 }}
                                startIcon={<RefreshIcon />}
                                onClick={loadSessionStatus}
                            >
                                Refresh
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ mb: 4 }}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab icon={<AnalyticsIcon />} label="Dashboard" />
                    <Tab icon={<TemplateIcon />} label="Templates" />
                    <Tab icon={<CampaignIcon />} label="Campaigns" />
                    <Tab icon={<HistoryIcon />} label="History" />
                    <Tab icon={<SendIcon />} label="Send Message" />
                    <Tab icon={<GroupIcon />} label="Groups" />
                </Tabs>
            </Paper>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && !loading && (
                <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>
            )}

            {!loading && currentTab === 0 && (
                <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <TrendingUpIcon sx={{ mr: 1 }} /> Recent Activity
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Welcome to the WhatsApp Management Dashboard. Start by creating a WhatsApp-specific template or launching a targeted campaign.
                    </Alert>

                    <Grid container spacing={3} sx={{ mt: 2 }}>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="subtitle1" gutterBottom>Session Details</Typography>
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="body2"><strong>Bot Name:</strong> {sessionStatus?.session?.name || 'N/A'}</Typography>
                                        <Typography variant="body2"><strong>Phone Number:</strong> {sessionStatus?.session?.wid?.user || 'Not Linked'}</Typography>
                                        <Typography variant="body2"><strong>Platform:</strong> {sessionStatus?.session?.platform || 'Unknown'}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="subtitle1" gutterBottom>Quick Actions</Typography>
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openTemplateDialog()}>New Template</Button>
                                        <Button variant="contained" color="secondary" startIcon={<CampaignIcon />} onClick={() => setCurrentTab(2)}>New Campaign</Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {!loading && currentTab === 1 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">WhatsApp Templates</Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openTemplateDialog()}>Create Template</Button>
                    </Box>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {templates.length > 0 ? templates.map((template) => (
                                    <TableRow key={template.id}>
                                        <TableCell>{template.name}</TableCell>
                                        <TableCell>{template.category}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={template.is_active ? 'Active' : 'Inactive'}
                                                color={template.is_active ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>{new Date(template.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => openTemplateDialog(template)}><EditIcon /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDeleteTemplate(template.id)}><DeleteIcon /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">No WhatsApp templates found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {!loading && currentTab === 2 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">WhatsApp Campaigns</Typography>
                        <Button variant="contained" color="secondary" startIcon={<CampaignIcon />}>Launch Campaign</Button>
                    </Box>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Campaign Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Progress</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {campaigns.length > 0 ? campaigns.map((campaign) => (
                                    <TableRow key={campaign.id}>
                                        <TableCell>{campaign.name}</TableCell>
                                        <TableCell>{campaign.campaign_type}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={campaign.status}
                                                color={campaign.status === 'Completed' ? 'success' : 'primary'}
                                            />
                                        </TableCell>
                                        <TableCell>{campaign.total_delivered} / {campaign.recipient_count}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" color="primary"><AnalyticsIcon /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">No WhatsApp campaigns found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {!loading && currentTab === 3 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Outbound Message History</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total: {messagePagination.total} messages
                        </Typography>
                    </Box>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date/Time</TableCell>
                                    <TableCell>Recipient</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Source</TableCell>
                                    <TableCell>Message</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {outboundMessages.length > 0 ? outboundMessages.map((msg) => (
                                    <TableRow key={`${msg.source}-${msg.id}`} hover>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            {new Date(msg.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2">{msg.phone_number}</Typography>
                                                {msg.member_id && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Member #{msg.member_id}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={msg.message_type}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={msg.status}
                                                color={
                                                    msg.status === 'delivered' || msg.status === 'read' ? 'success' :
                                                    msg.status === 'sent' ? 'info' :
                                                    msg.status === 'failed' ? 'error' :
                                                    'default'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={msg.source === 'bot_message' ? 'Bot' : 'Campaign'}
                                                color={msg.source === 'bot_message' ? 'primary' : 'secondary'}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <Tooltip title={msg.message_text || msg.message_content || ''}>
                                                <span>{msg.message_text || msg.message_content || '-'}</span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Typography color="text.secondary" sx={{ py: 4 }}>
                                                No outbound messages found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {messagePagination.total_pages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Button
                                disabled={messagePagination.page <= 1}
                                onClick={() => loadMessages(messagePagination.page - 1)}
                            >
                                Previous
                            </Button>
                            <Typography sx={{ mx: 2, alignSelf: 'center' }}>
                                Page {messagePagination.page} of {messagePagination.total_pages}
                            </Typography>
                            <Button
                                disabled={messagePagination.page >= messagePagination.total_pages}
                                onClick={() => loadMessages(messagePagination.page + 1)}
                            >
                                Next
                            </Button>
                        </Box>
                    )}
                </Box>
            )}

            {/* Send Message Tab */}
            {!loading && currentTab === 4 && (
                <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <SendIcon sx={{ mr: 1 }} /> Send WhatsApp Message
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Search for a member by name, ID number, or phone number, then compose and send a WhatsApp message directly to them.
                    </Alert>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                        <SearchIcon sx={{ mr: 1 }} /> Find Member
                                    </Typography>

                                    <Autocomplete
                                        options={memberSearchResults}
                                        getOptionLabel={(option) => `${option.name} ${option.surname} - ${option.cell_number || 'No phone'}`}
                                        loading={searchLoading}
                                        value={selectedMember}
                                        onChange={(_, newValue) => handleMemberSelect(newValue)}
                                        onInputChange={(_, newInputValue) => {
                                            setMemberSearchQuery(newInputValue);
                                            searchMembers(newInputValue);
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Search member (name, ID, phone)"
                                                placeholder="Type at least 2 characters..."
                                                InputProps={{
                                                    ...params.InputProps,
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <PersonIcon color="action" />
                                                        </InputAdornment>
                                                    ),
                                                    endAdornment: (
                                                        <>
                                                            {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                    ),
                                                }}
                                            />
                                        )}
                                        renderOption={(props, option) => (
                                            <li {...props}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                    <Typography variant="body1">
                                                        {option.name} {option.surname}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        <PhoneIcon sx={{ fontSize: 12, mr: 0.5 }} />
                                                        {option.cell_number} | ID: {option.id_number}
                                                    </Typography>
                                                </Box>
                                            </li>
                                        )}
                                        noOptionsText={memberSearchQuery.length < 2 ? "Type at least 2 characters" : "No members found with phone number"}
                                        sx={{ mb: 2 }}
                                    />

                                    {selectedMember && (
                                        <Card variant="outlined" sx={{ mt: 2, bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                                            <CardContent>
                                                <Typography variant="subtitle2" color="success.main" gutterBottom>
                                                    Selected Recipient
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <PersonIcon color="primary" sx={{ fontSize: 40 }} />
                                                    <Box>
                                                        <Typography variant="h6">
                                                            {selectedMember.name} {selectedMember.surname}
                                                        </Typography>
                                                        <Typography variant="body2" color="textSecondary">
                                                            <PhoneIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                                            {selectedMember.cell_number}
                                                        </Typography>
                                                        {selectedMember.membership_number && (
                                                            <Typography variant="caption" color="textSecondary">
                                                                Member #: {selectedMember.membership_number}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                        <MessageIcon sx={{ mr: 1 }} /> Compose Message
                                    </Typography>

                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={6}
                                        label="Message"
                                        placeholder="Type your WhatsApp message here..."
                                        value={singleMessage}
                                        onChange={(e) => setSingleMessage(e.target.value)}
                                        disabled={!selectedMember}
                                        helperText={`Characters: ${singleMessage.length} | Use *bold*, _italic_, ~strikethrough~ for formatting`}
                                        sx={{ mb: 2 }}
                                    />

                                    {sendResult && (
                                        <Alert
                                            severity={sendResult.success ? 'success' : 'error'}
                                            sx={{ mb: 2 }}
                                            onClose={() => setSendResult(null)}
                                        >
                                            {sendResult.message}
                                        </Alert>
                                    )}

                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            startIcon={sendingMessage ? <CircularProgress size={20} color="inherit" /> : <WhatsAppIcon />}
                                            onClick={handleSendSingleMessage}
                                            disabled={!selectedMember || !singleMessage.trim() || sendingMessage}
                                            sx={{ flex: 1 }}
                                        >
                                            {sendingMessage ? 'Sending...' : 'Send WhatsApp Message'}
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={clearSendMessageForm}
                                            disabled={sendingMessage}
                                        >
                                            Clear
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Groups Tab */}
            {!loading && currentTab === 5 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <GroupIcon sx={{ mr: 1 }} /> Communication Groups
                        </Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={openGroupDialog}>
                            Create Group
                        </Button>
                    </Box>

                    <Alert severity="info" sx={{ mb: 3 }}>
                        Create groups to send WhatsApp messages to multiple members at once.
                        Dynamic groups automatically include members based on leadership positions or geographic location.
                    </Alert>

                    {groupResult && (
                        <Alert severity={groupResult.success ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setGroupResult(null)}>
                            {groupResult.message}
                        </Alert>
                    )}

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Group Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Members</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {groups.length > 0 ? groups.map((group) => (
                                    <TableRow key={group.id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                {group.name}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={group.group_type}
                                                color={group.group_type === 'DYNAMIC' ? 'primary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {group.description || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {group.group_type === 'STATIC' ? (group.static_member_count || 0) : 'Dynamic'}
                                        </TableCell>
                                        <TableCell>{new Date(group.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Send message to group">
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => openSendToGroupDialog(group)}
                                                >
                                                    <SendIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete group">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteGroup(group.id)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            No communication groups found. Create one to start sending group messages.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {/* Create Group Dialog */}
            <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Communication Group</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Group Name"
                                value={groupForm.name}
                                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                                placeholder="e.g., Ward Chairpersons, Gauteng Leaders"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                value={groupForm.description}
                                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Group Type</InputLabel>
                                <Select
                                    value={groupForm.group_type}
                                    label="Group Type"
                                    onChange={(e) => setGroupForm({ ...groupForm, group_type: e.target.value as 'STATIC' | 'DYNAMIC' })}
                                >
                                    <MenuItem value="DYNAMIC">Dynamic (Auto-populated)</MenuItem>
                                    <MenuItem value="STATIC">Static (Manual members)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {groupForm.group_type === 'DYNAMIC' && (
                            <>
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>Dynamic Type</InputLabel>
                                        <Select
                                            value={groupForm.dynamic_type}
                                            label="Dynamic Type"
                                            onChange={(e) => setGroupForm({ ...groupForm, dynamic_type: e.target.value as 'LEADERSHIP' | 'GEOGRAPHIC' })}
                                        >
                                            <MenuItem value="LEADERSHIP">Leadership Structure</MenuItem>
                                            <MenuItem value="GEOGRAPHIC">Geographic Region</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                {groupForm.dynamic_type === 'LEADERSHIP' && (
                                    <>
                                        <Grid item xs={12}>
                                            <FormControl fullWidth>
                                                <InputLabel>Hierarchy Level</InputLabel>
                                                <Select
                                                    value={groupForm.hierarchy_level}
                                                    label="Hierarchy Level"
                                                    onChange={(e) => setGroupForm({ ...groupForm, hierarchy_level: e.target.value })}
                                                >
                                                    <MenuItem value="">All Levels</MenuItem>
                                                    <MenuItem value="National">National</MenuItem>
                                                    <MenuItem value="Province">Province</MenuItem>
                                                    <MenuItem value="Region">Region</MenuItem>
                                                    <MenuItem value="Municipality">Municipality</MenuItem>
                                                    <MenuItem value="Ward">Ward</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Autocomplete
                                                options={leadershipPositions}
                                                getOptionLabel={(option) => `${option.position_name} (${option.hierarchy_level})`}
                                                value={leadershipPositions.find(p => p.position_name === groupForm.position_name) || null}
                                                onChange={(_, newValue) => setGroupForm({ ...groupForm, position_name: newValue?.position_name || '' })}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="Position (optional)" placeholder="All positions" />
                                                )}
                                            />
                                        </Grid>
                                    </>
                                )}

                                {groupForm.dynamic_type === 'GEOGRAPHIC' && (
                                    <>
                                        <Grid item xs={12}>
                                            <FormControl fullWidth>
                                                <InputLabel>Province</InputLabel>
                                                <Select
                                                    value={groupForm.province_code}
                                                    label="Province"
                                                    onChange={(e) => {
                                                        setGroupForm({ ...groupForm, province_code: e.target.value, region_code: '' });
                                                        if (e.target.value) loadRegions(e.target.value);
                                                    }}
                                                >
                                                    <MenuItem value="">All Provinces</MenuItem>
                                                    {provinces.map((p) => (
                                                        <MenuItem key={p.code} value={p.code}>
                                                            {p.name} ({p.member_count?.toLocaleString() || 0} members)
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        {groupForm.province_code && regions.length > 0 && (
                                            <Grid item xs={12}>
                                                <FormControl fullWidth>
                                                    <InputLabel>Region/District</InputLabel>
                                                    <Select
                                                        value={groupForm.region_code}
                                                        label="Region/District"
                                                        onChange={(e) => setGroupForm({ ...groupForm, region_code: e.target.value })}
                                                    >
                                                        <MenuItem value="">All Regions</MenuItem>
                                                        {regions.map((r) => (
                                                            <MenuItem key={r.code} value={r.code}>
                                                                {r.name} ({r.member_count?.toLocaleString() || 0} members)
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGroupDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateGroup} disabled={!groupForm.name}>
                        Create Group
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Send to Group Dialog */}
            <Dialog open={sendToGroupDialog} onClose={() => setSendToGroupDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Send Message to Group: {selectedGroupForMessage?.name}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                        This message will be sent to all members in this group who have valid phone numbers.
                    </Alert>
                    <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Message"
                        placeholder="Type your WhatsApp message here..."
                        value={groupMessage}
                        onChange={(e) => setGroupMessage(e.target.value)}
                        helperText={`Characters: ${groupMessage.length} | Use *bold*, _italic_, ~strikethrough~ for formatting`}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSendToGroupDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={sendingGroupMessage ? <CircularProgress size={20} color="inherit" /> : <WhatsAppIcon />}
                        onClick={handleSendToGroup}
                        disabled={!groupMessage.trim() || sendingGroupMessage}
                    >
                        {sendingGroupMessage ? 'Sending...' : 'Send to Group'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{editingTemplate ? 'Edit WhatsApp Template' : 'Create WhatsApp Template'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Template Name"
                                value={templateForm.name}
                                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                value={templateForm.description}
                                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={templateForm.category}
                                    label="Category"
                                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as string })}
                                >
                                    <MenuItem value="System">System</MenuItem>
                                    <MenuItem value="Marketing">Marketing</MenuItem>
                                    <MenuItem value="Announcement">Announcement</MenuItem>
                                    <MenuItem value="Reminder">Reminder</MenuItem>
                                    <MenuItem value="Welcome">Welcome</MenuItem>
                                    <MenuItem value="Custom">Custom</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={6}
                                label="Template Content"
                                value={templateForm.content}
                                onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                                helperText="Use {{variable_name}} for dynamic content. WhatsApp specific formatting: *bold*, _italic_, ~strikethrough~"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTemplateDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveTemplate} disabled={!templateForm.name || !templateForm.content}>
                        Save Template
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

// Add missing icon for the dashboard
const TrendingUpIcon = (props: any) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);

export default WhatsAppManagement;
