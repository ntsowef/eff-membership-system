// LeadershipDirectory Component
// Browse and export leadership directories at National (CCT), Provincial (PCT),
// Municipality (SRCT) and Branch (BCT) levels

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  CircularProgress,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  FileDownload,
  ExpandMore,
  Public,
  Map,
  LocationCity,
  Home
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { LeadershipAPI } from '../../services/leadershipApi';
import type { DirectoryRosterRow } from '../../services/leadershipApi';
import { useUI } from '../../store';

// =====================================================
// Types
// =====================================================

type DirectoryLevel = 'cct' | 'pct' | 'srct' | 'bct';

interface RosterTableProps {
  roster: DirectoryRosterRow[];
  showProvince?: boolean;
  groupBySection?: boolean;
}

// =====================================================
// Roster Table (grouped by section)
// =====================================================

const RosterTable: React.FC<RosterTableProps> = ({ roster, showProvince = false, groupBySection = true }) => {
  // Preserve section order as returned by the API
  const sections: string[] = [];
  roster.forEach((row) => {
    if (!sections.includes(row.section)) sections.push(row.section);
  });

  const columnCount = showProvince ? 7 : 6;

  const renderRow = (row: DirectoryRosterRow) => (
    <TableRow key={`${row.position_id}-${row.member_id}`} hover>
      <TableCell>{row.position_name}</TableCell>
      <TableCell>{row.member_name}</TableCell>
      <TableCell>{row.id_number || '-'}</TableCell>
      <TableCell>{row.cell_number || '-'}</TableCell>
      <TableCell>{row.email || '-'}</TableCell>
      {showProvince && <TableCell>{row.province_name || '-'}</TableCell>}
      <TableCell>
        <Chip
          label={row.appointment_status}
          size="small"
          color={row.appointment_status === 'Active' ? 'success' : 'default'}
        />
      </TableCell>
    </TableRow>
  );

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Position</TableCell>
            <TableCell>Member Name</TableCell>
            <TableCell>ID Number</TableCell>
            <TableCell>Cell Number</TableCell>
            <TableCell>Email</TableCell>
            {showProvince && <TableCell>Province</TableCell>}
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groupBySection
            ? sections.map((section) => (
                <React.Fragment key={section}>
                  <TableRow>
                    <TableCell colSpan={columnCount} sx={{ bgcolor: 'action.hover' }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {section}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {roster.filter((row) => row.section === section).map(renderRow)}
                </React.Fragment>
              ))
            : roster.map(renderRow)}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// =====================================================
// LeadershipDirectory Component
// =====================================================

const LeadershipDirectory: React.FC = () => {
  // ==================== State ====================
  const [level, setLevel] = useState<DirectoryLevel>('cct');
  const [provinceId, setProvinceId] = useState<number | ''>('');
  const [municipalityId, setMunicipalityId] = useState<number | ''>('');
  const [exporting, setExporting] = useState(false);

  const { addNotification } = useUI();

  // ==================== Queries ====================

  // Provinces (numeric id = province_id from leadership geographic endpoint)
  const {
    data: provinces = [],
    isLoading: provincesLoading,
    error: provincesError
  } = useQuery({
    queryKey: ['directory-provinces'],
    queryFn: () => LeadershipAPI.getProvinces(),
    enabled: level !== 'cct',
    staleTime: 10 * 60 * 1000
  });

  // All municipalities in the selected province (used by SRCT and BCT levels)
  const {
    data: municipalities = [],
    isLoading: municipalitiesLoading,
    error: municipalitiesError
  } = useQuery({
    queryKey: ['directory-municipalities', provinceId],
    queryFn: () => LeadershipAPI.getMunicipalitiesByProvince(provinceId as number),
    enabled: (level === 'srct' || level === 'bct') && provinceId !== '',
    staleTime: 10 * 60 * 1000
  });

  // National (CCT) roster
  const {
    data: cctRoster = [],
    isLoading: cctLoading,
    error: cctError
  } = useQuery({
    queryKey: ['directory-cct'],
    queryFn: () => LeadershipAPI.getCCTDirectory(),
    enabled: level === 'cct',
    staleTime: 5 * 60 * 1000
  });

  // Provincial (PCT) roster
  const {
    data: pctData,
    isLoading: pctLoading,
    error: pctError
  } = useQuery({
    queryKey: ['directory-pct', provinceId],
    queryFn: () => LeadershipAPI.getPCTDirectory(provinceId as number),
    enabled: level === 'pct' && provinceId !== '',
    staleTime: 5 * 60 * 1000
  });

  // Municipality (SRCT) roster
  const {
    data: srctData,
    isLoading: srctLoading,
    error: srctError
  } = useQuery({
    queryKey: ['directory-srct', municipalityId],
    queryFn: () => LeadershipAPI.getSRCTDirectory(municipalityId as number),
    enabled: level === 'srct' && municipalityId !== '',
    staleTime: 5 * 60 * 1000
  });

  // Branch (BCT) rosters grouped by ward
  const {
    data: bctData,
    isLoading: bctLoading,
    error: bctError
  } = useQuery({
    queryKey: ['directory-bct', municipalityId],
    queryFn: () => LeadershipAPI.getBCTDirectory(municipalityId as number),
    enabled: level === 'bct' && municipalityId !== '',
    staleTime: 5 * 60 * 1000
  });

  // ==================== Event Handlers ====================

  const handleLevelChange = (_event: React.MouseEvent<HTMLElement>, newLevel: DirectoryLevel | null) => {
    if (newLevel) {
      setLevel(newLevel);
      setMunicipalityId('');
    }
  };

  const handleProvinceChange = (value: number | '') => {
    setProvinceId(value);
    setMunicipalityId('');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // SRCT with province selected but no municipality → export PCT + all SRCT municipalities
      if (level === 'srct' && municipalityId === '' && provinceId !== '') {
        await LeadershipAPI.downloadDirectoryExport('pct', provinceId as number);
      } else {
        const entityId = level === 'pct'
          ? (provinceId as number)
          : level === 'srct' || level === 'bct'
            ? (municipalityId as number)
            : undefined;
        await LeadershipAPI.downloadDirectoryExport(level, entityId);
      }
      addNotification({ type: 'success', message: 'Export downloaded successfully' });
    } catch (error: any) {
      addNotification({ type: 'error', message: error.message || 'Failed to download export' });
    } finally {
      setExporting(false);
    }
  };

  // ==================== Helpers ====================

  const errorAlert = (error: unknown) => (
    <Alert severity="error" sx={{ mb: 2 }}>
      {(error as Error)?.message || 'An unexpected error occurred'}
    </Alert>
  );

  const loadingBox = (
    <Box display="flex" justifyContent="center" py={4}>
      <CircularProgress />
    </Box>
  );

  const exportButton = (label: string, disabled: boolean) => (
    <Button
      variant="contained"
      startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <FileDownload />}
      onClick={handleExport}
      disabled={disabled || exporting}
    >
      {exporting ? 'Downloading...' : label}
    </Button>
  );

  const provinceSelect = (
    <FormControl fullWidth size="small">
      <InputLabel id="directory-province-label">Province</InputLabel>
      <Select
        labelId="directory-province-label"
        label="Province"
        value={provinceId}
        onChange={(e) => handleProvinceChange(e.target.value as number | '')}
      >
        {provinces.map((province) => (
          <MenuItem key={province.id} value={province.id}>
            {province.province_name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const municipalitySelect = (
    <FormControl fullWidth size="small" disabled={provinceId === ''}>
      <InputLabel id="directory-municipality-label">Municipality</InputLabel>
      <Select
        labelId="directory-municipality-label"
        label="Municipality"
        value={municipalityId}
        onChange={(e) => setMunicipalityId(e.target.value as number | '')}
      >
        {municipalities.map((municipality: any) => (
          <MenuItem key={municipality.municipality_id} value={municipality.municipality_id}>
            {municipality.municipality_name} ({municipality.municipality_type})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const municipalitiesEmptyAlert = (level === 'srct' || level === 'bct') &&
    provinceId !== '' && !municipalitiesLoading && !municipalitiesError && municipalities.length === 0 && (
      <Alert severity="info" sx={{ mb: 2 }}>
        No municipalities were found for the selected province.
      </Alert>
    );

  // ==================== Render ====================

  return (
    <Box>
      {/* Level Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Leadership Directory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Browse leadership structures by level and export them to Excel
          </Typography>
          <ToggleButtonGroup
            value={level}
            exclusive
            onChange={handleLevelChange}
            color="primary"
            size="small"
          >
            <ToggleButton value="cct">
              <Public sx={{ mr: 1 }} fontSize="small" /> National (CCT)
            </ToggleButton>
            <ToggleButton value="pct">
              <Map sx={{ mr: 1 }} fontSize="small" /> Provincial (PCT)
            </ToggleButton>
            <ToggleButton value="srct">
              <LocationCity sx={{ mr: 1 }} fontSize="small" /> Municipality (SRCT)
            </ToggleButton>
            <ToggleButton value="bct">
              <Home sx={{ mr: 1 }} fontSize="small" /> Branch (BCT)
            </ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      {/* National (CCT) */}
      {level === 'cct' && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">National Leadership (CCT)</Typography>
              {exportButton('Export to Excel', cctLoading)}
            </Box>
            {cctError && errorAlert(cctError)}
            {cctLoading && loadingBox}
            {!cctLoading && !cctError && cctRoster.length === 0 && (
              <Alert severity="info">No national leadership appointments found.</Alert>
            )}
            {!cctLoading && !cctError && cctRoster.length > 0 && (
              <RosterTable roster={cctRoster} showProvince />
            )}
          </CardContent>
        </Card>
      )}

      {/* Provincial (PCT) */}
      {level === 'pct' && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Provincial Leadership (PCT)</Typography>
              {exportButton('Export to Excel', provinceId === '' || pctLoading)}
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              The export includes the PCT sheet plus one SRCT sheet per municipality in the province.
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={4}>
                {provinceSelect}
              </Grid>
            </Grid>
            {provincesError && errorAlert(provincesError)}
            {pctError && errorAlert(pctError)}
            {(provincesLoading || pctLoading) && loadingBox}
            {provinceId === '' && !provincesLoading && (
              <Alert severity="info">Select a province to view its PCT leadership.</Alert>
            )}
            {provinceId !== '' && !pctLoading && !pctError && pctData && pctData.roster.length === 0 && (
              <Alert severity="info">No PCT leadership appointments found for this province.</Alert>
            )}
            {provinceId !== '' && !pctLoading && !pctError && pctData && pctData.roster.length > 0 && (
              <RosterTable roster={pctData.roster} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Municipality (SRCT) */}
      {level === 'srct' && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Municipality Leadership (SRCT)</Typography>
              {exportButton(
                municipalityId === '' ? 'Export All (Province)' : 'Export to Excel',
                provinceId === '' || srctLoading
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              The export includes SMS/Cell Number and WhatsApp Number columns.
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={4}>
                {provinceSelect}
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                {municipalitySelect}
              </Grid>
            </Grid>
            {provincesError && errorAlert(provincesError)}
            {municipalitiesError && errorAlert(municipalitiesError)}
            {srctError && errorAlert(srctError)}
            {municipalitiesEmptyAlert}
            {(provincesLoading || municipalitiesLoading || srctLoading) && loadingBox}
            {municipalityId === '' && !municipalitiesLoading && (
              <Alert severity="info">Select a province and municipality to view its SRCT leadership.</Alert>
            )}
            {municipalityId !== '' && !srctLoading && !srctError && srctData && srctData.roster.length === 0 && (
              <Alert severity="info">No SRCT leadership appointments found for this municipality.</Alert>
            )}
            {municipalityId !== '' && !srctLoading && !srctError && srctData && srctData.roster.length > 0 && (
              <RosterTable roster={srctData.roster} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Branch (BCT) */}
      {level === 'bct' && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Branch Leadership (BCT)</Typography>
              {exportButton('Bulk Export', municipalityId === '' || bctLoading)}
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              The bulk export contains one sheet per ward code.
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={4}>
                {provinceSelect}
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                {municipalitySelect}
              </Grid>
            </Grid>
            {provincesError && errorAlert(provincesError)}
            {municipalitiesError && errorAlert(municipalitiesError)}
            {bctError && errorAlert(bctError)}
            {municipalitiesEmptyAlert}
            {(provincesLoading || municipalitiesLoading || bctLoading) && loadingBox}
            {municipalityId === '' && !municipalitiesLoading && (
              <Alert severity="info">Select a province and municipality to view its branch (ward) leadership.</Alert>
            )}
            {municipalityId !== '' && !bctLoading && !bctError && bctData && bctData.wards.length === 0 && (
              <Alert severity="info">No BCT leadership appointments found for this municipality.</Alert>
            )}
            {municipalityId !== '' && !bctLoading && !bctError && bctData && bctData.wards.map((ward) => (
              <Accordion key={ward.ward_id} disableGutters>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {ward.ward_code}
                    {ward.ward_name ? ` — ${ward.ward_name}` : ''}
                  </Typography>
                  <Chip
                    label={`${ward.roster.length} member${ward.roster.length === 1 ? '' : 's'}`}
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </AccordionSummary>
                <AccordionDetails>
                  {ward.roster.length === 0 ? (
                    <Alert severity="info">No leadership appointments in this ward.</Alert>
                  ) : (
                    <RosterTable roster={ward.roster} groupBySection={false} />
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default LeadershipDirectory;
