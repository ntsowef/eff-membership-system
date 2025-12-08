import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {

  Warning,
  CheckCircle,
  Lightbulb,
  Assessment,
  Download,

  Refresh,

  Timeline,

  BarChart,
} from '@mui/icons-material';
import {

  AreaChart,
  Area,

  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,

} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface StrategicInsightsData {
  executiveSummary: {
    totalMembers: number;
    growthRate: number;
    marketPenetration: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    overallScore: number;
  };
  growthProjections: Array<{
    period: string;
    projected: number;
    conservative: number;
    optimistic: number;
  }>;
  riskAssessment: {
    risks: Array<{
      category: string;
      level: 'Low' | 'Medium' | 'High';
      impact: number;
      probability: number;
      description: string;
    }>;
    mitigationStrategies: Array<{
      risk: string;
      strategy: string;
      priority: 'High' | 'Medium' | 'Low';
    }>;
  };
  marketAnalysis: {
    competitivePosition: number;
    marketShare: number;
    growthOpportunities: Array<{
      area: string;
      potential: number;
      difficulty: number;
      timeframe: string;
    }>;
  };
  recommendations: Array<{
    category: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    recommendation: string;
    expectedImpact: string;
    timeframe: string;
    resources: string;
  }>;
  performanceMetrics: {
    membershipEfficiency: number;
    retentionRate: number;
    acquisitionCost: number;
    lifetimeValue: number;
    engagementScore: number;
  };
}

// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const StrategicInsights: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch strategic insights data
  const { data: insights, isLoading, error, refetch } = useQuery({
    queryKey: ['strategic-insights', refreshKey],
    queryFn: async () => {
      const response = await api.get('/analytics/strategic-insights');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add title page
      pdf.setFontSize(24);
      pdf.text('Strategic Insights Report', 20, 30);
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
      pdf.text('Membership Management System', 20, 55);
      
      // Add content
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`strategic-insights-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load strategic insights data. Please try again.
      </Alert>
    );
  }

  const strategicData = insights?.data as StrategicInsightsData;

  if (!strategicData) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No strategic insights data available.
      </Alert>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'error';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Lightbulb color="primary" />
            Strategic Insights Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive analysis and strategic recommendations for membership growth and organizational development
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={isExporting ? <CircularProgress size={16} /> : <Download />}
            onClick={exportToPDF}
            disabled={isExporting}
          >
            {isExporting ? 'Generating PDF...' : 'Export PDF'}
          </Button>
        </Box>
      </Box>

      {/* Report Content */}
      <div ref={reportRef}>
        {/* Executive Summary */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment color="primary" />
              Executive Summary
            </Typography>
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {strategicData.executiveSummary.totalMembers.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Members
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="success.main">
                    {strategicData.executiveSummary.growthRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Growth Rate
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="info.main">
                    {strategicData.executiveSummary.marketPenetration.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Market Penetration
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chip
                    label={strategicData.executiveSummary.riskLevel}
                    color={getRiskColor(strategicData.executiveSummary.riskLevel) as any}
                    size="medium"
                    sx={{ fontSize: '1.2rem', py: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Risk Level
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {strategicData.executiveSummary.overallScore}/100
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overall Score
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={strategicData.executiveSummary.overallScore}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Growth Projections */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timeline color="primary" />
              Growth Projections
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={strategicData.growthProjections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="conservative"
                  stackId="1"
                  stroke="#FF8042"
                  fill="#FF8042"
                  name="Conservative"
                />
                <Area
                  type="monotone"
                  dataKey="projected"
                  stackId="2"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Projected"
                />
                <Area
                  type="monotone"
                  dataKey="optimistic"
                  stackId="3"
                  stroke="#00C49F"
                  fill="#00C49F"
                  name="Optimistic"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Assessment */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} lg={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Warning color="warning" />
                  Risk Assessment
                </Typography>
                <List>
                  {strategicData.riskAssessment.risks.map((risk, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Chip
                          label={risk.level}
                          color={getRiskColor(risk.level) as any}
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={risk.category}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {risk.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                              <Typography variant="caption">
                                Impact: {risk.impact}/10
                              </Typography>
                              <Typography variant="caption">
                                Probability: {risk.probability}/10
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" />
                  Mitigation Strategies
                </Typography>
                <List>
                  {strategicData.riskAssessment.mitigationStrategies.map((strategy, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Chip
                          label={strategy.priority}
                          color={getPriorityColor(strategy.priority) as any}
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={strategy.risk}
                        secondary={strategy.strategy}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Strategic Recommendations */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lightbulb color="primary" />
              Strategic Recommendations
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {strategicData.recommendations.map((rec, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" color="primary">
                        {rec.category}
                      </Typography>
                      <Chip
                        label={rec.priority}
                        color={getPriorityColor(rec.priority) as any}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {rec.recommendation}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Expected Impact
                        </Typography>
                        <Typography variant="body2">
                          {rec.expectedImpact}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Timeframe
                        </Typography>
                        <Typography variant="body2">
                          {rec.timeframe}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Resources Required
                        </Typography>
                        <Typography variant="body2">
                          {rec.resources}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChart color="primary" />
              Performance Metrics
            </Typography>
            <Grid container spacing={3} sx={{ mt: 2 }}>
              {Object.entries(strategicData.performanceMetrics).map(([key, value], index) => (
                <Grid item xs={12} sm={6} md={2.4} key={index}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {typeof value === 'number' ? value.toFixed(1) : value}
                      {key.includes('Rate') || key.includes('Score') ? '%' : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={typeof value === 'number' ? Math.min(value, 100) : 0}
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Report Footer */}
        <Paper sx={{ p: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="h6" gutterBottom>
            Report Summary
          </Typography>
          <Typography variant="body2">
            This strategic insights report provides comprehensive analysis of membership trends, risk assessment,
            and strategic recommendations for organizational growth. The data is based on current membership
            statistics and predictive analytics. Regular review and updates are recommended for optimal strategic planning.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption">
              Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </Typography>
            <Typography variant="caption">
              Membership Management System - Strategic Insights v1.0
            </Typography>
          </Box>
        </Paper>
      </div>
    </Box>
  );
};

export default StrategicInsights;
