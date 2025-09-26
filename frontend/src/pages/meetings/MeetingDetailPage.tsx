import React from 'react';
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
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Edit,
  Delete,
  LocationOn,
  VideoCall,
  People,
  Schedule,
  ArrowBack,
  Description,
  CheckCircle,
  Cancel,
  HelpOutline,
  PersonAdd,
  Email,
  Phone,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete } from '../../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { getMockMeetingById } from '../../lib/mockMeetingsData';

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
  objectives?: string;
}

const MeetingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch meeting details
  const { data: meetingData, isLoading, error } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      try {
        const result = await apiGet(`/meetings/${id}`);
        console.log('Meeting Detail API Response:', result);
        return result;
      } catch (error) {
        // Fallback to mock data for development when API fails
        console.log('API failed, using mock meeting data for development', error);
        return getMockMeetingById(parseInt(id || '1'));
      }
    },
    enabled: !!id,
  });

  // Fetch meeting attendance/invitees
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['meeting-attendance', id],
    queryFn: async () => {
      try {
        return await apiGet(`/meetings/${id}/attendance`);
      } catch (error) {
        console.log('Failed to fetch attendance data:', error);
        return { data: { attendance: [], summary: { total_attendees: 0, present: 0, absent: 0, excused: 0, late: 0 } } };
      }
    },
    enabled: !!id,
  });

  // Delete meeting mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: async () => {
      return await apiDelete(`/meetings/${id}`);
    },
    onSuccess: () => {
      // Invalidate meetings queries
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });

      // Navigate back to meetings list
      navigate('/admin/meetings');
    },
    onError: (error) => {
      console.error('Failed to delete meeting:', error);
      // You could add a toast notification here
    },
  });

  // Extract meeting from the API response structure
  // The apiGet function returns response.data.data for standard API responses
  const meeting = (meetingData as any)?.meeting || (meetingData as any)?.data?.meeting as Meeting;

  // Debug logging
  console.log('Meeting Data:', meetingData);
  console.log('Extracted Meeting:', meeting);

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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !meeting) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load meeting details. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/meetings')}
          sx={{ mr: 2 }}
        >
          Back to Meetings
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            {meeting.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {meeting.hierarchy_level} Meeting • {meeting.entity_name || `Entity ${meeting.entity_id}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Description />}
            onClick={() => navigate(`/admin/meetings/${meeting.id}/documents`)}
            sx={{ mr: 1 }}
          >
            Documents
          </Button>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/admin/meetings/${meeting.id}/edit`)}
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
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Meeting Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Meeting Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={meeting.meeting_status}
                      color={getStatusColor(meeting.meeting_status) as any}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Meeting Type
                    </Typography>
                    <Typography variant="body1">
                      {meeting.meeting_type || 'Regular'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Date & Time
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Schedule sx={{ fontSize: 16 }} />
                      <Typography variant="body1">
                        {new Date(meeting.start_datetime).toLocaleDateString()} at {new Date(meeting.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {` - ${new Date(meeting.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Duration
                    </Typography>
                    <Typography variant="body1">
                      {Math.round((new Date(meeting.end_datetime).getTime() - new Date(meeting.start_datetime).getTime()) / (1000 * 60))} minutes
                    </Typography>
                  </Box>
                </Grid>

                {meeting.location && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Location
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <LocationOn sx={{ fontSize: 16 }} />
                        <Typography variant="body1">
                          {meeting.location}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}

                {meeting.virtual_meeting_link && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Virtual Meeting
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <VideoCall sx={{ fontSize: 16 }} />
                        <Button
                          variant="text"
                          size="small"
                          href={meeting.virtual_meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Join Meeting
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                )}

                {meeting.description && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Description
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {meeting.description}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {meeting.objectives && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Objectives
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {meeting.objectives}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Meeting Invitees & Attendance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Meeting Invitees & Attendance
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<PersonAdd />}
                  size="small"
                  onClick={() => {
                    // TODO: Add invite members functionality
                    console.log('Invite members clicked');
                  }}
                >
                  Invite Members
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {attendanceLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Loading attendance data...
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Attendance Summary */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3} md={2.4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                        <CheckCircle sx={{ color: 'success.main', mb: 1 }} />
                        <Typography variant="h6" color="success.main">
                          {(attendanceData as any)?.data?.attendance?.filter((a: any) => a.attendance_status === 'Present').length || 0}
                        </Typography>
                        <Typography variant="caption">Present</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3} md={2.4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                        <Cancel sx={{ color: 'error.main', mb: 1 }} />
                        <Typography variant="h6" color="error.main">
                          {(attendanceData as any)?.data?.attendance?.filter((a: any) => a.attendance_status === 'Absent').length || 0}
                        </Typography>
                        <Typography variant="caption">Absent</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3} md={2.4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                        <Schedule sx={{ color: 'warning.main', mb: 1 }} />
                        <Typography variant="h6" color="warning.main">
                          {(attendanceData as any)?.data?.attendance?.filter((a: any) => a.attendance_status === 'Late').length || 0}
                        </Typography>
                        <Typography variant="caption">Late</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3} md={2.4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                        <HelpOutline sx={{ color: 'info.main', mb: 1 }} />
                        <Typography variant="h6" color="info.main">
                          {(attendanceData as any)?.data?.attendance?.filter((a: any) => a.attendance_status === 'Excused').length || 0}
                        </Typography>
                        <Typography variant="caption">Excused</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={2.4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <People sx={{ color: 'text.primary', mb: 1 }} />
                        <Typography variant="h6" color="text.primary">
                          {(attendanceData as any)?.data?.attendance?.length || 0}
                        </Typography>
                        <Typography variant="caption">Total</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Invitees List */}
                  {(attendanceData as any)?.data?.attendance && (attendanceData as any).data.attendance.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Member</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Invitation Status</TableCell>
                            <TableCell>RSVP Status</TableCell>
                            <TableCell>Contact</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(attendanceData as any).data.attendance.map((attendee: any) => (
                            <TableRow key={attendee.member_id} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar sx={{ width: 32, height: 32 }}>
                                    {attendee.member_name ? attendee.member_name.charAt(0) : 'M'}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                      {attendee.member_name || 'Unknown Member'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      ID: {attendee.member_id_number || attendee.member_id}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label="Member"
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label="Invited"
                                  size="small"
                                  color="info"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={attendee.attendance_status || 'Unknown'}
                                  size="small"
                                  color={
                                    attendee.attendance_status === 'Present' ? 'success' :
                                    attendee.attendance_status === 'Absent' ? 'error' :
                                    attendee.attendance_status === 'Late' ? 'warning' :
                                    attendee.attendance_status === 'Excused' ? 'info' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Tooltip title="Send Email">
                                    <IconButton size="small">
                                      <Email fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Send SMS">
                                    <IconButton size="small">
                                      <Phone fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    // TODO: Add resend invitation functionality
                                    console.log('Resend invitation to:', attendee.member_id);
                                  }}
                                >
                                  Resend
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <People sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Invitees Yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        This meeting doesn't have any invitees yet. Click "Invite Members" to add attendees.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={() => {
                          // TODO: Add invite members functionality
                          console.log('Invite members clicked');
                        }}
                      >
                        Invite Members
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Meeting Metadata */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Meeting Details
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Max Attendees
                </Typography>
                <Typography variant="body1">
                  {meeting.max_attendees || 'Not specified'}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created By
                </Typography>
                <Typography variant="body1">
                  {meeting.creator_name || `User ${meeting.created_by}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(meeting.created_at).toLocaleDateString()}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(meeting.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Meeting
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the meeting "{meeting?.title}"?
            This action cannot be undone and will also remove all associated attendance records.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            disabled={deleteMeetingMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMeetingMutation.isPending}
            startIcon={deleteMeetingMutation.isPending ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleteMeetingMutation.isPending ? 'Deleting...' : 'Delete Meeting'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MeetingDetailPage;
