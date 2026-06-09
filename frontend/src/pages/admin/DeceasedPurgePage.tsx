import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  PersonOff as DeceasedIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { deceasedPurgeApi } from '../../services/deceasedPurgeApi';
import type { PurgeRun, ArchivedMember } from '../../services/deceasedPurgeApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVINCE_LABELS: Record<string, string> = {
  GP: 'Gauteng', KZN: 'KwaZulu-Natal', EC: 'Eastern Cape',
  LP: 'Limpopo', MP: 'Mpumalanga', NW: 'North West',
  WC: 'Western Cape', FS: 'Free State', NC: 'Northern Cape',
};

const PROVINCE_ORDER = ['GP', 'KZN', 'EC', 'LP', 'MP', 'NW', 'WC', 'FS', 'NC'];

const POLL_INTERVAL_MS = 8000; // poll every 8 s while a run is active

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string): 'default' | 'info' | 'success' | 'error' | 'warning' {
  switch (status) {
    case 'RUNNING':  return 'info';
    case 'COMPLETED': return 'success';
    case 'FAILED':   return 'error';
    case 'PAUSED':   return 'warning';
    default:         return 'default';
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'RUNNING':   return <CircularProgress size={14} sx={{ mr: 0.5 }} />;
    case 'COMPLETED': return <CheckIcon sx={{ fontSize: 14, mr: 0.5 }} />;
    case 'FAILED':    return <ErrorIcon sx={{ fontSize: 14, mr: 0.5 }} />;
    case 'PAUSED':    return <PauseIcon sx={{ fontSize: 14, mr: 0.5 }} />;
    default:          return <ScheduleIcon sx={{ fontSize: 14, mr: 0.5 }} />;
  }
}

function fmt(n: number | undefined | null) {
  return (n ?? 0).toLocaleString();
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  color?: string;
  icon: React.ReactNode;
}> = ({ label, value, color = '#1976d2', icon }) => {
  const theme = useTheme();
  return (
    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 2,
          bgcolor: alpha(color, 0.12),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>{fmt(Number(value))}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const ProvinceBreakdownTable: React.FC<{ run: PurgeRun }> = ({ run }) => {
  const breakdown = run.province_breakdown ?? {};
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Province</TableCell>
            <TableCell align="right">Scanned</TableCell>
            <TableCell align="right">Deceased</TableCell>
            <TableCell align="right">Deleted</TableCell>
            <TableCell align="right">Not Found</TableCell>
            <TableCell align="right">Errors</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {PROVINCE_ORDER.map(code => {
            const s = breakdown[code];
            if (!s) return null;
            return (
              <TableRow key={code} hover>
                <TableCell>{PROVINCE_LABELS[code] ?? code}</TableCell>
                <TableCell align="right">{fmt(s.scanned)}</TableCell>
                <TableCell align="right">
                  <Typography color={s.deceased > 0 ? 'error.main' : 'text.primary'} variant="body2" fontWeight={s.deceased > 0 ? 700 : 400}>
                    {fmt(s.deceased)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{fmt(s.deleted)}</TableCell>
                <TableCell align="right">{fmt(s.not_found)}</TableCell>
                <TableCell align="right">
                  <Typography color={s.errors > 0 ? 'warning.main' : 'text.primary'} variant="body2">
                    {fmt(s.errors)}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const DeceasedPurgePage: React.FC = () => {
  const theme = useTheme();

  // Current run
  const [currentRun, setCurrentRun] = useState<PurgeRun | null>(null);
  const [runsHistory, setRunsHistory] = useState<PurgeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Archived members tab
  const [archivePage, setArchivePage] = useState(0);
  const [archiveRowsPerPage] = useState(25);
  const [archiveTotal, setArchiveTotal] = useState(0);
  const [archiveRows, setArchiveRows] = useState<ArchivedMember[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [filterProvince, setFilterProvince] = useState('');
  const [filterRunId, setFilterRunId] = useState<number | ''>('');

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadCurrentRun = useCallback(async () => {
    try {
      const run = await deceasedPurgeApi.getCurrentRun();
      setCurrentRun(run);
    } catch {
      // silently ignore poll errors
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [run, history] = await Promise.all([
        deceasedPurgeApi.getCurrentRun(),
        deceasedPurgeApi.listRuns(),
      ]);
      setCurrentRun(run);
      setRunsHistory(history);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to load purge data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const result = await deceasedPurgeApi.listArchived({
        province_code: filterProvince || undefined,
        run_id: filterRunId !== '' ? Number(filterRunId) : undefined,
        limit: archiveRowsPerPage,
        offset: archivePage * archiveRowsPerPage,
      });
      setArchiveRows(result.rows);
      setArchiveTotal(result.total);
    } catch {
      // ignore
    } finally {
      setArchiveLoading(false);
    }
  }, [filterProvince, filterRunId, archivePage, archiveRowsPerPage]);

  // ── Polling ─────────────────────────────────────────────────────────────────

  const isActive = currentRun?.status === 'RUNNING' || currentRun?.status === 'STARTED';

  useEffect(() => {
    if (isActive) {
      pollRef.current = setInterval(loadCurrentRun, POLL_INTERVAL_MS);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isActive, loadCurrentRun]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadArchive(); }, [loadArchive]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setConfirmDialog(false);
    setActionLoading(true);
    setError(null);
    try {
      const result = await deceasedPurgeApi.startRun();
      setSuccessMsg(result.message);
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to start purge run');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!currentRun) return;
    setActionLoading(true);
    try {
      await deceasedPurgeApi.pauseRun(currentRun.run_id);
      setSuccessMsg('Pause requested — run will stop after the current batch.');
      await loadCurrentRun();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to pause run');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const progressPct = currentRun && currentRun.total_scanned > 0
    ? Math.min(100, Math.round((currentRun.total_scanned / Math.max(currentRun.total_scanned, 1)) * 100))
    : 0;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>

      {/* ── Header ── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{
            p: 1.5, borderRadius: 2,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            color: 'error.main',
          }}>
            <DeceasedIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Deceased Member Purge</Typography>
            <Typography variant="body2" color="text.secondary">
              Monthly IEC scan — identifies and archives deceased members
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadAll} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {isActive ? (
            <Button
              variant="outlined"
              color="warning"
              startIcon={actionLoading ? <CircularProgress size={16} /> : <PauseIcon />}
              onClick={handlePause}
              disabled={actionLoading}
            >
              Pause Run
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={actionLoading ? <CircularProgress size={16} /> : <PlayIcon />}
              onClick={() => setConfirmDialog(true)}
              disabled={actionLoading || currentRun?.status === 'COMPLETED'}
            >
              {currentRun?.status === 'PAUSED' ? 'Resume Run' : 'Start Purge'}
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Alerts ── */}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2 }}>{successMsg}</Alert>}

      {/* ── Schedule notice ── */}
      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
        This purge runs <strong>automatically on the 1st of every month at 01:00 SAST</strong>.
        Use the button above only if a manual run is needed outside that schedule.
      </Alert>

      {/* ── Current month run ── */}
      <Typography variant="h6" fontWeight={600} gutterBottom>Current Month</Typography>

      {currentRun ? (
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                Run #{currentRun.run_id}
              </Typography>
              <Chip
                label={
                  <Box display="flex" alignItems="center">
                    {statusIcon(currentRun.status)}
                    {currentRun.status}
                  </Box>
                }
                color={statusColor(currentRun.status)}
                size="small"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Started: {fmtDate(currentRun.started_at)}
              {currentRun.completed_at && ` · Completed: ${fmtDate(currentRun.completed_at)}`}
            </Typography>
          </Box>

          {isActive && (
            <Box mb={2}>
              <LinearProgress color="info" sx={{ borderRadius: 1, height: 6 }} />
              <Typography variant="caption" color="text.secondary" mt={0.5}>
                Processing… auto-refreshes every 8 seconds
              </Typography>
            </Box>
          )}

          {/* Summary stats */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <StatCard label="Members Scanned" value={currentRun.total_scanned} icon={<SearchIcon />} color={theme.palette.info.main} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard label="Deceased Found" value={currentRun.deceased_found} icon={<DeceasedIcon />} color={theme.palette.error.main} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard label="Records Deleted" value={currentRun.records_deleted} icon={<CheckIcon />} color={theme.palette.success.main} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard label="API Errors" value={currentRun.errors_count} icon={<WarningIcon />} color={theme.palette.warning.main} />
            </Grid>
          </Grid>

          {/* Province breakdown */}
          {currentRun.province_breakdown && Object.keys(currentRun.province_breakdown).length > 0 && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1}>Province Breakdown</Typography>
              <ProvinceBreakdownTable run={currentRun} />
            </>
          )}
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 4, mb: 4, textAlign: 'center', color: 'text.secondary' }}>
          <DeceasedIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography>No purge run has been executed this month.</Typography>
          <Typography variant="body2" mt={0.5}>
            The cron will trigger automatically on the 1st. You can also start one manually above.
          </Typography>
        </Paper>
      )}

      {/* ── Run history ── */}
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <HistoryIcon fontSize="small" color="action" />
        <Typography variant="h6" fontWeight={600}>Run History</Typography>
      </Box>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell>Run #</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Scanned</TableCell>
              <TableCell align="right">Deceased</TableCell>
              <TableCell align="right">Deleted</TableCell>
              <TableCell align="right">Errors</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Completed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runsHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No runs recorded yet.
                </TableCell>
              </TableRow>
            ) : runsHistory.map(run => (
              <TableRow key={run.run_id} hover>
                <TableCell>#{run.run_id}</TableCell>
                <TableCell>
                  <Chip
                    label={run.status}
                    color={statusColor(run.status)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">{fmt(run.total_scanned)}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={run.deceased_found > 0 ? 'error.main' : 'text.primary'} fontWeight={run.deceased_found > 0 ? 700 : 400}>
                    {fmt(run.deceased_found)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{fmt(run.records_deleted)}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={run.errors_count > 0 ? 'warning.main' : 'text.primary'}>
                    {fmt(run.errors_count)}
                  </Typography>
                </TableCell>
                <TableCell>{fmtDate(run.started_at)}</TableCell>
                <TableCell>{fmtDate(run.completed_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Archived deceased members ── */}
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <DeceasedIcon fontSize="small" color="error" />
        <Typography variant="h6" fontWeight={600}>Archived Deceased Members</Typography>
        <Chip label={archiveTotal.toLocaleString()} size="small" color="error" variant="outlined" />
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Province</InputLabel>
          <Select
            value={filterProvince}
            label="Province"
            onChange={e => { setFilterProvince(e.target.value); setArchivePage(0); }}
          >
            <MenuItem value="">All Provinces</MenuItem>
            {PROVINCE_ORDER.map(code => (
              <MenuItem key={code} value={code}>{PROVINCE_LABELS[code]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Run</InputLabel>
          <Select
            value={filterRunId}
            label="Run"
            onChange={e => { setFilterRunId(e.target.value as number | ''); setArchivePage(0); }}
          >
            <MenuItem value="">All Runs</MenuItem>
            {runsHistory.map(r => (
              <MenuItem key={r.run_id} value={r.run_id}>Run #{r.run_id}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        {archiveLoading && <LinearProgress />}
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.error.main, 0.04) }}>
              <TableCell>ID Number</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Province</TableCell>
              <TableCell>Municipality</TableCell>
              <TableCell>Membership #</TableCell>
              <TableCell>IEC Status</TableCell>
              <TableCell>Detected</TableCell>
              <TableCell>Run #</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {archiveRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No archived records found.
                </TableCell>
              </TableRow>
            ) : archiveRows.map(row => (
              <TableRow key={row.archive_id} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{row.id_number}</TableCell>
                <TableCell>{row.firstname} {row.surname}</TableCell>
                <TableCell>{PROVINCE_LABELS[row.province_code] ?? row.province_code}</TableCell>
                <TableCell>{row.municipality_code || '—'}</TableCell>
                <TableCell>{row.membership_number || '—'}</TableCell>
                <TableCell>
                  <Chip label={row.iec_voter_status} color="error" size="small" variant="outlined" />
                </TableCell>
                <TableCell>{fmtDate(row.detected_date)}</TableCell>
                <TableCell>#{row.purge_run_id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={archiveTotal}
          page={archivePage}
          rowsPerPage={archiveRowsPerPage}
          rowsPerPageOptions={[25]}
          onPageChange={(_, p) => setArchivePage(p)}
        />
      </TableContainer>

      {/* ── Confirm dialog ── */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Confirm Purge Run
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will scan <strong>all members</strong> against the IEC API and
            <strong> permanently delete</strong> any records where the IEC confirms the member is deceased.
            Full records are archived before deletion.
          </Alert>
          {currentRun?.status === 'PAUSED' ? (
            <Typography variant="body2">
              A paused run exists for this month (Run #{currentRun.run_id}).
              Clicking confirm will <strong>resume</strong> from where it stopped.
            </Typography>
          ) : (
            <Typography variant="body2">
              Are you sure you want to start the deceased member purge now?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleStart} autoFocus>
            {currentRun?.status === 'PAUSED' ? 'Resume' : 'Start Purge'}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default DeceasedPurgePage;
