import React, { useMemo, useState } from 'react';
import {
  Box, Container, Typography, Paper, Grid, FormControl, InputLabel, Select,
  MenuItem, CircularProgress, Alert, Card, CardContent, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
} from '@mui/material';
import {
  HowToVote as HowToVoteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import wardAuditApi from '../../services/wardAuditApi';
import lge2026Api from '../../services/lge2026Api';
import type { Municipality, WardComplianceSummary } from '../../types/wardAudit';
import type { Lge2026EligibleMember } from '../../types/lge2026';
import { useNotification } from '../../hooks/useNotification';

const PROVINCES = [
  { code: 'EC', name: 'Eastern Cape' }, { code: 'FS', name: 'Free State' },
  { code: 'GP', name: 'Gauteng' }, { code: 'KZN', name: 'KwaZulu-Natal' },
  { code: 'LP', name: 'Limpopo' }, { code: 'MP', name: 'Mpumalanga' },
  { code: 'NC', name: 'Northern Cape' }, { code: 'NW', name: 'North West' },
  { code: 'WC', name: 'Western Cape' },
];

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  nominated: 'warning',
  approved: 'success',
  withdrawn: 'default',
};

const WardCandidateSelectionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  const [province, setProvince] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [ward, setWard] = useState('');
  const [nominateOpen, setNominateOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Lge2026EligibleMember | null>(null);
  const [nomNotes, setNomNotes] = useState('');
  const [campaignStatement, setCampaignStatement] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');

  // Cascading geographic data
  const { data: municipalities = [], isLoading: muniLoading } = useQuery({
    queryKey: ['lge2026-municipalities', province],
    queryFn: () => wardAuditApi.getMunicipalitiesByProvince(province),
    enabled: !!province,
  });

  const { data: wards = [], isLoading: wardsLoading } = useQuery({
    queryKey: ['lge2026-wards', municipality],
    queryFn: () => wardAuditApi.getWardsByMunicipality(municipality),
    enabled: !!municipality,
  });

  // Active candidate + eligible members for the selected ward
  const { data: activeCandidate, isLoading: activeLoading } = useQuery({
    queryKey: ['lge2026-active-candidate', ward],
    queryFn: () => lge2026Api.getActiveCandidate(ward),
    enabled: !!ward,
  });

  const { data: eligibleMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['lge2026-eligible-members', ward],
    queryFn: () => lge2026Api.getEligibleWardMembers(ward),
    enabled: !!ward,
  });

  const selectedWard = useMemo(
    () => wards.find((w: WardComplianceSummary) => w.ward_code === ward),
    [wards, ward]
  );

  const nominateMutation = useMutation({
    mutationFn: () => lge2026Api.nominateCandidate(ward, {
      member_id: selectedMember!.member_id,
      notes: nomNotes || undefined,
      campaign_statement: campaignStatement || undefined,
    }),
    onSuccess: (candidate) => {
      showSuccess(`${candidate.member_name} nominated as Ward Councillor Candidate`);
      setNominateOpen(false);
      setSelectedMember(null);
      setNomNotes('');
      setCampaignStatement('');
      queryClient.invalidateQueries({ queryKey: ['lge2026-active-candidate', ward] });
      queryClient.invalidateQueries({ queryKey: ['lge2026-eligible-members', ward] });
      queryClient.invalidateQueries({ queryKey: ['lge2026-wards', municipality] });
    },
    onError: (err: any) => showError(err.message || 'Failed to nominate candidate'),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => lge2026Api.updateCandidateStatus(activeCandidate!.candidate_id, {
      status: 'withdrawn',
      notes: withdrawNotes || undefined,
    }),
    onSuccess: () => {
      showSuccess('Candidate withdrawn');
      setWithdrawOpen(false);
      setWithdrawNotes('');
      queryClient.invalidateQueries({ queryKey: ['lge2026-active-candidate', ward] });
      queryClient.invalidateQueries({ queryKey: ['lge2026-eligible-members', ward] });
      queryClient.invalidateQueries({ queryKey: ['lge2026-wards', municipality] });
    },
    onError: (err: any) => showError(err.message || 'Failed to withdraw candidate'),
  });

  const approveMutation = useMutation({
    mutationFn: () => lge2026Api.updateCandidateStatus(activeCandidate!.candidate_id, {
      status: 'approved',
    }),
    onSuccess: () => {
      showSuccess('Candidate approved');
      queryClient.invalidateQueries({ queryKey: ['lge2026-active-candidate', ward] });
    },
    onError: (err: any) => showError(err.message || 'Failed to approve candidate'),
  });

  const handleProvinceChange = (v: string) => {
    setProvince(v); setMunicipality(''); setWard('');
  };
  const handleMunicipalityChange = (v: string) => {
    setMunicipality(v); setWard('');
  };

  const blockedByActive = !!activeCandidate;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Ward Councillor Candidate Selection (LGE2026)
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Each ward must nominate <strong>exactly one</strong> Ward Councillor Candidate
          for the 2026 Local Government Elections.
        </Typography>
      </Box>

      {/* Geographic cascade */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Geographic Selection</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Province</InputLabel>
              <Select value={province} onChange={(e) => handleProvinceChange(e.target.value)} label="Province">
                <MenuItem value=""><em>Select Province</em></MenuItem>
                {PROVINCES.map(p => (
                  <MenuItem key={p.code} value={p.code}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={!province}>
              <InputLabel>Municipality / Sub-Region</InputLabel>
              <Select value={municipality} onChange={(e) => handleMunicipalityChange(e.target.value)} label="Municipality / Sub-Region">
                <MenuItem value=""><em>Select Municipality</em></MenuItem>
                {muniLoading ? (
                  <MenuItem disabled><CircularProgress size={20} sx={{ mr: 1 }} />Loading...</MenuItem>
                ) : municipalities.map((m: Municipality) => (
                  <MenuItem key={m.municipality_code} value={m.municipality_code}>
                    {m.municipality_name}{m.municipality_type === 'Metro Sub-Region' && ' (Sub-Region)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={!municipality}>
              <InputLabel>Ward</InputLabel>
              <Select value={ward} onChange={(e) => setWard(e.target.value)} label="Ward">
                <MenuItem value=""><em>Select Ward</em></MenuItem>
                {wardsLoading ? (
                  <MenuItem disabled><CircularProgress size={20} sx={{ mr: 1 }} />Loading...</MenuItem>
                ) : wards.map((w: WardComplianceSummary) => (
                  <MenuItem key={w.ward_code} value={w.ward_code}>
                    {w.ward_name} ({w.ward_code}){w.has_active_candidate ? ' • Candidate set' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {!ward && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <HowToVoteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Select Province → Municipality → Ward to begin
          </Typography>
        </Paper>
      )}

      {ward && (
        <>
          {/* Active candidate panel */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Ward Councillor Candidate
                {selectedWard && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    {selectedWard.ward_name} ({selectedWard.ward_code})
                  </Typography>
                )}
              </Typography>
              {activeLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : activeCandidate ? (
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6">{activeCandidate.member_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {activeCandidate.id_number || '—'} • Cell: {activeCandidate.cell_number || '—'}
                      {activeCandidate.voting_district_name && ` • VD: ${activeCandidate.voting_district_name}`}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        size="small"
                        label={activeCandidate.status.toUpperCase()}
                        color={STATUS_COLOR[activeCandidate.status]}
                        icon={activeCandidate.status === 'approved' ? <CheckCircleIcon /> : undefined}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Nominated {new Date(activeCandidate.nominated_at).toLocaleDateString()}
                        {activeCandidate.nominated_by_name && ` by ${activeCandidate.nominated_by_name}`}
                      </Typography>
                    </Box>
                    {activeCandidate.campaign_statement && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        “{activeCandidate.campaign_statement}”
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1, justifyContent: { md: 'flex-end' } }}>
                    {activeCandidate.status === 'nominated' && (
                      <Button
                        variant="contained" color="success" startIcon={<VerifiedIcon />}
                        onClick={() => approveMutation.mutate()}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                    )}
                    <Button
                      variant="outlined" color="error" startIcon={<PersonRemoveIcon />}
                      onClick={() => setWithdrawOpen(true)}
                    >
                      Withdraw
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">
                  No active candidate for this ward. Select a member below and click
                  <strong> Nominate </strong> to designate the Ward Councillor Candidate.
                </Alert>
              )}
            </CardContent>
          </Card>


          {/* Eligible members */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Eligible Ward Members
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  {eligibleMembers.length} members
                </Typography>
              </Typography>
              {blockedByActive && (
                <Chip size="small" color="warning" label="A candidate is already nominated. Withdraw to nominate another." />
              )}
            </Box>
            {membersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : eligibleMembers.length === 0 ? (
              <Alert severity="info">No active members found in this ward.</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>ID Number</TableCell>
                      <TableCell>Cell</TableCell>
                      <TableCell>Voting District</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {eligibleMembers.map((m: Lge2026EligibleMember) => {
                      const isCurrent = m.existing_candidate_status === 'nominated' || m.existing_candidate_status === 'approved';
                      return (
                        <TableRow key={m.member_id} hover selected={isCurrent}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={isCurrent ? 'bold' : 'normal'}>
                              {m.full_name}
                            </Typography>
                          </TableCell>
                          <TableCell>{m.id_number || '—'}</TableCell>
                          <TableCell>{m.cell_number || '—'}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{m.voting_district_name || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">{m.voting_district_code || ''}</Typography>
                          </TableCell>
                          <TableCell>
                            {isCurrent ? (
                              <Chip size="small" label={(m.existing_candidate_status || '').toUpperCase()} color={STATUS_COLOR[m.existing_candidate_status as string] || 'default'} />
                            ) : (
                              <Chip size="small" label={m.membership_status} variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={blockedByActive ? 'Withdraw the current candidate first' : 'Nominate as Ward Councillor Candidate'}>
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  disabled={blockedByActive}
                                  onClick={() => { setSelectedMember(m); setNominateOpen(true); }}
                                >
                                  <PersonAddIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}

      {/* Nominate Dialog */}
      <Dialog open={nominateOpen} onClose={() => setNominateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nominate Ward Councillor Candidate</DialogTitle>
        <DialogContent>
          {selectedMember && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Nominating:</Typography>
              <Typography variant="h6">{selectedMember.full_name}</Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {selectedMember.id_number || '—'} • Ward: {ward}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mb: 2 }}>
            Only <strong>one</strong> active candidate is permitted per ward. This nomination will be recorded
            in the LGE2026 candidate register.
          </Alert>
          <TextField
            fullWidth multiline rows={2} sx={{ mb: 2 }}
            label="Notes (optional)"
            value={nomNotes} onChange={(e) => setNomNotes(e.target.value)}
          />
          <TextField
            fullWidth multiline rows={3}
            label="Campaign statement (optional)"
            value={campaignStatement} onChange={(e) => setCampaignStatement(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNominateOpen(false)}>Cancel</Button>
          <Button
            variant="contained" startIcon={<PersonAddIcon />}
            onClick={() => nominateMutation.mutate()}
            disabled={!selectedMember || nominateMutation.isPending}
          >
            {nominateMutation.isPending ? 'Nominating…' : 'Nominate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onClose={() => setWithdrawOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Withdraw Candidate</DialogTitle>
        <DialogContent>
          {activeCandidate && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Withdrawing:</Typography>
              <Typography variant="h6">{activeCandidate.member_name}</Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mb: 2 }}>
            Withdrawing this candidate frees the ward to nominate another. The withdrawn record is preserved
            for audit purposes.
          </Alert>
          <TextField
            fullWidth multiline rows={2}
            label="Reason / notes (optional)"
            value={withdrawNotes} onChange={(e) => setWithdrawNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawOpen(false)}>Cancel</Button>
          <Button
            variant="contained" color="error" startIcon={<PersonRemoveIcon />}
            onClick={() => withdrawMutation.mutate()}
            disabled={withdrawMutation.isPending}
          >
            {withdrawMutation.isPending ? 'Withdrawing…' : 'Withdraw'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WardCandidateSelectionPage;
