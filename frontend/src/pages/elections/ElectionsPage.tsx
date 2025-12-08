import React, { useState } from 'react';
import {
  Box,
  Typography,
  // Card,
  CardContent,
  Grid,
  Button,
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
  Alert,
  CircularProgress,
  Fab,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Container,
  useTheme,
} from '@mui/material';
import {
  HowToVote,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  PlayArrow,
  Stop,
  CheckCircle,
  Schedule,
  // People,
  Poll,
  Campaign,
  Refresh,
  // Groups,
  // EventAvailable,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '../../lib/api';
import StatsCard from '../../components/ui/StatsCard';
import ActionButton from '../../components/ui/ActionButton';
import PageHeader from '../../components/ui/PageHeader';

// Interfaces
interface Election {
  id: number;
  election_name: string;
  position_id: number;
  position_name: string;
  position_code: string;
  hierarchy_level: string;
  entity_id: number;
  entity_name: string;
  election_date: string;
  nomination_start_date: string;
  nomination_end_date: string;
  voting_start_datetime: string;
  voting_end_datetime: string;
  election_status: 'Planned' | 'Nominations Open' | 'Nominations Closed' | 'Voting Open' | 'Voting Closed' | 'Completed' | 'Cancelled';
  total_eligible_voters: number;
  total_votes_cast: number;
  candidates_count: number;
  winner_name?: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

const ElectionsPage: React.FC = () => {
  // All hooks must be called at the top level, before any conditional returns
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [tabValue, setTabValue] = useState(0);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    election_name: '',
    position_id: '',
    hierarchy_level: '',
    entity_id: '',
    election_date: '',
    nomination_start_date: '',
    nomination_end_date: '',
    voting_start_datetime: '',
    voting_end_datetime: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch elections
  const { data: electionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['elections'],
    queryFn: () => apiGet('/leadership/elections'),
  });

  // Fetch leadership positions for the form
  const { data: positionsData } = useQuery({
    queryKey: ['leadership-positions'],
    queryFn: () => apiGet('/leadership/positions'),
  });

  // Create election mutation
  const createElectionMutation = useMutation({
    mutationFn: (data: any) => apiPost('/leadership/elections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Failed to create election:', error);
      if (error.response?.data?.message) {
        setFormErrors({ general: error.response.data.message });
      }
    },
  });

  // Update election status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiPatch(`/leadership/elections/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      handleMenuClose();
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, election: Election) => {
    setAnchorEl(event.currentTarget);
    setSelectedElection(election);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedElection(null);
  };

  const resetForm = () => {
    setFormData({
      election_name: '',
      position_id: '',
      hierarchy_level: '',
      entity_id: '',
      election_date: '',
      nomination_start_date: '',
      nomination_end_date: '',
      voting_start_datetime: '',
      voting_end_datetime: ''
    });
    setFormErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.election_name.trim()) {
      errors.election_name = 'Election name is required';
    }
    if (!formData.position_id) {
      errors.position_id = 'Position is required';
    }
    if (!formData.hierarchy_level) {
      errors.hierarchy_level = 'Hierarchy level is required';
    }
    if (!formData.entity_id) {
      errors.entity_id = 'Entity ID is required';
    }
    if (!formData.election_date) {
      errors.election_date = 'Election date is required';
    }
    if (!formData.nomination_start_date) {
      errors.nomination_start_date = 'Nomination start date is required';
    }
    if (!formData.nomination_end_date) {
      errors.nomination_end_date = 'Nomination end date is required';
    }
    if (!formData.voting_start_datetime) {
      errors.voting_start_datetime = 'Voting start date/time is required';
    }
    if (!formData.voting_end_datetime) {
      errors.voting_end_datetime = 'Voting end date/time is required';
    }

    // Date validation
    if (formData.nomination_start_date && formData.nomination_end_date) {
      if (new Date(formData.nomination_start_date) >= new Date(formData.nomination_end_date)) {
        errors.nomination_end_date = 'Nomination end date must be after start date';
      }
    }

    if (formData.voting_start_datetime && formData.voting_end_datetime) {
      if (new Date(formData.voting_start_datetime) >= new Date(formData.voting_end_datetime)) {
        errors.voting_end_datetime = 'Voting end time must be after start time';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateElection = () => {
    if (validateForm()) {
      const electionData = {
        ...formData,
        position_id: parseInt(formData.position_id),
        entity_id: parseInt(formData.entity_id)
      };
      createElectionMutation.mutate(electionData);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'default';
      case 'Nominations Open': return 'info';
      case 'Nominations Closed': return 'warning';
      case 'Voting Open': return 'primary';
      case 'Voting Closed': return 'secondary';
      case 'Completed': return 'success';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Planned': return <Schedule />;
      case 'Nominations Open': return <Campaign />;
      case 'Nominations Closed': return <Stop />;
      case 'Voting Open': return <HowToVote />;
      case 'Voting Closed': return <Poll />;
      case 'Completed': return <CheckCircle />;
      case 'Cancelled': return <Delete />;
      default: return <Schedule />;
    }
  };

  const getHierarchyIcon = (level: string) => {
    switch (level) {
      case 'National': return '🏛️';
      case 'Province': return '🏢';
      case 'Municipality': return '🏘️';
      case 'Ward': return '🏠';
      default: return '📍';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load elections data. Please try again later.
      </Alert>
    );
  }

  const elections: Election[] = (electionsData as any)?.data?.elections || [];

  // Filter elections by status for different tabs
  const upcomingElections = elections.filter(e =>
    ['Planned', 'Nominations Open', 'Nominations Closed', 'Voting Open'].includes(e.election_status)
  );
  const completedElections = elections.filter(e =>
    ['Completed', 'Cancelled'].includes(e.election_status)
  );
  const activeElections = elections.filter(e =>
    ['Nominations Open', 'Voting Open'].includes(e.election_status)
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <PageHeader
        title="Election Management"
        subtitle="Manage democratic elections for leadership positions across all organizational levels"
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Elections' },
        ]}
        badge={{
          label: `${elections.length} Elections`,
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
              onClick={() => setCreateDialogOpen(true)}
              gradient={true}
              vibrant={true}
            >
              Create Election
            </ActionButton>
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ pb: 4 }}>
        {/* Stats Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Elections"
              value={elections.length.toString()}
              subtitle="All elections created"
              icon={HowToVote}
              color="primary"
              trend={{
                value: 20,
                isPositive: true,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Upcoming"
              value={upcomingElections.length.toString()}
              subtitle="Scheduled elections"
              icon={Schedule}
              color="warning"
              trend={{
                value: 5,
                isPositive: true,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Active"
              value={activeElections.length.toString()}
              subtitle="Currently running"
              icon={Poll}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Completed"
              value={completedElections.length.toString()}
              subtitle="Finished elections"
              icon={CheckCircle}
              color="info"
              trend={{
                value: 15,
                isPositive: true,
              }}
            />
          </Grid>
        </Grid>

        {/* Elections Table */}
        <Paper
          sx={{
            mb: 3,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
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
                  <HowToVote />
                  All Elections ({elections.length})
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Schedule />
                  Upcoming ({upcomingElections.length})
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Poll />
                  Active ({activeElections.length})
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle />
                  Completed ({completedElections.length})
                </Box>
              }
            />
          </Tabs>

          <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Election Details</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Participation</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(tabValue === 0 ? elections :
                  tabValue === 1 ? upcomingElections :
                  tabValue === 2 ? activeElections :
                  completedElections
                ).map((election) => (
                  <TableRow key={election.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {election.election_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getHierarchyIcon(election.hierarchy_level)} {election.hierarchy_level} • {election.entity_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {election.position_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {election.position_code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(election.election_status)}
                        label={election.election_status}
                        color={getStatusColor(election.election_status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          Election: {new Date(election.election_date).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Voting: {new Date(election.voting_start_datetime).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          Candidates: {election.candidates_count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Votes: {election.total_votes_cast} / {election.total_eligible_voters}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuClick(e, election)}
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

          {elections.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <HowToVote sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Elections Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first election to get started with democratic leadership selection
              </Typography>
              <ActionButton
                icon={Add}
                onClick={() => setCreateDialogOpen(true)}
                gradient={true}
                vibrant={true}
              >
                Create Election
              </ActionButton>
            </Box>
          )}
          </CardContent>
        </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => console.log('View election')}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => console.log('Edit election')}>
          <Edit sx={{ mr: 1 }} />
          Edit Election
        </MenuItem>
        {selectedElection?.election_status === 'Planned' && (
          <MenuItem onClick={() => updateStatusMutation.mutate({ id: selectedElection.id, status: 'Nominations Open' })}>
            <PlayArrow sx={{ mr: 1 }} />
            Start Nominations
          </MenuItem>
        )}
        {selectedElection?.election_status === 'Nominations Open' && (
          <MenuItem onClick={() => updateStatusMutation.mutate({ id: selectedElection.id, status: 'Voting Open' })}>
            <HowToVote sx={{ mr: 1 }} />
            Start Voting
          </MenuItem>
        )}
        <MenuItem onClick={() => console.log('Cancel election')} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Cancel Election
        </MenuItem>
      </Menu>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Create Election Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HowToVote color="primary" />
            Create New Election
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {formErrors.general && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formErrors.general}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Election Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Election Name"
                  value={formData.election_name}
                  onChange={(e) => handleInputChange('election_name', e.target.value)}
                  error={!!formErrors.election_name}
                  helperText={formErrors.election_name}
                  placeholder="e.g., Provincial Chairperson Election 2025"
                />
              </Grid>

              {/* Position Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.position_id}>
                  <InputLabel>Position</InputLabel>
                  <Select
                    value={formData.position_id}
                    label="Position"
                    onChange={(e) => handleInputChange('position_id', e.target.value)}
                  >
                    {((positionsData as any)?.data?.positions || []).map((position: any) => (
                      <MenuItem key={position.id} value={position.id.toString()}>
                        {position.position_name} ({position.position_code})
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.position_id && (
                    <FormHelperText>{formErrors.position_id}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Hierarchy Level */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.hierarchy_level}>
                  <InputLabel>Hierarchy Level</InputLabel>
                  <Select
                    value={formData.hierarchy_level}
                    label="Hierarchy Level"
                    onChange={(e) => handleInputChange('hierarchy_level', e.target.value)}
                  >
                    <MenuItem value="National">🏛️ National</MenuItem>
                    <MenuItem value="Province">🏢 Province</MenuItem>
                    <MenuItem value="Municipality">🏘️ Municipality</MenuItem>
                    <MenuItem value="Ward">🏠 Ward</MenuItem>
                  </Select>
                  {formErrors.hierarchy_level && (
                    <FormHelperText>{formErrors.hierarchy_level}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Entity ID */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Entity ID"
                  type="number"
                  value={formData.entity_id}
                  onChange={(e) => handleInputChange('entity_id', e.target.value)}
                  error={!!formErrors.entity_id}
                  helperText={formErrors.entity_id || 'ID of the province, municipality, or ward'}
                />
              </Grid>

              {/* Election Date */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Election Date"
                  type="date"
                  value={formData.election_date}
                  onChange={(e) => handleInputChange('election_date', e.target.value)}
                  error={!!formErrors.election_date}
                  helperText={formErrors.election_date}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Nomination Period */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nomination Start Date"
                  type="date"
                  value={formData.nomination_start_date}
                  onChange={(e) => handleInputChange('nomination_start_date', e.target.value)}
                  error={!!formErrors.nomination_start_date}
                  helperText={formErrors.nomination_start_date}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nomination End Date"
                  type="date"
                  value={formData.nomination_end_date}
                  onChange={(e) => handleInputChange('nomination_end_date', e.target.value)}
                  error={!!formErrors.nomination_end_date}
                  helperText={formErrors.nomination_end_date}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Voting Period */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Voting Start Date & Time"
                  type="datetime-local"
                  value={formData.voting_start_datetime}
                  onChange={(e) => handleInputChange('voting_start_datetime', e.target.value)}
                  error={!!formErrors.voting_start_datetime}
                  helperText={formErrors.voting_start_datetime}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Voting End Date & Time"
                  type="datetime-local"
                  value={formData.voting_end_datetime}
                  onChange={(e) => handleInputChange('voting_end_datetime', e.target.value)}
                  error={!!formErrors.voting_end_datetime}
                  helperText={formErrors.voting_end_datetime}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateElection}
            disabled={createElectionMutation.isPending}
            startIcon={createElectionMutation.isPending ? <CircularProgress size={20} /> : <Add />}
          >
            {createElectionMutation.isPending ? 'Creating...' : 'Create Election'}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default ElectionsPage;
