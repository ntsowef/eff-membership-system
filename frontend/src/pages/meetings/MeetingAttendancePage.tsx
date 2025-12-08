import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon
} from '@mui/icons-material';
import { apiGet } from '../../lib/api';

interface AttendanceRecord {
  invitation_id: number;
  meeting_id: number;
  member_id: number;
  member_name: string | null;
  member_number: string;
  email: string | null;
  phone: string | null;
  invitation_status: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
  response_message: string | null;
  created_by_name: string;
}

interface AttendanceSummary {
  total_attendees: number;
  present: number;
  absent: number;
  excused: number;
  late: number;
  sent: number;
  delivered: number;
  opened: number;
  accepted: number;
  declined: number;
  tentative: number;
  no_response: number;
  pending: number;
}

interface MeetingInfo {
  id: number;
  title: string;
  meeting_date: string;
}

interface AttendanceData {
  meeting: MeetingInfo;
  attendance: AttendanceRecord[];
  summary: AttendanceSummary;
}

const MeetingAttendancePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch attendance data
  const { data: attendanceData, isLoading, error } = useQuery({
    queryKey: ['meeting-attendance', id],
    queryFn: async () => {
      const result = await apiGet(`/meetings/${id}/attendance`);
      console.log('📊 Attendance API Response:', result);
      return result as AttendanceData;
    },
    enabled: !!id && id !== 'undefined'
  });

  const meeting = attendanceData?.meeting;
  const attendance = attendanceData?.attendance || [];
  const summary = attendanceData?.summary;

  // Get status color
  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' => {
    switch (status?.toLowerCase()) {
      case 'sent': return 'primary';
      case 'delivered': return 'info';
      case 'opened': return 'secondary';
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'tentative': return 'warning';
      case 'no response': return 'default';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string): React.ReactElement | undefined => {
    switch (status?.toLowerCase()) {
      case 'sent': return <EmailIcon fontSize="small" />;
      case 'delivered': return <CheckCircleIcon fontSize="small" />;
      case 'opened': return <VisibilityIcon fontSize="small" />;
      case 'accepted': return <ThumbUpIcon fontSize="small" />;
      case 'declined': return <ThumbDownIcon fontSize="small" />;
      case 'tentative': return <HourglassEmptyIcon fontSize="small" />;
      default: return undefined;
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load attendance data. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate('/admin/meetings')}
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          Meetings
        </Link>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate(`/admin/meetings/${id}`)}
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          {meeting?.title || `Meeting ${id}`}
        </Link>
        <Typography color="text.primary">Attendance</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Meeting Attendance
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {meeting?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {meeting?.meeting_date && new Date(meeting.meeting_date).toLocaleDateString('en-ZA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/admin/meetings/${id}`)}
        >
          Back to Meeting
        </Button>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Invited
                </Typography>
                <Typography variant="h4">{summary.total_attendees}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Accepted
                </Typography>
                <Typography variant="h4">{summary.accepted}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Declined
                </Typography>
                <Typography variant="h4">{summary.declined}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Pending
                </Typography>
                <Typography variant="h4">{summary.pending}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Invitation Status Breakdown */}
      {summary && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Invitation Status Breakdown
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={2}>
              <Box textAlign="center">
                <Typography variant="h5" color="primary">{summary.sent}</Typography>
                <Typography variant="caption">Sent</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Box textAlign="center">
                <Typography variant="h5" color="info.main">{summary.delivered}</Typography>
                <Typography variant="caption">Delivered</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Box textAlign="center">
                <Typography variant="h5" color="secondary.main">{summary.opened}</Typography>
                <Typography variant="caption">Opened</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Box textAlign="center">
                <Typography variant="h5" color="success.main">{summary.accepted}</Typography>
                <Typography variant="caption">Accepted</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Box textAlign="center">
                <Typography variant="h5" color="error.main">{summary.declined}</Typography>
                <Typography variant="caption">Declined</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Box textAlign="center">
                <Typography variant="h5" color="warning.main">{summary.tentative}</Typography>
                <Typography variant="caption">Tentative</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Attendance Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member Number</TableCell>
                <TableCell>Member Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Invitation Status</TableCell>
                <TableCell>Sent At</TableCell>
                <TableCell>Responded At</TableCell>
                <TableCell>Invited By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No attendance records found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((record) => (
                  <TableRow key={record.invitation_id} hover>
                    <TableCell>{record.member_number}</TableCell>
                    <TableCell>{record.member_name || 'N/A'}</TableCell>
                    <TableCell>
                      {record.phone && (
                        <Typography variant="body2">{record.phone}</Typography>
                      )}
                      {record.email && (
                        <Typography variant="caption" color="text.secondary">
                          {record.email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(record.invitation_status)}
                        label={record.invitation_status || 'Unknown'}
                        color={getStatusColor(record.invitation_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {record.sent_at
                        ? new Date(record.sent_at).toLocaleString('en-ZA')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {record.responded_at
                        ? new Date(record.responded_at).toLocaleString('en-ZA')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{record.created_by_name || 'System'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default MeetingAttendancePage;

