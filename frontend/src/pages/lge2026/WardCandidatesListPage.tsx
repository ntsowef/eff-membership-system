import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Paper, Grid, FormControl, InputLabel, Select,
  MenuItem, CircularProgress, Alert, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, IconButton, TablePagination,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import wardAuditApi from '../../services/wardAuditApi';
import lge2026Api from '../../services/lge2026Api';
import type { Municipality, WardComplianceSummary } from '../../types/wardAudit';
import type { Lge2026Candidate, Lge2026CandidateStatus } from '../../types/lge2026';
import { useNotification } from '../../hooks/useNotification';
import CandidateDetailDialog from './CandidateDetailDialog';

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

type StatusFilter = Lge2026CandidateStatus | 'all';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'nominated', label: 'Nominated' },
  { value: 'approved', label: 'Approved' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const WardCandidatesListPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();

  // Geographic cascade
  const [province, setProvince] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [ward, setWard] = useState('');

  // Search & filter
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Detail dialog
  const [selectedCandidate, setSelectedCandidate] = useState<Lge2026Candidate | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Export
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(0);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Reset downstream selections on cascade change
  const handleProvinceChange = (v: string) => {
    setProvince(v); setMunicipality(''); setWard(''); setPage(0);
  };
  const handleMunicipalityChange = (v: string) => {
    setMunicipality(v); setWard(''); setPage(0);
  };

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

  // Main candidate list query
  const {
    data: candidateData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['lge2026-all-candidates', province, municipality, ward, searchTerm, statusFilter, page, rowsPerPage],
    queryFn: () =>
      lge2026Api.getAllCandidates({
        province: province || undefined,
        municipality: municipality || undefined,
        ward: ward || undefined,
        search: searchTerm || undefined,
        status: statusFilter,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      }),
  });

  const candidates = candidateData?.candidates ?? [];
  const total = candidateData?.total ?? 0;

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(format);
    try {
      await lge2026Api.exportCandidates(
        {
          province: province || undefined,
          municipality: municipality || undefined,
          ward: ward || undefined,
          search: searchTerm || undefined,
          status: statusFilter,
        },
        format,
      );
      showSuccess(`Candidates exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      showError(err.message || 'Failed to export candidates');
    } finally {
      setExporting(null);
    }
  };

  const openDetail = (candidate: Lge2026Candidate) => {
    setSelectedCandidate(candidate);
    setDetailOpen(true);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Ward Councillor Candidates
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage all Ward Councillor Candidates across provinces, municipalities and wards
          for the 2026 Local Government Elections.
        </Typography>
      </Box>

      {/* Filter bar */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Search &amp; Filters</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Province</InputLabel>
              <Select value={province} onChange={(e) => handleProvinceChange(e.target.value)} label="Province">
                <MenuItem value=""><em>All Provinces</em></MenuItem>
                {PROVINCES.map(p => (
                  <MenuItem key={p.code} value={p.code}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small" disabled={!province}>
              <InputLabel>Municipality</InputLabel>
              <Select value={municipality} onChange={(e) => handleMunicipalityChange(e.target.value)} label="Municipality">
                <MenuItem value=""><em>All Municipalities</em></MenuItem>
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
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small" disabled={!municipality}>
              <InputLabel>Ward</InputLabel>
              <Select value={ward} onChange={(e) => { setWard(e.target.value); setPage(0); }} label="Ward">
                <MenuItem value=""><em>All Wards</em></MenuItem>
                {wardsLoading ? (
                  <MenuItem disabled><CircularProgress size={20} sx={{ mr: 1 }} />Loading...</MenuItem>
                ) : wards.map((w: WardComplianceSummary) => (
                  <MenuItem key={w.ward_code} value={w.ward_code}>
                    {w.ward_name} ({w.ward_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth size="small"
              label="Search by name or ID number"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </Grid>
        </Grid>

        {/* Status chips + export buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(opt => (
              <Chip
                key={opt.value}
                label={opt.label}
                variant={statusFilter === opt.value ? 'filled' : 'outlined'}
                color={statusFilter === opt.value ? 'primary' : 'default'}
                onClick={() => { setStatusFilter(opt.value); setPage(0); }}
                clickable
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined" size="small"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
            >
              {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button
              variant="outlined" size="small"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('xlsx')}
              disabled={exporting !== null}
            >
              {exporting === 'xlsx' ? 'Exporting…' : 'Export Excel'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Loading */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(error as Error)?.message || 'Failed to load candidates'}
        </Alert>
      )}

      {/* Results table */}
      {!isLoading && !isError && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            Results ({total})
          </Typography>

          {candidates.length === 0 ? (
            <Alert severity="info">No candidates found matching the current filters.</Alert>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>ID Number</TableCell>
                      <TableCell>Cell</TableCell>
                      <TableCell>Ward</TableCell>
                      <TableCell>Municipality</TableCell>
                      <TableCell>Province</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Nominated</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {candidates.map((c: Lge2026Candidate) => (
                      <TableRow
                        key={c.candidate_id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => openDetail(c)}
                      >
                        <TableCell>
                          <Typography variant="body2">{c.member_name || '—'}</Typography>
                        </TableCell>
                        <TableCell>{c.id_number || '—'}</TableCell>
                        <TableCell>{c.cell_number || '—'}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{c.ward_name || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.ward_code}</Typography>
                        </TableCell>
                        <TableCell>{(c as any).municipality_name || '—'}</TableCell>
                        <TableCell>{(c as any).province_code || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={c.status.toUpperCase()}
                            color={STATUS_COLOR[c.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(c.nominated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); openDetail(c); }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </>
          )}
        </Paper>
      )}

      {/* Detail Dialog */}
      <CandidateDetailDialog
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedCandidate(null); }}
        candidate={selectedCandidate}
        onUpdated={(updated) => setSelectedCandidate(updated)}
      />
    </Container>
  );
};

export default WardCandidatesListPage;
