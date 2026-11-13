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
  meeting_id?: number;
  title: string;
  meeting_title?: string;
  description?: string;
  hierarchy_level: string;
  entity_id: number;
  meeting_type: string;
  type_name?: string;
  meeting_category?: string;
  start_datetime: string;
  end_datetime: string;
  meeting_date?: string;
  meeting_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  virtual_meeting_link?: string;
  meeting_status: string;
  max_attendees?: number;
  quorum_required?: number;
  total_invited?: number;
  total_attendees?: number;
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

// Helper to resolve start and end Date objects from either start_datetime/end_datetime or meeting_date/meeting_time
const getMeetingDates = (meeting: Meeting): { start: Date | null; end: Date | null } => {
  if (meeting.start_datetime) {
    const start = new Date(meeting.start_datetime);
    if (!isNaN(start.getTime())) {
      const end = meeting.end_datetime ? new Date(meeting.end_datetime) : null;
      return {
        start,
        end: end && !isNaN(end.getTime())
          ? end
          : new Date(start.getTime() + (Number(meeting.duration_minutes) || 60) * 60000),
      };
    }
  }

  if (meeting.meeting_date) {
    let year: number, month: number, day: number;
    const rawDate = String(meeting.meeting_date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      [year, month, day] = rawDate.split('-').map(Number);
    } else {
      const parsed = new Date(rawDate);
      if (isNaN(parsed.getTime())) return { start: null, end: null };
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }

    const rawTime = meeting.meeting_time ? String(meeting.meeting_time) : '00:00:00';
    const [hours = 0, minutes = 0, seconds = 0] = rawTime.split(':').map(Number);
    const start = new Date(year, month - 1, day, hours, minutes, seconds);

    let end: Date | null = null;
    if (meeting.end_time) {
      const [eh = 0, em = 0, es = 0] = String(meeting.end_time).split(':').map(Number);
      end = new Date(year, month - 1, day, eh, em, es);
    } else {
      const durationMins = Number(meeting.duration_minutes) || 60;
      end = new Date(start.getTime() + durationMins * 60000);
    }

    return { start, end };
  }

  return { start: null, end: null };
};

const formatMeetingDate = (meeting: Meeting): string => {
  const { start } = getMeetingDates(meeting);
  if (!start) return 'N/A';
  return start.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatMeetingTimeRange = (meeting: Meeting): string => {
  const { start, end } = getMeetingDates(meeting);
  if (!start) return 'N/A';
  const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (!end) return startStr;
  const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${startStr} - ${endStr}`;
};

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
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
      queryClient.invalidateQueries({ queryKey: ['hierarchical-meetings'] });
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
      setSelectedMeeting(null);
      setDeleteError(null);
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete meeting. Please try again.';
      setDeleteError(message);
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
        return meetings.filter((meeting: Meeting) => {
          const { start } = getMeetingDates(meeting);
          return (start ? start >= now : true) && meeting.meeting_status === 'Scheduled';
        });
      case 2: // Past
        return meetings.filter((meeting: Meeting) => {
          const { start } = getMeetingDates(meeting);
          return (start ? start < now : false) || meeting.meeting_status === 'Completed';
        });
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
      const meetingId = selectedMeeting.id || selectedMeeting.meeting_id;
      navigate(`/admin/meetings/${meetingId}`);
    }
    handleMenuClose();
  };

  const handleEditMeeting = () => {
    if (selectedMeeting) {
      const meetingId = selectedMeeting.id || selectedMeeting.meeting_id;
      navigate(`/admin/meetings/${meetingId}/edit`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedMeeting) {
      setMeetingToDelete(selectedMeeting);
      setDeleteError(null);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteCancel = () => {
    if (deleteMeetingMutation.isPending) return;
    setDeleteDialogOpen(false);
    setMeetingToDelete(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = () => {
    if (!meetingToDelete) return;
    const meetingId = Number(meetingToDelete.id ?? meetingToDelete.meeting_id);
    if (!isNaN(meetingId) && meetingId > 0) {
      setDeleteError(null);
      deleteMeetingMutation.mutate(meetingId);
    } else {
      setDeleteError('Invalid meeting ID.');
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Count meetings by status
  const upcomingCount = meetings.filter((m: Meeting) => {
    const { start } = getMeetingDates(m);
    return (start ? start >= new Date() : true) && m.meeting_status === 'Scheduled';
  }).length;

  const pastCount = meetings.filter((m: Meeting) => {
    const { start } = getMeetingDates(m);
    return (start ? start < new Date() : false) || m.meeting_status === 'Completed';
  }).length;

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
                      <TableRow key={meeting.id || meeting.meeting_id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {meeting.title || meeting.meeting_title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {meeting.hierarchy_level} • {meeting.entity_name || `Entity ${meeting.entity_id}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {formatMeetingDate(meeting)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatMeetingTimeRange(meeting)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.type_name || meeting.meeting_type || meeting.meeting_category || 'Regular'}
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
                            {meeting.present_count ?? meeting.total_attendees ?? 0} / {meeting.max_attendees ?? meeting.total_invited ?? meeting.quorum_required ?? 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            aria-label={`Actions for ${meeting.title || meeting.meeting_title || 'meeting'}`}
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
                      <TableRow key={meeting.id || meeting.meeting_id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {meeting.title || meeting.meeting_title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {meeting.hierarchy_level} • {meeting.entity_name || `Entity ${meeting.entity_id}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {formatMeetingDate(meeting)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatMeetingTimeRange(meeting)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.type_name || meeting.meeting_type || meeting.meeting_category || 'Regular'}
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
                            {meeting.present_count ?? meeting.total_attendees ?? 0} / {meeting.max_attendees ?? meeting.total_invited ?? meeting.quorum_required ?? 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            aria-label={`Actions for ${meeting.title || meeting.meeting_title || 'meeting'}`}
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
                      <TableRow key={meeting.id || meeting.meeting_id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {meeting.title || meeting.meeting_title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {meeting.hierarchy_level} • {meeting.entity_name || `Entity ${meeting.entity_id}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {formatMeetingDate(meeting)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatMeetingTimeRange(meeting)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.type_name || meeting.meeting_type || meeting.meeting_category || 'Regular'}
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
                            {meeting.present_count ?? meeting.total_attendees ?? 0} / {meeting.max_attendees ?? meeting.total_invited ?? meeting.quorum_required ?? 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            aria-label={`Actions for ${meeting.title || meeting.meeting_title || 'meeting'}`}
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
                      <TableRow key={meeting.id || meeting.meeting_id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {meeting.title || meeting.meeting_title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {meeting.hierarchy_level} • {meeting.entity_name || `Entity ${meeting.entity_id}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {formatMeetingDate(meeting)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatMeetingTimeRange(meeting)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meeting.type_name || meeting.meeting_type || meeting.meeting_category || 'Regular'}
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
                            {meeting.present_count ?? meeting.total_attendees ?? 0} / {meeting.max_attendees ?? meeting.total_invited ?? meeting.quorum_required ?? 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            aria-label={`Actions for ${meeting.title || meeting.meeting_title || 'meeting'}`}
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
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Meeting</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography>
            Are you sure you want to delete "{meetingToDelete?.title || meetingToDelete?.meeting_title || 'this meeting'}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleteMeetingMutation.isPending}>
            Cancel
          </Button>
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
