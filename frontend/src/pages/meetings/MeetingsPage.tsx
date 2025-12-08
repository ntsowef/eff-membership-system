import React, { useState } from 'react';
import {
  Box,
  Typography,
  // Card,
  // CardContent,
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
  // TextField,
  // FormControl,
  // InputLabel,
  // Select,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  Container,
  useTheme,
} from '@mui/material';
import {
  Event,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  // People,
  Schedule,
  LocationOn,
  VideoCall,
  // FilterList,
  Refresh,
  CalendarToday,
  // Groups,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
// import { getMockMeetings } from '../../lib/mockMeetingsData';
import StatsCard from '../../components/ui/StatsCard';
import ActionButton from '../../components/ui/ActionButton';
import PageHeader from '../../components/ui/PageHeader';
import { devLog } from '../../utils/logger';

// Interface definitions
interface Meeting {
  id: number;
  title: string;
  description?: string;
  hierarchy_level: string;
  entity_id: number;
  meeting_type: string;
  start_datetime: string;
  end_datetime: string;
  location?: string;
  virtual_meeting_link?: string;
  meeting_status: string;
  max_attendees?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  entity_name?: string;
  attendee_count?: number;
  present_count?: number;
  absent_count?: number;
  excused_count?: number;
  late_count?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`meetings-tabpanel-${index}`}
      aria-labelledby={`meetings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MeetingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterStatus] = useState<string>('all');

  // Fetch meetings data
  const { data: meetingsData, isLoading, error, refetch } = useQuery({
    queryKey: ['meetings', filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('meeting_status', filterStatus);
      }
      params.append('limit', '50');
      params.append('sort', 'start_datetime');
      params.append('order', 'desc');

      const result = await apiGet(`/meetings?${params.toString()}`);
      devLog('✅ Meetings API Response:', result);
      return result;
    },
  });

  // Delete meeting mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: (meetingId: number) => apiDelete(`/meetings/${meetingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setDeleteDialogOpen(false);
      setSelectedMeeting(null);
    },
  });

  // Extract meetings from the API response structure
  // The apiGet function returns the full response for paginated data
  const meetings = (meetingsData as any)?.data?.meetings || (meetingsData as any)?.meetings || [];

  // Debug logging
  devLog('Meetings Data:', meetingsData);
  devLog('Extracted Meetings:', meetings);
  devLog('Meetings Length:', meetings.length);

  // Filter meetings by tab
  const getFilteredMeetings = () => {
    const now = new Date();
    switch (tabValue) {
      case 0: // All meetings
        return meetings;
      case 1: // Upcoming
        return meetings.filter((meeting: Meeting) =>
          new Date(meeting.start_datetime) >= now && meeting.meeting_status === 'Scheduled'
        );
      case 2: // Past
        return meetings.filter((meeting: Meeting) =>
          new Date(meeting.start_datetime) < now || meeting.meeting_status === 'Completed'
        );
      case 3: // Cancelled
        return meetings.filter((meeting: Meeting) => meeting.meeting_status === 'Cancelled');
      default:
        return meetings;
    }
  };

  const filteredMeetings = getFilteredMeetings();

  // Get meeting status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'primary';
      case 'in progress':
        return 'success';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      case 'postponed':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Handle menu actions
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, meeting: Meeting) => {
    setAnchorEl(event.currentTarget);
    setSelectedMeeting(meeting);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMeeting(null);
  };

  const handleViewMeeting = () => {
    if (selectedMeeting) {
      // Navigate to full detail page
      navigate(`/admin/meetings/${selectedMeeting.id}`);
    }
    handleMenuClose();
  };

  const handleEditMeeting = () => {
    if (selectedMeeting) {
      navigate(`/admin/meetings/${selectedMeeting.id}/edit`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (selectedMeeting) {
      deleteMeetingMutation.mutate(selectedMeeting.id);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Count meetings by status
  const upcomingCount = meetings.filter((m: Meeting) =>
    new Date(m.start_datetime) >= new Date() && m.meeting_status === 'Scheduled'
  ).length;

  const pastCount = meetings.filter((m: Meeting) =>
    new Date(m.start_datetime) < new Date() || m.meeting_status === 'Completed'
  ).length;

  const cancelledCount = meetings.filter((m: Meeting) =>
    m.meeting_status === 'Cancelled'
  ).length;

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load meetings. Please try again later.
        </Alert>
      </Box>
    );
  }

  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <PageHeader
        title="Meetings Management"
        subtitle="Schedule, manage, and track organizational meetings across all hierarchy levels"
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Meetings' },
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
              onClick={() => navigate('/admin/meetings/new')}
              gradient={true}
              vibrant={true}
            >
              Schedule Meeting
            </ActionButton>
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ pb: 4 }}>
        {/* Stats Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Meetings"
              value={meetings.length.toString()}
              subtitle="All scheduled meetings"
              icon={Event}
              color="primary"
              trend={{
                value: 15,
                isPositive: true,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Upcoming"
              value={upcomingCount.toString()}
              subtitle="Scheduled meetings"
              icon={Schedule}
              color="success"
              trend={{
                value: 8,
                isPositive: true,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Past Meetings"
              value={pastCount.toString()}
              subtitle="Completed meetings"
              icon={CalendarToday}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Cancelled"
              value={cancelledCount.toString()}
              subtitle="Cancelled meetings"
              icon={Event}
              color="error"
              trend={{
                value: 2,
                isPositive: false,
              }}
            />
          </Grid>
        </Grid>



        {/* Meetings Table */}
        <Paper
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: theme.palette.background.paper }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="meetings tabs"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '1rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                  },
                },
              }}
            >
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Event />
                    All Meetings
                  </Box>
                }
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Schedule />
                    <Badge badgeContent={upcomingCount} color="success">
                      Upcoming
                    </Badge>
                  </Box>
                }
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <CalendarToday />
                    <Badge badgeContent={pastCount} color="info">
                      Past
                    </Badge>
                  </Box>
                }
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Event />
                    <Badge badgeContent={cancelledCount} color="error">
                      Cancelled
                    </Badge>
                  </Box>
                }
              />
            </Tabs>
          </Box>

          {/* All Meetings Tab */}
          <TabPanel value={tabValue} index={0}>
            {isLoading ? (
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
                  No meetings have been scheduled yet.
                </Typography>
                <ActionButton
                  icon={Add}
                  onClick={() => navigate('/admin/meetings/new')}
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
                      <TableCell>Meeting</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Attendees</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMeetings.map((meeting: Meeting) => (
                      <TableRow key={meeting.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {meeting.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {meeting.hierarchy_level} • {meeting.entity_name || `Entity ${meeting.entity_id}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {new Date(meeting.start_datetime).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(meeting.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(meeting.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.meeting_type || 'Regular'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.meeting_status}
                            size="small"
                            color={getStatusColor(meeting.meeting_status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {meeting.location && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationOn sx={{ fontSize: 16 }} />
                                <Typography variant="caption">{meeting.location}</Typography>
                              </Box>
                            )}
                            {meeting.virtual_meeting_link && (
                              <VideoCall sx={{ fontSize: 16, color: 'primary.main' }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {meeting.present_count || 0} / {meeting.max_attendees || 0}
                          </Typography>
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
          </TabPanel>

          {/* Upcoming Meetings Tab */}
          <TabPanel value={tabValue} index={1}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredMeetings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Schedule sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No upcoming meetings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  No upcoming meetings scheduled.
                </Typography>
                <ActionButton
                  icon={Add}
                  onClick={() => navigate('/admin/meetings/new')}
                  gradient={true}
                  vibrant={true}
                >
                  Schedule Meeting
                </ActionButton>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Meeting</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Attendees</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMeetings.map((meeting: Meeting) => (
                      <TableRow key={meeting.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {meeting.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {meeting.hierarchy_level} • {meeting.entity_name || `Entity ${meeting.entity_id}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {new Date(meeting.start_datetime).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(meeting.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(meeting.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.meeting_type || 'Regular'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.meeting_status}
                            size="small"
                            color={getStatusColor(meeting.meeting_status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {meeting.location && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationOn sx={{ fontSize: 16 }} />
                                <Typography variant="caption">{meeting.location}</Typography>
                              </Box>
                            )}
                            {meeting.virtual_meeting_link && (
                              <VideoCall sx={{ fontSize: 16, color: 'primary.main' }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {meeting.present_count || 0} / {meeting.max_attendees || 0}
                          </Typography>
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
          </TabPanel>

          {/* Past Meetings Tab */}
          <TabPanel value={tabValue} index={2}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredMeetings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CalendarToday sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No past meetings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  No past meetings found.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Meeting</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Attendees</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMeetings.map((meeting: Meeting) => (
                      <TableRow key={meeting.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {meeting.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {meeting.hierarchy_level} • {meeting.entity_name || `Entity ${meeting.entity_id}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {new Date(meeting.start_datetime).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(meeting.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(meeting.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.meeting_type || 'Regular'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.meeting_status}
                            size="small"
                            color={getStatusColor(meeting.meeting_status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {meeting.location && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationOn sx={{ fontSize: 16 }} />
                                <Typography variant="caption">{meeting.location}</Typography>
                              </Box>
                            )}
                            {meeting.virtual_meeting_link && (
                              <VideoCall sx={{ fontSize: 16, color: 'primary.main' }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {meeting.present_count || 0} / {meeting.max_attendees || 0}
                          </Typography>
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
          </TabPanel>

          {/* Cancelled Meetings Tab */}
          <TabPanel value={tabValue} index={3}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredMeetings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No cancelled meetings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  No cancelled meetings found.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Meeting</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Attendees</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMeetings.map((meeting: Meeting) => (
                      <TableRow key={meeting.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {meeting.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {meeting.hierarchy_level} • {meeting.entity_name || `Entity ${meeting.entity_id}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {new Date(meeting.start_datetime).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(meeting.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(meeting.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.meeting_type || 'Regular'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.meeting_status}
                            size="small"
                            color={getStatusColor(meeting.meeting_status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {meeting.location && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationOn sx={{ fontSize: 16 }} />
                                <Typography variant="caption">{meeting.location}</Typography>
                              </Box>
                            )}
                            {meeting.virtual_meeting_link && (
                              <VideoCall sx={{ fontSize: 16, color: 'primary.main' }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {meeting.present_count || 0} / {meeting.max_attendees || 0}
                          </Typography>
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
          </TabPanel>
        </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleViewMeeting}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleEditMeeting}>
          <Edit sx={{ mr: 1 }} />
          Edit Meeting
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Delete Meeting
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Meeting</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedMeeting?.title}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMeetingMutation.isPending}
          >
            {deleteMeetingMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default MeetingsPage;
