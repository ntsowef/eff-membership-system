import React from 'react';
import { Box, Typography, Paper, Grid, Slider } from '@mui/material';

interface WhatIfScenarioResult {
    scenario_name: string;
    projected_members: number;
    projected_revenue: number;
    confidence_interval_lower: number;
    confidence_interval_upper: number;
}

interface ROIAnalysisResult {
    campaign: string;
    cost: number;
    acquired_members: number;
    cost_per_acquisition: number;
    roi_percentage: number;
}

interface ResourceOptimizationResult {
    resource_type: string;
    current_allocation: number;
    recommended_allocation: number;
    impact_estimate: string;
}

interface StrategicPlanningProps {
    whatIfScenarios: WhatIfScenarioResult[];
    roiAnalysis: ROIAnalysisResult[];
    resourceOptimization: ResourceOptimizationResult[];
}

const StrategicPlanning: React.FC<StrategicPlanningProps> = ({ whatIfScenarios, roiAnalysis, resourceOptimization }) => {
    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            <Typography variant="h6" gutterBottom>Intelligence & Strategy</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Advanced tools for optimizing resources, evaluating marketing ROI, and modeling future growth scenarios.
            </Typography>

            <Grid container spacing={4}>
                {/* What-If Scenario Builder */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>What-If Forecast Scenarios</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Projected models comparing baseline outcomes against strategic shifts.
                        </Typography>

                        {whatIfScenarios?.map((scenario, idx) => (
                            <Box key={idx} sx={{ mb: 3, p: 2, bgcolor: idx === 0 ? 'action.hover' : 'transparent', border: idx === 0 ? '1px dashed #ccc' : '' }}>
                                <Typography variant="subtitle2" fontWeight="bold">{scenario.scenario_name}</Typography>
                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Est. Members</Typography>
                                        <Typography variant="body1" color="primary.main">{scenario.projected_members.toLocaleString()}</Typography>
                                        <Typography variant="caption" color="text.secondary">CI: {scenario.confidence_interval_lower.toLocaleString()} - {scenario.confidence_interval_upper.toLocaleString()}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Est. Revenue</Typography>
                                        <Typography variant="body1" color="success.main">R {scenario.projected_revenue.toLocaleString()}</Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        ))}

                        {/* Mock Interactive Slider for demoing functionality */}
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="caption" fontWeight="bold">Field Agent Deployment Modifier</Typography>
                            <Slider defaultValue={0} min={-50} max={50} step={10} marks valueLabelDisplay="auto" />
                            <Typography variant="caption" color="text.secondary">Adjust to preview real-time API forecast alterations</Typography>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Grid container spacing={4}>
                        {/* ROI Calculator */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Campaign ROI Analysis</Typography>

                                {roiAnalysis?.map((roi, idx) => (
                                    <Box key={idx} sx={{ mt: 2, pb: 2, borderBottom: idx !== roiAnalysis.length - 1 ? '1px solid #eee' : 'none' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="subtitle2">{roi.campaign}</Typography>
                                            <Typography variant="subtitle2" color="success.main">{roi.roi_percentage}% ROI</Typography>
                                        </Box>
                                        <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                            <Grid item xs={4}>
                                                <Typography variant="caption" display="block" color="text.secondary">Spend</Typography>
                                                <Typography variant="body2">R {roi.cost.toLocaleString()}</Typography>
                                            </Grid>
                                            <Grid item xs={4}>
                                                <Typography variant="caption" display="block" color="text.secondary">Acquired</Typography>
                                                <Typography variant="body2">{roi.acquired_members}</Typography>
                                            </Grid>
                                            <Grid item xs={4}>
                                                <Typography variant="caption" display="block" color="text.secondary">CAC</Typography>
                                                <Typography variant="body2">R {roi.cost_per_acquisition.toFixed(2)}</Typography>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                ))}
                            </Paper>
                        </Grid>

                        {/* Resource Optimizer */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Resource Optimization</Typography>

                                {resourceOptimization?.map((res, idx) => (
                                    <Box key={idx} sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" gutterBottom>{res.resource_type}</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                            <Typography variant="body2">Current: <strong>{res.current_allocation}</strong></Typography>
                                            <Typography variant="body2" color="primary.main">Target: <strong>{res.recommended_allocation}</strong></Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                            Impact: {res.impact_estimate}
                                        </Typography>
                                    </Box>
                                ))}
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};

export default StrategicPlanning;
