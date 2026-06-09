// ProvincialLeadershipOverview Component
// Shows all municipal SRCT structures in a province with filled/vacant status

import React, { useState, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Alert,
    CircularProgress,
    TextField,
    MenuItem,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    LinearProgress,
    Button,
} from '@mui/material';
import {
    ExpandMore,
    Person,
    PersonOff,
    AccountTree,
    Download,
    CheckCircle,
    Cancel,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { LeadershipAPI } from '../../services/leadershipApi';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface MunicipalityOverview {
    municipality_id: number;
    municipality_name: string;
    municipality_code: string;
    municipality_type: string;
    positions: PositionOverview[];
    stats: { total: number; filled: number; vacant: number };
}

interface PositionOverview {
    position_id: number;
    position_name: string;
    position_code: string;
    position_order: number;
    appointment_id: number | null;
    member_id: number | null;
    member_name: string | null;
    membership_number: string | null;
    appointment_type: string | null;
    start_date: string | null;
    position_status: 'Filled' | 'Vacant';
}

interface ProvincialOverviewData {
    province_id: number;
    summary: {
        total_municipalities: number;
        total_positions: number;
        total_filled: number;
        total_vacant: number;
        fill_rate: number;
    };
    municipalities: MunicipalityOverview[];
}

const ProvincialLeadershipOverview: React.FC = () => {
    const provinceContext = useProvinceContext();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'complete'>('all');
    const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);

    // Fetch provinces for selector (national admin) or resolve province code for provincial admin
    const { data: provinces } = useQuery({
        queryKey: ['provinces-list'],
        queryFn: () => LeadershipAPI.getProvinces(),
        staleTime: 10 * 60 * 1000,
    });

    // Auto-select province for provincial admins
    const effectiveProvinceId = useMemo(() => {
        if (provinceContext.isProvincialAdmin && provinceContext.assignedProvince && provinces) {
            const match = provinces.find(
                (p: any) => p.province_code === provinceContext.assignedProvince!.code
            );
            return match?.id || null;
        }
        return selectedProvinceId;
    }, [provinceContext, provinces, selectedProvinceId]);

    // Fetch the overview data
    const { data, isLoading, error } = useQuery<ProvincialOverviewData>({
        queryKey: ['provincial-leadership-overview', effectiveProvinceId],
        queryFn: () => LeadershipAPI.getProvincialLeadershipOverview(effectiveProvinceId!),
        enabled: !!effectiveProvinceId,
        staleTime: 2 * 60 * 1000,
    });

    const summary = data?.summary;
    const municipalities = data?.municipalities || [];

    // Filter municipalities
    const filteredMunicipalities = useMemo(() => {
        let result = municipalities;

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (m) =>
                    m.municipality_name.toLowerCase().includes(q) ||
                    m.municipality_code.toLowerCase().includes(q) ||
                    m.positions.some(
                        (p) =>
                            p.member_name?.toLowerCase().includes(q) ||
                            p.position_name.toLowerCase().includes(q)
                    )
            );
        }

        if (filterStatus === 'incomplete') {
            result = result.filter((m) => m.stats.vacant > 0);
        } else if (filterStatus === 'complete') {
            result = result.filter((m) => m.stats.vacant === 0);
        }

        return result;
    }, [municipalities, search, filterStatus]);

    const handleExportPDF = () => {
        if (!data) return;
        const doc = new jsPDF();
        doc.text('Provincial SRCT Leadership Overview', 14, 15);
        doc.setFontSize(10);
        doc.text(
            `Total: ${summary?.total_positions} positions | Filled: ${summary?.total_filled} | Vacant: ${summary?.total_vacant} | Fill Rate: ${summary?.fill_rate}%`,
            14,
            22
        );

        const rows: any[] = [];
        filteredMunicipalities.forEach((mun) => {
            mun.positions.forEach((pos) => {
                rows.push([
                    mun.municipality_name,
                    pos.position_name,
                    pos.position_status,
                    pos.member_name || '-',
                    pos.appointment_type || '-',
                    pos.start_date ? new Date(pos.start_date).toLocaleDateString() : '-',
                ]);
            });
        });

        autoTable(doc, {
            head: [['Municipality', 'Position', 'Status', 'Member', 'Type', 'Start Date']],
            body: rows,
            startY: 28,
            styles: { fontSize: 7 },
        });

        doc.save('srct_leadership_overview.pdf');
    };

    const handleExportExcel = () => {
        if (!data) return;
        const rows: any[] = [];
        filteredMunicipalities.forEach((mun) => {
            mun.positions.forEach((pos) => {
                rows.push({
                    Municipality: mun.municipality_name,
                    'Municipality Code': mun.municipality_code,
                    Position: pos.position_name,
                    'Position Code': pos.position_code,
                    Status: pos.position_status,
                    'Member Name': pos.member_name || '',
                    'Membership Number': pos.membership_number || '',
                    'Appointment Type': pos.appointment_type || '',
                    'Start Date': pos.start_date ? new Date(pos.start_date).toLocaleDateString() : '',
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'SRCT Overview');
        XLSX.writeFile(workbook, 'srct_leadership_overview.xlsx');
    };

    return (
        <Box>
            {/* Province Selector (National Admin) */}
            {!provinceContext.isProvincialAdmin && (
                <Card sx={{ mb: 2 }}>
                    <CardContent>
                        <TextField
                            select
                            fullWidth
                            label="Select Province"
                            value={selectedProvinceId || ''}
                            onChange={(e) => setSelectedProvinceId(Number(e.target.value))}
                        >
                            {(provinces || []).map((p: any) => (
                                <MenuItem key={p.province_id || p.id} value={p.province_id || p.id}>
                                    {p.province_name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </CardContent>
                </Card>
            )}

            {!effectiveProvinceId && (
                <Alert severity="info">Please select a province to view the SRCT structures.</Alert>
            )}

            {effectiveProvinceId && (
                <>
                    {/* Summary Cards */}
                    {summary && (
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={6} sm={3}>
                                <Card>
                                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                        <Typography variant="h4" color="primary.main">
                                            {summary.total_municipalities}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Municipalities
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card>
                                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                        <Typography variant="h4" color="info.main">
                                            {summary.total_positions}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Total Positions
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card>
                                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                        <Typography variant="h4" color="success.main">
                                            {summary.total_filled}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Filled
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card>
                                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                        <Typography variant="h4" color="error.main">
                                            {summary.total_vacant}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Vacant
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {/* Fill Rate Bar */}
                    {summary && (
                        <Card sx={{ mb: 2 }}>
                            <CardContent sx={{ py: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" fontWeight="medium">
                                        Provincial Fill Rate
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold" color={summary.fill_rate >= 75 ? 'success.main' : summary.fill_rate >= 50 ? 'warning.main' : 'error.main'}>
                                        {summary.fill_rate}%
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={summary.fill_rate}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: 'grey.200',
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 4,
                                            backgroundColor: summary.fill_rate >= 75 ? 'success.main' : summary.fill_rate >= 50 ? 'warning.main' : 'error.main',
                                        },
                                    }}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Filters & Export */}
                    <Card sx={{ mb: 2 }}>
                        <CardContent>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Search municipality, position or member"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label="Filter Status"
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value as any)}
                                    >
                                        <MenuItem value="all">All Municipalities</MenuItem>
                                        <MenuItem value="incomplete">Incomplete (has vacancies)</MenuItem>
                                        <MenuItem value="complete">Complete (fully staffed)</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={5}>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                        <Button variant="outlined" size="small" startIcon={<Download />} onClick={handleExportPDF} disabled={!data}>
                                            PDF
                                        </Button>
                                        <Button variant="outlined" size="small" startIcon={<Download />} onClick={handleExportExcel} disabled={!data}>
                                            Excel
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Loading */}
                    {isLoading && (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    )}

                    {/* Error */}
                    {error && <Alert severity="error">Failed to load provincial overview.</Alert>}

                    {/* No data */}
                    {!isLoading && !error && municipalities.length === 0 && (
                        <Alert severity="info">No municipal SRCT structures found for this province.</Alert>
                    )}

                    {/* Municipality Accordions */}
                    {filteredMunicipalities.map((mun) => {
                        const fillRate = mun.stats.total > 0 ? Math.round((mun.stats.filled / mun.stats.total) * 100) : 0;
                        const isComplete = mun.stats.vacant === 0;

                        return (
                            <Accordion key={mun.municipality_id} defaultExpanded={false} sx={{ mb: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                                        <AccountTree color={isComplete ? 'success' : 'warning'} fontSize="small" />
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="subtitle1" fontWeight="medium">
                                                {mun.municipality_name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {mun.municipality_code} • {mun.municipality_type || 'Municipality'}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                                icon={isComplete ? <CheckCircle /> : <Cancel />}
                                                label={`${mun.stats.filled}/${mun.stats.total}`}
                                                size="small"
                                                color={isComplete ? 'success' : fillRate >= 50 ? 'warning' : 'error'}
                                                variant="outlined"
                                            />
                                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35, textAlign: 'right' }}>
                                                {fillRate}%
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 0 }}>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Position</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell>Member</TableCell>
                                                    <TableCell>Type</TableCell>
                                                    <TableCell>Start Date</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {mun.positions.map((pos) => (
                                                    <TableRow
                                                        key={`${mun.municipality_id}-${pos.position_id}`}
                                                        sx={{
                                                            bgcolor: pos.position_status === 'Vacant' ? 'error.50' : 'inherit',
                                                            '&:hover': { bgcolor: pos.position_status === 'Vacant' ? 'error.100' : 'action.hover' },
                                                        }}
                                                    >
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {pos.position_name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {pos.position_code}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                icon={pos.position_status === 'Filled' ? <Person /> : <PersonOff />}
                                                                label={pos.position_status}
                                                                size="small"
                                                                color={pos.position_status === 'Filled' ? 'success' : 'error'}
                                                                variant="filled"
                                                                sx={{ fontWeight: 'bold' }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {pos.member_name ? (
                                                                <Box>
                                                                    <Typography variant="body2">{pos.member_name}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {pos.membership_number}
                                                                    </Typography>
                                                                </Box>
                                                            ) : (
                                                                <Typography variant="body2" color="error.main" fontWeight="bold">
                                                                    VACANT
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">{pos.appointment_type || '-'}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">
                                                                {pos.start_date ? new Date(pos.start_date).toLocaleDateString() : '-'}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}

                    {/* Filtered results count */}
                    {!isLoading && filteredMunicipalities.length !== municipalities.length && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Showing {filteredMunicipalities.length} of {municipalities.length} municipalities
                        </Typography>
                    )}
                </>
            )}
        </Box>
    );
};

export default ProvincialLeadershipOverview;
