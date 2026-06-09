import React from 'react';
import { Box, Typography, Paper, Tooltip as MuiTooltip } from '@mui/material';

// We import the same interface locally for typed props
interface CohortAnalysisResult {
    cohort: string;
    size: number;
    retention_3m: number;
    retention_6m: number;
    retention_12m: number;
    lifetime_value: number;
}

interface CohortRetentionMatrixProps {
    data: CohortAnalysisResult[];
}

const CohortRetentionMatrix: React.FC<CohortRetentionMatrixProps> = ({ data }) => {
    // Helper to get color intensity based on retention percentage
    const getColorForRetention = (pct: number) => {
        if (pct >= 80) return '#4caf50'; // Strong Green
        if (pct >= 60) return '#81c784'; // Light Green
        if (pct >= 40) return '#ffb74d'; // Orange
        if (pct >= 20) return '#f44336'; // Red
        return '#ef9a9a'; // Light Red (Severe decay)
    };

    if (!data || data.length === 0) {
        return <Typography variant="body2" color="text.secondary">No cohort data available.</Typography>;
    }

    return (
        <Box sx={{ width: '100%', overflowX: 'auto', p: 2 }}>
            <Typography variant="h6" gutterBottom>Member Cohort Retention</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Analyzes the percentage of users from each monthly signup cohort that renewed or remained active at 3, 6, and 12-month marks.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', minWidth: 600 }}>
                {/* Header Row */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Box sx={{ width: 100 }}><Typography variant="subtitle2" fontWeight="bold">Cohort Month</Typography></Box>
                    <Box sx={{ width: 80 }}><Typography variant="subtitle2" fontWeight="bold">Size</Typography></Box>
                    <Box sx={{ width: 120, textAlign: 'center' }}><Typography variant="subtitle2" fontWeight="bold">Month 3</Typography></Box>
                    <Box sx={{ width: 120, textAlign: 'center' }}><Typography variant="subtitle2" fontWeight="bold">Month 6</Typography></Box>
                    <Box sx={{ width: 120, textAlign: 'center' }}><Typography variant="subtitle2" fontWeight="bold">Month 12</Typography></Box>
                    <Box sx={{ width: 100, textAlign: 'right' }}><Typography variant="subtitle2" fontWeight="bold">Est. LTV (R)</Typography></Box>
                </Box>

                {/* Data Rows */}
                {data.map((row, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ width: 100 }}><Typography variant="body2" fontWeight="medium">{row.cohort}</Typography></Box>
                        <Box sx={{ width: 80 }}><Typography variant="body2" color="text.secondary">{row.size.toLocaleString()}</Typography></Box>

                        <MuiTooltip title={`${((row.retention_3m / 100) * row.size).toFixed(0)} users retained`}>
                            <Paper sx={{ width: 120, p: 1, textAlign: 'center', bgcolor: getColorForRetention(row.retention_3m), color: 'white' }}>
                                <Typography variant="body2" fontWeight="bold">{row.retention_3m}%</Typography>
                            </Paper>
                        </MuiTooltip>

                        <MuiTooltip title={`${((row.retention_6m / 100) * row.size).toFixed(0)} users retained`}>
                            <Paper sx={{ width: 120, p: 1, textAlign: 'center', bgcolor: getColorForRetention(row.retention_6m), color: 'white' }}>
                                <Typography variant="body2" fontWeight="bold">{row.retention_6m}%</Typography>
                            </Paper>
                        </MuiTooltip>

                        <MuiTooltip title={`${((row.retention_12m / 100) * row.size).toFixed(0)} users retained`}>
                            <Paper sx={{ width: 120, p: 1, textAlign: 'center', bgcolor: getColorForRetention(row.retention_12m), color: 'white' }}>
                                <Typography variant="body2" fontWeight="bold">{row.retention_12m}%</Typography>
                            </Paper>
                        </MuiTooltip>

                        <Box sx={{ width: 100, textAlign: 'right' }}>
                            <Typography variant="body2" color="primary.main" fontWeight="bold">R {row.lifetime_value.toLocaleString()}</Typography>
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default CohortRetentionMatrix;
