import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  HighlightOff as HighlightOffIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import wardAuditApi from '../../services/wardAuditApi';
import type { WardComplianceSummary, VotingDistrictCompliance } from '../../types/wardAudit';
import WardMeetingManagement from './WardMeetingManagement';
import WardDelegateManagement from './WardDelegateManagement';

const WardComplianceDetail: React.FC = () => {
  const { wardCode } = useParams<{ wardCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  
  const [showMeetingManagement, setShowMeetingManagement] = useState(false);
  const [showDelegateManagement, setShowDelegateManagement] = useState(false);

  // Fetch enhanced ward compliance data with all 5 criteria
  const {
    data: ward,
    isLoading: wardLoading,
    error: wardError
  } = useQuery({
    queryKey: ['ward-compliance-details', wardCode],
    queryFn: () => wardAuditApi.getWardComplianceDetails(wardCode!),
    enabled: !!wardCode,
  });

  // Fetch voting district compliance
  const {
    data: votingDistricts = [],
    isLoading: vdLoading
  } = useQuery({
    queryKey: ['voting-district-compliance', wardCode],
    queryFn: () => wardAuditApi.getVotingDistrictCompliance(wardCode!),
    enabled: !!wardCode,
  });
  
  // Approve compliance mutation
  const approveMutation = useMutation({
    mutationFn: (notes: string) => 
      wardAuditApi.approveWardCompliance(wardCode!, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward-compliance', wardCode] });
      queryClient.invalidateQueries({ queryKey: ['ward-audit-wards'] });
      setApproveDialogOpen(false);
      setApprovalNotes('');
    },
  });
  
  const handleApprove = () => {
    approveMutation.mutate(approvalNotes);
  };
  
  if (wardLoading || vdLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (wardError || !ward) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load ward compliance data. Please try again.
        </Alert>
      </Container>
    );
  }
  
  // Define compliance criteria with enhanced data
  const criteria = [
    {
      id: 1,
      name: 'Membership & Voting District Compliance',
      description: '≥100 members AND 50%+ voting districts have ≥10 members',
      passed: ward.criterion_1_compliant,
      details: `Total Members: ${ward.total_members} | VDs Compliant: ${ward.compliant_voting_districts}/${ward.total_voting_districts}`,
      action: null,
    },
    {
      id: 2,
      name: 'Meeting Quorum Verification',
      description: 'Ward achieved quorum in previous BPA/BGA meeting',
      passed: ward.criterion_2_passed,
      details: ward.criterion_2_data
        ? `Last meeting: ${new Date(ward.criterion_2_data.meeting_date).toLocaleDateString()} | Quorum: ${ward.criterion_2_data.quorum_achieved}/${ward.criterion_2_data.quorum_required} ${ward.criterion_2_data.quorum_met ? '✓' : '✗'}`
        : 'Meeting data not yet recorded',
      action: () => setShowMeetingManagement(true),
      actionLabel: ward.criterion_2_data ? 'View Meetings' : 'Record Meeting',
    },
    {
      id: 3,
      name: 'Meeting Attendance',
      description: 'Ward attended required meeting(s)',
      passed: ward.criterion_3_passed,
      details: ward.criterion_3_data
        ? `${ward.criterion_3_data.total_meetings} meeting(s) recorded`
        : 'Attendance data not yet recorded',
      action: () => setShowMeetingManagement(true),
      actionLabel: 'View Meetings',
    },
    {
      id: 4,
      name: 'Presiding Officer Information',
      description: 'Presiding officer recorded for ward meeting',
      passed: ward.criterion_4_passed,
      details: ward.criterion_4_data
        ? `Presiding Officer: ${ward.criterion_4_data.presiding_officer_name} (${new Date(ward.criterion_4_data.meeting_date).toLocaleDateString()})`
        : 'Presiding officer not yet recorded',
      action: () => setShowMeetingManagement(true),
      actionLabel: 'Record Meeting',
    },
    {
      id: 5,
      name: 'Delegate Selection',
      description: 'Delegates selected for assemblies (SRPA/PPA/NPA)',
      passed: ward.criterion_5_passed,
      details: ward.criterion_5_data
        ? `SRPA: ${ward.criterion_5_data.srpa_delegates} | PPA: ${ward.criterion_5_data.ppa_delegates} | NPA: ${ward.criterion_5_data.npa_delegates}`
        : 'No delegates assigned',
      action: () => setShowDelegateManagement(true),
      actionLabel: 'Manage Delegates',
    },
  ];

  const canApprove = ward.all_criteria_passed && !ward.is_compliant;
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom>
            {ward.ward_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {ward.municipality_name} • {ward.district_code} • {ward.province_code}
          </Typography>
        </Box>
        {ward.is_compliant && (
          <Chip
            label="Approved"
            color="success"
            icon={<CheckCircleIcon />}
          />
        )}
      </Box>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Members
              </Typography>
              <Typography variant="h4">
                {ward.total_members}
              </Typography>
              <Chip 
                label={ward.meets_member_threshold ? '≥200 ✓' : '<200'} 
                size="small" 
                color={ward.meets_member_threshold ? 'success' : 'default'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Voting Districts
              </Typography>
              <Typography variant="h4">
                {ward.compliant_voting_districts}/{ward.total_voting_districts}
              </Typography>
              <Chip 
                label={ward.all_vds_compliant ? 'All Compliant' : 'Some Non-Compliant'} 
                size="small" 
                color={ward.all_vds_compliant ? 'success' : 'warning'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Criterion 1 Status
              </Typography>
              <Typography variant="h4">
                {ward.criterion_1_compliant ? (
                  <CheckCircleIcon color="success" fontSize="large" />
                ) : (
                  <CancelIcon color="error" fontSize="large" />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {ward.criterion_1_compliant ? 'Met' : 'Not Met'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Delegates
              </Typography>
              <Typography variant="h4">
                {ward.srpa_delegates + ward.ppa_delegates + ward.npa_delegates}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Across all assemblies
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Compliance Criteria Checklist */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Compliance Criteria Checklist
        </Typography>
        <List>
          {criteria.map((criterion, index) => (
            <React.Fragment key={criterion.id}>
              {index > 0 && <Divider />}
              <ListItem>
                <ListItemIcon>
                  {criterion.passed ? (
                    <CheckCircleOutlineIcon color="success" fontSize="large" />
                  ) : (
                    <HighlightOffIcon color="error" fontSize="large" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight="medium" component="span">
                      Criterion {criterion.id}: {criterion.name}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" component="span">
                        {criterion.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="span">
                        {criterion.details}
                      </Typography>
                    </>
                  }
                  primaryTypographyProps={{ component: 'span' }}
                  secondaryTypographyProps={{ component: 'span' }}
                />
                {criterion.action && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={criterion.action}
                    sx={{ ml: 2 }}
                  >
                    {criterion.actionLabel}
                  </Button>
                )}
              </ListItem>
            </React.Fragment>
          ))}
        </List>
        
        {/* Approval Button */}
        {canApprove && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={<CheckCircleIcon />}
              onClick={() => setApproveDialogOpen(true)}
            >
              Approve Ward Compliance
            </Button>
          </Box>
        )}
        
        {!ward.criterion_1_compliant && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Criterion 1 Not Met:</strong> Ward must have at least 200 members and all voting districts must have at least 5 members each before approval.
            </Typography>
          </Alert>
        )}
        
        {ward.is_compliant && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Ward Approved:</strong> This ward has been approved for compliance on{' '}
              {ward.compliance_approved_at ? new Date(ward.compliance_approved_at).toLocaleDateString() : 'N/A'}
            </Typography>
          </Alert>
        )}
      </Paper>
      
      {/* Voting Districts Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Voting District Breakdown
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Voting District</TableCell>
                <TableCell align="center">Member Count</TableCell>
                <TableCell align="center">Compliance Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {votingDistricts.map((vd: VotingDistrictCompliance) => (
                <TableRow key={vd.voting_district_code}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {vd.voting_district_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {vd.voting_district_code}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={vd.member_count}
                      size="small"
                      color={vd.is_compliant ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {vd.is_compliant ? (
                      <Chip label="Compliant (≥5)" size="small" color="success" />
                    ) : (
                      <Chip label="Non-Compliant (<5)" size="small" color="error" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Approval Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Ward Compliance</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You are about to approve compliance for <strong>{ward.ward_name}</strong>. 
            This action will mark the ward as compliant in the system.
          </Typography>
          <TextField
            label="Approval Notes (Optional)"
            multiline
            rows={4}
            fullWidth
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            placeholder="Add any notes or comments about this approval..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Meeting Management Section */}
      {showMeetingManagement && (
        <Box sx={{ mt: 3 }}>
          <WardMeetingManagement
            wardCode={wardCode!}
            wardName={ward.ward_name}
            provinceCode={ward.province_code}
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button onClick={() => setShowMeetingManagement(false)}>
              Close Meeting Management
            </Button>
          </Box>
        </Box>
      )}

      {/* Delegate Management Section */}
      {showDelegateManagement && (
        <Box sx={{ mt: 3 }}>
          <WardDelegateManagement wardCode={wardCode!} wardName={ward.ward_name} />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button onClick={() => setShowDelegateManagement(false)}>
              Close Delegate Management
            </Button>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default WardComplianceDetail;

