import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  Container,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Event,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  People,
  Schedule,
  LocationOn,
  VideoCall,
  FilterList,
  Refresh,
  CalendarToday,
  Groups,
  ExpandMore,
  Person,
  HowToVote,
  Email,
  Phone,
  AccountTree,
  TrendingUp,
  Assessment,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../../components/ui/StatsCard';
import ActionButton from '../../components/ui/ActionButton';
import PageHeader from '../../components/ui/PageHeader';

interface HierarchicalMeeting {
  meeting_id: number;
  meeting_title: string;
  meeting_type_id: number;
  type_name: string;
  type_code: string;
  meeting_category: string;
  hierarchy_level: string;
  entity_id?: number;
  entity_type?: string;
  entity_name?: string;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
  location?: string;
  virtual_meeting_link?: string;
  meeting_platform: string;
  meeting_status: string;
  description?: string;
  total_invited: number;
  total_attendees: number;
  quorum_required: number;
  quorum_achieved: number;
  chair_name?: string;
  secretary_name?: string;
  created_by_name: string;
  invitations_sent_at?: string;
  attendance_summary?: {
    total_invited: number;
    total_attended: number;
    total_absent: number;
    total_excused: number;
    attendance_percentage: number;
  };
}

interface MeetingStatistics {
  hierarchy_level: string;
  type_name: string;
  meeting_category: string;
  total_meetings: number;
  completed_meetings: number;
  scheduled_meetings: number;
  cancelled_meetings: number;
  avg_attendance: number;
  avg_duration_minutes: number;
  avg_quorum_percentage: number;
  recent_meetings: number;
  this_week_meetings: number;
}

const HierarchicalMeetingsDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [tabValue, setTabValue] = useState(0);
  const [filterHierarchy, setFilterHierarchy] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedMeeting, setSelectedMeeting] = useState<HierarchicalMeeting | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Fetch hierarchical meetings
  const { data: meetingsData, isLoading: meetingsLoading, error: meetingsError, refetch } = useQuery({
    queryKey: ['hierarchical-meetings', filterHierarchy, filterStatus, filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterHierarchy !== 'all') params.append('hierarchy_level', filterHierarchy);
      if (filterStatus !== 'all') params.append('meeting_status', filterStatus);
      if (filterCategory !== 'all') params.append('meeting_category', filterCategory);
      params.append('limit', '50');
      params.append('sort', 'meeting_date');
      params.append('order', 'desc');

      const result = await apiGet(`/hierarchical-meetings?${params.toString()}`);
      console.log('🔍 Hierarchical Meetings API Response:', result);
      return result;
    },
  });

  // Fetch meeting statistics
  const { data: statisticsData, isLoading: statisticsLoading } = useQuery({
    queryKey: ['hierarchical-meeting-statistics'],
    queryFn: async () => {
      const result = await apiGet('/hierarchical-meetings/statistics');
      console.log('🔍 Statistics API Response:', result);
      return result;
    },
  });

  // The apiGet function unwraps the response, so we access meetings directly
  const meetings: HierarchicalMeeting[] = (meetingsData as any)?.meetings || [];
  const statistics: MeetingStatistics[] = (statisticsData as any)?.statistics || [];

  console.log('📊 Meetings extracted:', meetings.length, 'meetings');
  console.log('📊 Statistics extracted:', statistics.length, 'stats');

  // Delete meeting mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: (meetingId: number) => apiDelete(`/hierarchical-meetings/${meetingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchical-meetings'] });
      setAnchorEl(null);
    },
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, meeting: HierarchicalMeeting) => {
    setSelectedMeeting(meeting);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMeeting(null);
  };

  const handleViewDetails = () => {
    if (selectedMeeting) {
      setDetailsDialogOpen(true);
      handleMenuClose();
    }
  };

  const handleEditMeeting = () => {
    if (selectedMeeting) {
      navigate(`/admin/meetings/hierarchical/${selectedMeeting.meeting_id}/edit`);
      handleMenuClose();
    }
  };

  const handleDeleteMeeting = () => {
    if (selectedMeeting && window.confirm('Are you sure you want to delete this meeting?')) {
      deleteMeetingMutation.mutate(selectedMeeting.meeting_id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Scheduled': return 'primary';
      case 'In Progress': return 'warning';
      case 'Cancelled': return 'error';
      case 'Postponed': return 'secondary';
      default: return 'default';
    }
  };

  const getHierarchyColor = (level: string) => {
    switch (level) {
      case 'National': return 'error';
      case 'Provincial': return 'warning';
      case 'Regional': return 'info';
      case 'Municipal': return 'success';
      case 'Ward': return 'secondary';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Assembly': return <Groups />;
      case 'Conference': return <Event />;
      case 'Regular': return <Schedule />;
      case 'Special': return <Star />;
      case 'Emergency': return <Alert />;
      default: return <Event />;
    }
  };

  // Filter meetings based on tab
  const filteredMeetings = meetings.filter(meeting => {
    switch (tabValue) {
      case 0: return true; // All meetings
      case 1: return meeting.meeting_status === 'Scheduled';
      case 2: return meeting.meeting_status === 'Completed';
      case 3: return meeting.meeting_status === 'In Progress';
      case 4: return ['Cancelled', 'Postponed'].includes(meeting.meeting_status);
      default: return true;
    }
  });

  // Group statistics by hierarchy level
  const groupedStatistics = statistics.reduce((acc, stat) => {
    if (!acc[stat.hierarchy_level]) {
      acc[stat.hierarchy_level] = [];
    }
    acc[stat.hierarchy_level].push(stat);
    return acc;
  }, {} as Record<string, MeetingStatistics[]>);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <PageHeader
        title="Hierarchical Meetings Management"
        subtitle="Manage organizational meetings across all hierarchy levels with automatic invitation system"
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Hierarchical Meetings' },
        ]}
        badge={{
          label: `${meetings.length} Meetings`,
          color: 'primary',
        }}
        actions={
          <Box display="flex" gap={2}>
            <ActionButton
              icon={Refresh}
              onClick={() => refetch()}
              variant="outlined"
              color="info"
            >
              Refresh
            </ActionButton>
            <ActionButton
              icon={Add}
              onClick={() => navigate('/admin/meetings/hierarchical/new')}
              gradient={true}
              vibrant={true}
            >
              Schedule Meeting
            </ActionButton>
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Statistics Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Meetings"
              value={meetings.length}
              icon={Event}
              color="primary"
              trend={{ value: 12, isPositive: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="This Week"
              value={statistics.reduce((sum, stat) => sum + (parseInt(stat.this_week_meetings, 10) || 0), 0)}
              icon={CalendarToday}
              color="success"
              trend={{ value: 8, isPositive: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Avg Attendance"
              value={`${Math.round(statistics.reduce((sum, stat) => sum + (parseFloat(stat.avg_attendance) || 0), 0) / statistics.length || 0)}%`}
              icon={People}
              color="info"
              trend={{ value: 5, isPositive: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Hierarchy Levels"
              value={Object.keys(groupedStatistics).length}
              icon={AccountTree}
              color="warning"
            />
          </Grid>
        </Grid>

        {/* Hierarchical Statistics */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment />
              Meeting Statistics by Hierarchy
            </Typography>
            
            {Object.entries(groupedStatistics).map(([hierarchyLevel, stats]) => (
              <Accordion key={hierarchyLevel}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip 
                      label={hierarchyLevel} 
                      color={getHierarchyColor(hierarchyLevel) as any}
                      size="small"
                    />
                    <Typography variant="body1">
                      {stats.reduce((sum, stat) => sum + (parseInt(stat.total_meetings, 10) || 0), 0)} meetings
                    </Typography>
                    <Box sx={{ ml: 'auto' }}>
                      <Typography variant="caption" color="text.secondary">
                        {stats.reduce((sum, stat) => sum + (parseInt(stat.completed_meetings, 10) || 0), 0)} completed
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {stats.map((stat, index) => (
                      <Grid item xs={12} md={6} lg={4} key={index}>
                        <Card variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {getCategoryIcon(stat.meeting_category)}
                            <Typography variant="subtitle2">{stat.type_name}</Typography>
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Total</Typography>
                              <Typography variant="h6">{stat.total_meetings}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Completed</Typography>
                              <Typography variant="h6">{stat.completed_meetings}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Avg Attendance</Typography>
                              <Typography variant="body2">{Math.round(stat.avg_attendance)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Avg Duration</Typography>
                              <Typography variant="body2">{Math.round(stat.avg_duration_minutes)}m</Typography>
                            </Grid>
                          </Grid>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Hierarchy Level</InputLabel>
                  <Select
                    value={filterHierarchy}
                    onChange={(e) => setFilterHierarchy(e.target.value)}
                    label="Hierarchy Level"
                  >
                    <MenuItem value="all">All Levels</MenuItem>
                    <MenuItem value="National">National</MenuItem>
                    <MenuItem value="Provincial">Provincial</MenuItem>
                    <MenuItem value="Regional">Regional</MenuItem>
                    <MenuItem value="Municipal">Municipal</MenuItem>
                    <MenuItem value="Ward">Ward</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="Draft">Draft</MenuItem>
                    <MenuItem value="Scheduled">Scheduled</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                    <MenuItem value="Postponed">Postponed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    <MenuItem value="Regular">Regular</MenuItem>
                    <MenuItem value="Assembly">Assembly</MenuItem>
                    <MenuItem value="Conference">Conference</MenuItem>
                    <MenuItem value="Special">Special</MenuItem>
                    <MenuItem value="Emergency">Emergency</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Meetings Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="meeting tabs">
              <Tab 
                label={
                  <Badge badgeContent={meetings.length} color="primary" max={999}>
                    All Meetings
                  </Badge>
                } 
              />
              <Tab 
                label={
                  <Badge 
                    badgeContent={meetings.filter(m => m.meeting_status === 'Scheduled').length} 
                    color="primary" 
                    max={999}
                  >
                    Scheduled
                  </Badge>
                } 
              />
              <Tab 
                label={
                  <Badge 
                    badgeContent={meetings.filter(m => m.meeting_status === 'Completed').length} 
                    color="success" 
                    max={999}
                  >
                    Completed
                  </Badge>
                } 
              />
              <Tab 
                label={
                  <Badge 
                    badgeContent={meetings.filter(m => m.meeting_status === 'In Progress').length} 
                    color="warning" 
                    max={999}
                  >
                    In Progress
                  </Badge>
                } 
              />
              <Tab 
                label={
                  <Badge 
                    badgeContent={meetings.filter(m => ['Cancelled', 'Postponed'].includes(m.meeting_status)).length} 
                    color="error" 
                    max={999}
                  >
                    Cancelled/Postponed
                  </Badge>
                } 
              />
            </Tabs>
          </Box>

          <CardContent>
            {meetingsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredMeetings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No meetings found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {tabValue === 0 ? 'No meetings have been scheduled yet.' :
                   tabValue === 1 ? 'No upcoming meetings scheduled.' :
                   tabValue === 2 ? 'No completed meetings found.' :
                   tabValue === 3 ? 'No meetings currently in progress.' :
                   'No cancelled or postponed meetings found.'}
                </Typography>
                <ActionButton
                  icon={Add}
                  onClick={() => navigate('/admin/meetings/hierarchical/new')}
                  gradient={true}
                  vibrant={true}
                >
                  Schedule First Meeting
                </ActionButton>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Meeting Details</TableCell>
                      <TableCell>Type & Hierarchy</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Attendance</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMeetings.map((meeting) => (
                      <TableRow key={meeting.meeting_id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              {meeting.meeting_title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              {meeting.meeting_platform === 'Virtual' && <VideoCall fontSize="small" />}
                              {meeting.meeting_platform === 'In-Person' && <LocationOn fontSize="small" />}
                              {meeting.meeting_platform === 'Hybrid' && (
                                <>
                                  <LocationOn fontSize="small" />
                                  <VideoCall fontSize="small" />
                                </>
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {meeting.location || 'Virtual Meeting'}
                              </Typography>
                            </Box>
                            {meeting.chair_name && (
                              <Typography variant="caption" color="text.secondary">
                                Chair: {meeting.chair_name}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Chip 
                              label={meeting.type_name} 
                              size="small" 
                              icon={getCategoryIcon(meeting.meeting_category)}
                            />
                            <Chip 
                              label={meeting.hierarchy_level} 
                              size="small" 
                              color={getHierarchyColor(meeting.hierarchy_level) as any}
                            />
                            {meeting.entity_name && (
                              <Typography variant="caption" color="text.secondary">
                                {meeting.entity_name}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {new Date(meeting.meeting_date).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {meeting.meeting_time} ({meeting.duration_minutes}m)
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {meeting.total_attendees || 0} / {meeting.total_invited || 0}
                            </Typography>
                            {meeting.attendance_summary && (
                              <Typography variant="caption" color="text.secondary">
                                {meeting.attendance_summary.attendance_percentage}% attendance
                              </Typography>
                            )}
                            {meeting.quorum_required > 0 && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Quorum: {meeting.quorum_achieved || 0}/{meeting.quorum_required}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Chip 
                            label={meeting.meeting_status} 
                            size="small" 
                            color={getStatusColor(meeting.meeting_status) as any}
                          />
                        </TableCell>
                        
                        <TableCell align="right">
                          <IconButton
                            onClick={(e) => handleMenuClick(e, meeting)}
                            size="small"
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleEditMeeting}>
          <Edit sx={{ mr: 1 }} />
          Edit Meeting
        </MenuItem>
        <MenuItem onClick={() => navigate(`/admin/meetings/${selectedMeeting?.meeting_id}/attendance`)}>
          <People sx={{ mr: 1 }} />
          Manage Attendance
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteMeeting} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Delete Meeting
        </MenuItem>
      </Menu>

      {/* Meeting Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Meeting Details
        </DialogTitle>
        <DialogContent>
          {selectedMeeting && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedMeeting.meeting_title}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                  <Typography variant="body2">{selectedMeeting.type_name}</Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Hierarchy Level</Typography>
                  <Typography variant="body2">{selectedMeeting.hierarchy_level}</Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Date & Time</Typography>
                  <Typography variant="body2">
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString()} at {selectedMeeting.meeting_time}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
                  <Typography variant="body2">{selectedMeeting.duration_minutes} minutes</Typography>
                </Grid>
                
                {selectedMeeting.description && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                    <Typography variant="body2">{selectedMeeting.description}</Typography>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Attendance Summary</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Chip label={`Invited: ${selectedMeeting.total_invited || 0}`} size="small" />
                    <Chip label={`Attended: ${selectedMeeting.total_attendees || 0}`} size="small" color="success" />
                    {selectedMeeting.attendance_summary && (
                      <Chip 
                        label={`${selectedMeeting.attendance_summary.attendance_percentage}% attendance`} 
                        size="small" 
                        color="info" 
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          {selectedMeeting && (
            <Button 
              variant="contained" 
              onClick={() => navigate(`/admin/meetings/${selectedMeeting.meeting_id}`)}
            >
              View Full Details
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HierarchicalMeetingsDashboard;
