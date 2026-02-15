import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  useTheme,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Breadcrumbs,
  Link,
  LinearProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  // LocationCity,
  People,
  HowToVote,
  Warning,
  CheckCircle,
  Error,
  Info,
  NavigateNext,
  // Person,
  Assessment
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

interface WardDetailAudit {
  ward: {
    ward_code: string;
    ward_name: string;
    municipality_code: string;
    municipality_name: string;
    total_members: number;
    active_members: number;
    registered_voters: number;
    unregistered_voters: number;
    incorrect_ward_assignments: number;
    membership_threshold_met: boolean;
    threshold_percentage: number;
    issues_count: number;
  };
  members: Array<{
    member_id: number;
    membership_number: string;
    first_name: string;
    last_name: string;
    email: string;
    membership_status: string;
    is_active: boolean;
    voting_district_code?: string;
    voting_district_name?: string;
    voter_status?: string;
    issue_type: string;
    issue_description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  summary: {
    total_members: number;
    issues_by_type: Record<string, number>;
    issues_by_severity: Record<string, number>;
  };
}

const WardDetailAudit: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { wardCode } = useParams<{ wardCode: string }>();

  // Fetch ward detail audit data from ward-membership-audit API
  const { data: auditData, isLoading } = useQuery({
    queryKey: ['ward-detail-audit', wardCode],
    queryFn: async () => {
      // Use ward-membership-audit API which has real data
      const response = await api.get(`/audit/ward-membership/ward/${wardCode}/details`);
      const responseData = response.data?.data;
      const wardInfo = responseData?.ward_info;

      if (!wardInfo) return null;

      const voterStats = responseData?.voter_stats || { registered_voters: 0, unregistered_voters: 0 };
      const membersArr = responseData?.members || [];

      // Map response to expected WardDetailAudit format
      return {
        ward: {
          ward_code: wardInfo.ward_code,
          ward_name: wardInfo.ward_name,
          municipality_code: wardInfo.municipality_code,
          municipality_name: wardInfo.municipality_name,
          total_members: wardInfo.total_members,
          active_members: wardInfo.active_members,
          registered_voters: voterStats.registered_voters,
          unregistered_voters: voterStats.unregistered_voters,
          incorrect_ward_assignments: 0,
          membership_threshold_met: wardInfo.standing_level <= 2,
          threshold_percentage: wardInfo.target_achievement_percentage,
          issues_count: wardInfo.standing_level === 3 ? wardInfo.members_needed_next_level : 0
        },
        members: membersArr.map((m: any) => ({
          member_id: m.member_id,
          membership_number: m.membership_number,
          first_name: m.first_name,
          last_name: m.last_name,
          email: m.email,
          membership_status: m.membership_status,
          is_active: m.is_active,
          voting_district_code: m.voting_district_code,
          voting_district_name: m.voting_district_name,
          voter_status: m.voter_status,
          issue_type: m.issue_type,
          issue_description: m.issue_description,
          severity: m.severity
        })),
        summary: {
          total_members: wardInfo.total_members,
          issues_by_type: {
            active: wardInfo.active_members,
            expired: wardInfo.expired_members,
            inactive: wardInfo.inactive_members
          },
          issues_by_severity: wardInfo.standing_level === 3
            ? { 'Needs Improvement': wardInfo.members_needed_next_level }
            : wardInfo.standing_level === 2
              ? { 'Acceptable': wardInfo.active_members }
              : { 'Good Standing': wardInfo.active_members }
        }
      } as WardDetailAudit;
    },
    enabled: !!wardCode,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Error fontSize="small" />;
      case 'high': return <Warning fontSize="small" />;
      case 'medium': return <Info fontSize="small" />;
      case 'low': return <CheckCircle fontSize="small" />;
      default: return <Info fontSize="small" />;
    }
  };

  const getIssueTypeLabel = (issueType: string) => {
    switch (issueType) {
      case 'inactive_membership': return 'Inactive Membership';
      case 'no_voting_registration': return 'Not Registered to Vote';
      case 'incorrect_ward_assignment': return 'Incorrect Ward Assignment';
      case 'valid': return 'No Issues';
      default: return issueType;
    }
  };

  const getThresholdColor = (percentage: number) => {
    if (percentage >= 100) return theme.palette.success.main;
    if (percentage >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!auditData?.ward) {
    return (
      <Container maxWidth="xl">
        <Box py={3}>
          <Alert severity="error">
            Ward not found or no audit data available for ward code: {wardCode}
          </Alert>
        </Box>
      </Container>
    );
  }

  const { ward, members, summary } = auditData;

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 2 }}>
          <Link
            color="inherit"
            href="#"
            onClick={() => navigate('/admin/audit')}
            sx={{ textDecoration: 'none' }}
          >
            Audit Dashboard
          </Link>
          <Link
            color="inherit"
            href="#"
            onClick={() => navigate('/admin/audit/wards')}
            sx={{ textDecoration: 'none' }}
          >
            Ward Audit Report
          </Link>
          <Typography color="text.primary">{ward.ward_name}</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {ward.ward_name} - Detailed Audit
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ward Code: {ward.ward_code} | Municipality: {ward.municipality_name}
          </Typography>
        </Box>

        {/* Ward Overview Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                    <People />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{ward.total_members.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Members
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ward.active_members} active
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
                  <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                    <HowToVote />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{ward.registered_voters.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Registered Voters
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ward.unregistered_voters} unregistered
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
                  <Avatar sx={{ bgcolor: getThresholdColor(ward.threshold_percentage) }}>
                    <Assessment />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{ward.threshold_percentage.toFixed(1)}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Threshold Progress
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(ward.threshold_percentage, 100)}
                      sx={{
                        mt: 1,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: theme.palette.grey[200],
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getThresholdColor(ward.threshold_percentage)
                        }
                      }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: ward.issues_count > 0 ? theme.palette.error.main : theme.palette.success.main }}>
                    {ward.issues_count > 0 ? <Warning /> : <CheckCircle />}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{ward.issues_count.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Issues
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ward.incorrect_ward_assignments} incorrect assignments
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Threshold Status Alert */}
        {!ward.membership_threshold_met && (
          <Alert 
            severity={ward.threshold_percentage >= 70 ? "warning" : "error"} 
            sx={{ mb: 3 }}
          >
            <Typography variant="body1" fontWeight="bold">
              Ward has not met the 101 member threshold
            </Typography>
            <Typography variant="body2">
              Current membership: {ward.total_members} members ({ward.threshold_percentage.toFixed(1)}% of threshold)
              {ward.threshold_percentage >= 70 && " - Close to meeting threshold"}
            </Typography>
          </Alert>
        )}

        {/* Issues Summary */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Issues by Type
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  {Object.entries(summary.issues_by_type).map(([type, count]) => (
                    <Box key={type} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">
                        {getIssueTypeLabel(type)}
                      </Typography>
                      <Chip label={count} size="small" />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Issues by Severity
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  {Object.entries(summary.issues_by_severity).map(([severity, count]) => (
                    <Box key={severity} display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center" gap={1}>
                        {getSeverityIcon(severity)}
                        <Typography variant="body2">
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </Typography>
                      </Box>
                      <Chip 
                        label={count} 
                        color={getSeverityColor(severity) as any}
                        size="small" 
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Member Details Table */}
        <Paper>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              Member Details ({members.length} members)
            </Typography>
          </Box>
          <Divider />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Membership Status</TableCell>
                  <TableCell>Voter Status</TableCell>
                  <TableCell>Voting District</TableCell>
                  <TableCell>Issue</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.member_id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {member.first_name} {member.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.membership_number}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {member.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.membership_status}
                        color={member.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.voter_status || 'Unknown'}
                        color={member.voter_status === 'Registered' ? 'success' : 'warning'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {member.voting_district_code ? (
                        <Box>
                          <Typography variant="body2">
                            {member.voting_district_name || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.voting_district_code}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not Registered
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {getIssueTypeLabel(member.issue_type)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.issue_description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getSeverityIcon(member.severity)}
                        label={member.severity.toUpperCase()}
                        color={getSeverityColor(member.severity) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => navigate(`/admin/members/${member.member_id}`)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Container>
  );
};

export default WardDetailAudit;
