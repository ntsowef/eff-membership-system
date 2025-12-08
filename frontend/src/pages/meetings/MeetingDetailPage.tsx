import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Stack,
} from '@mui/material';
import {
  Edit,
  Delete,
  LocationOn,
  VideoCall,
  People,
  // Schedule,
  ArrowBack,
  Description,
  CheckCircle,
  Cancel,
  HelpOutline,
  PersonAdd,
  Email,
  Phone,
  CalendarToday,
  AccessTime,
  Group,
  Assignment,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete } from '../../lib/api';
import { useParams, useNavigate } from 'react-router-dom';

interface Meeting {
  meeting_id: number;
  meeting_title: string;
  meeting_type_id: number;
  hierarchy_level: string;
  entity_id: number;
  meeting_date: string;
  meeting_time: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  virtual_meeting_link?: string;
  meeting_platform?: string;
  meeting_status: string;
  description?: string;
  objectives?: string;
  quorum_required?: number;
  quorum_achieved?: number;
  total_attendees?: number;
  meeting_chair_id?: number;
  meeting_secretary_id?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  entity_name?: string;
  type_name?: string;
  attendee_count?: string | number;
  present_count?: string | number;
  absent_count?: string | number;
  excused_count?: string | number;
  late_count?: string | number;
}

const MeetingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Validate meeting ID
  const isValidId = id && id !== 'undefined' && id !== 'null' && !isNaN(parseInt(id));

  // Redirect if invalid ID
  React.useEffect(() => {
    if (!isValidId) {
      console.error('Invalid meeting ID:', id);
      navigate('/admin/meetings');
    }
  }, [id, isValidId, navigate]);

  // Fetch meeting details
  const { data: meetingData, isLoading, error } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      const result = await apiGet(`/meetings/${id}`);
      console.log('✅ Meeting Detail API Response:', result);
      console.log('✅ Response structure:', JSON.stringify(result, null, 2));
      return result;
    },
    enabled: isValidId as any,
  });

  // Fetch meeting attendance/invitees
  const { data: attendanceData } = useQuery({
    queryKey: ['meeting-attendance', id],
    queryFn: async () => {
      try {
        return await apiGet(`/meetings/${id}/attendance`);
      } catch (error) {
        console.log('Failed to fetch attendance data:', error);
        return { data: { attendance: [], summary: { total_attendees: 0, present: 0, absent: 0, excused: 0, late: 0 } } };
      }
    },
    enabled: isValidId as any,
  });

  // Delete meeting mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: () => apiDelete(`/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      navigate('/admin/meetings');
    },
  });

  // Extract meeting from the API response structure
  // Backend returns: { success: true, message: "...", data: { meeting: {...} }, timestamp: "..." }
  // apiGet extracts response.data.data, so meetingData = { meeting: {...} }
  const meeting = (meetingData as any)?.meeting as Meeting | undefined;

  // Debug logging
  console.log('🔍 Meeting Data:', meetingData);
  console.log('🔍 Extracted Meeting:', meeting);
  console.log('🔍 Meeting ID:', meeting?.meeting_id);
  console.log('🔍 Meeting Title:', meeting?.meeting_title);

  // Delete handlers
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteMeetingMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  // Get meeting status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
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

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Format time
  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Get invitation status color
  const getInvitationStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return 'success';
      case 'declined':
        return 'error';
      case 'pending':
        return 'warning';
      case 'sent':
        return 'info';
      case 'delivered':
        return 'primary';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !meeting) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load meeting details. The meeting may not exist or there was an error loading the data.
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/meetings')}
          variant="contained"
        >
          Back to Meetings
        </Button>
      </Box>
    );
  }

  const attendanceSummary = (attendanceData as any)?.data?.summary || {};
  const attendanceList = (attendanceData as any)?.data?.attendance || [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/meetings')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {meeting.meeting_title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {meeting.hierarchy_level} Meeting • {meeting.entity_name || `Entity ${meeting.entity_id}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/admin/meetings/${meeting.meeting_id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDeleteClick}
            disabled={deleteMeetingMutation.isPending}
          >
            {deleteMeetingMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Stack>
      </Box>

      {/* Status Chip */}
      <Box sx={{ mb: 3 }}>
        <Chip
          label={meeting.meeting_status}
          color={getStatusColor(meeting.meeting_status)}
          sx={{ fontWeight: 'bold', fontSize: '0.9rem', px: 1 }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Main Meeting Information */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment color="primary" />
                Meeting Information
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                {/* Meeting Type */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Meeting Type
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {meeting.type_name || `Type ${meeting.meeting_type_id}`}
                  </Typography>
                </Grid>

                {/* Hierarchy Level */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Hierarchy Level
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {meeting.hierarchy_level}
                  </Typography>
                </Grid>

                {/* Meeting Date */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    <CalendarToday sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    Meeting Date
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {formatDate(meeting.meeting_date)}
                  </Typography>
                </Grid>

                {/* Meeting Time */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    <AccessTime sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    Meeting Time
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {formatTime(meeting.meeting_time)}
                    {meeting.end_time && ` - ${formatTime(meeting.end_time)}`}
                  </Typography>
                </Grid>

                {/* Duration */}
                {meeting.duration_minutes && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Duration
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {meeting.duration_minutes} minutes
                      {meeting.duration_minutes >= 60 && ` (${Math.floor(meeting.duration_minutes / 60)}h ${meeting.duration_minutes % 60}m)`}
                    </Typography>
                  </Grid>
                )}

                {/* Meeting Platform */}
                {meeting.meeting_platform && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Meeting Platform
                    </Typography>
                    <Chip
                      label={meeting.meeting_platform}
                      size="small"
                      color={meeting.meeting_platform === 'Virtual' ? 'primary' : meeting.meeting_platform === 'Hybrid' ? 'secondary' : 'default'}
                    />
                  </Grid>
                )}

                {/* Location */}
                {meeting.location && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                      Location
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {meeting.location}
                    </Typography>
                  </Grid>
                )}

                {/* Virtual Meeting Link */}
                {meeting.virtual_meeting_link && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      <VideoCall sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                      Virtual Meeting Link
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      href={meeting.virtual_meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<VideoCall />}
                    >
                      Join Meeting
                    </Button>
                  </Grid>
                )}

                {/* Quorum */}
                {meeting.quorum_required !== undefined && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Quorum Required
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {meeting.quorum_required} members
                      {meeting.quorum_achieved !== undefined && (
                        <Chip
                          label={`${meeting.quorum_achieved} achieved`}
                          size="small"
                          color={meeting.quorum_achieved >= meeting.quorum_required ? 'success' : 'warning'}
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                  </Grid>
                )}

                {/* Description */}
                {meeting.description && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                      {meeting.description}
                    </Typography>
                  </Grid>
                )}

                {/* Objectives */}
                {meeting.objectives && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Objectives
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                      {meeting.objectives}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Meeting Metadata Sidebar */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Attendance Summary */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Group color="primary" />
                  Attendance Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Invitees
                    </Typography>
                    <Chip label={attendanceSummary.total_attendees || 0} size="small" color="primary" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Accepted
                    </Typography>
                    <Chip label={attendanceSummary.accepted || 0} size="small" color="success" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Declined
                    </Typography>
                    <Chip label={attendanceSummary.declined || 0} size="small" color="error" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                    <Chip label={attendanceSummary.pending || 0} size="small" color="warning" />
                  </Box>
                </Stack>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<People />}
                  sx={{ mt: 2 }}
                  onClick={() => navigate(`/admin/meetings/${meeting.meeting_id}/attendance`)}
                >
                  View Full Attendance
                </Button>
              </CardContent>
            </Card>

            {/* Meeting Details */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Meeting Details
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Created By
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {meeting.creator_name || `User ${meeting.created_by}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(meeting.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Last Updated
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(meeting.updated_at).toLocaleString()}
                    </Typography>
                  </Box>

                  {meeting.meeting_chair_id && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Chairperson
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        Member ID: {meeting.meeting_chair_id}
                      </Typography>
                    </Box>
                  )}

                  {meeting.meeting_secretary_id && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Secretary
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        Member ID: {meeting.meeting_secretary_id}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Description />}
                    onClick={() => navigate(`/admin/meetings/${meeting.meeting_id}/documents`)}
                  >
                    View Documents
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PersonAdd />}
                    onClick={() => {
                      // TODO: Add invite members functionality
                      console.log('Invite members clicked');
                    }}
                  >
                    Invite Members
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Invitees List */}
        {attendanceList.length > 0 && (
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <People color="primary" />
                  Meeting Invitees ({attendanceList.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell><strong>Member</strong></TableCell>
                        <TableCell><strong>Member Number</strong></TableCell>
                        <TableCell><strong>Contact</strong></TableCell>
                        <TableCell><strong>Invitation Status</strong></TableCell>
                        <TableCell><strong>Sent At</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceList.map((attendee: any, index: number) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                {attendee.member_name ? attendee.member_name.charAt(0).toUpperCase() : 'M'}
                              </Avatar>
                              <Typography variant="body2" fontWeight={500}>
                                {attendee.member_name || 'Unknown'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {attendee.member_number || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              {attendee.phone_number && (
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Phone sx={{ fontSize: 12 }} />
                                  {attendee.phone_number}
                                </Typography>
                              )}
                              {attendee.email && (
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Email sx={{ fontSize: 12 }} />
                                  {attendee.email}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={attendee.invitation_status || 'Pending'}
                              size="small"
                              color={getInvitationStatusColor(attendee.invitation_status)}
                              icon={
                                attendee.invitation_status === 'Accepted' ? <CheckCircle /> :
                                attendee.invitation_status === 'Declined' ? <Cancel /> :
                                <HelpOutline />
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {attendee.sent_at ? new Date(attendee.sent_at).toLocaleString() : '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Meeting</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{meeting.meeting_title}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
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
    </Box>
  );
};

export default MeetingDetailPage;

