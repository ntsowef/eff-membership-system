import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';

interface FunnelAnalyticsResult {
    stage: string;
    count: number;
    conversion_rate: number;
    drop_off: number;
}

interface FunnelVisualizationProps {
    data: FunnelAnalyticsResult[];
}

const COLORS = ['#1976d2', '#42a5f5', '#90caf9', '#e3f2fd'];

const FunnelVisualization: React.FC<FunnelVisualizationProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <Typography variant="body2" color="text.secondary">No funnel data available.</Typography>;
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const rowData = payload[0].payload;
            return (
                <Paper sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid #ccc', zIndex: 10 }}>
                    <Typography variant="subtitle2" fontWeight="bold">{label}</Typography>
                    <Typography variant="body2" color="primary">Count: {rowData.count.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">Conv. Rate: {rowData.conversion_rate}%</Typography>
                    {rowData.drop_off > 0 && (
                        <Typography variant="body2" color="error.main">Drop-off: {rowData.drop_off}%</Typography>
                    )}
                </Paper>
            );
        }
        return null;
    };

    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            <Typography variant="h6" gutterBottom>Member Acquisition Funnel</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Visualizes the flow of users from submitted applications through to active membership and renewals.
            </Typography>

            <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                    <Box sx={{ height: 400, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data}
                                layout="vertical"
                                margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                                barSize={40}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} width={150} tick={{ fill: '#555', fontSize: 13 }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5' }} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                    <LabelList dataKey="count" position="right" formatter={(val: number) => val.toLocaleString()} fill="#333" fontSize={13} fontWeight="bold" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Funnel Bottlenecks</Typography>
                    {data.map((stage, idx) => {
                        if (stage.drop_off > 10) {
                            return (
                                <Paper key={idx} sx={{ p: 2, mb: 2, borderLeft: '4px solid', borderColor: stage.drop_off > 30 ? 'error.main' : 'warning.main' }}>
                                    <Typography variant="body2" fontWeight="bold" color="text.primary">{stage.stage} Drop-off</Typography>
                                    <Typography variant="h5" color={stage.drop_off > 30 ? 'error.main' : 'warning.main'}>{stage.drop_off}% decrease</Typography>
                                    <Typography variant="caption" color="text.secondary">Lost {Math.round((stage.drop_off / 100) * (data[idx - 1]?.count || 0))} potential members from previous phase.</Typography>
                                </Paper>
                            );
                        }
                        return null;
                    })}
                </Grid>
            </Grid>
        </Box>
    );
};

export default FunnelVisualization;
