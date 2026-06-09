import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  LocationOn,
  Timeline,
  Warning,
  CheckCircle,
  Refresh,
  Download,
  Insights,
  Psychology,
  Speed,
  Shield,
  HealthAndSafety,
  PriorityHigh,
  SmsOutlined,
  GroupWork,
} from '@mui/icons-material';
import {
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  BarChart,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/analyticsApi';
import { useProvinceContext, useProvincePageTitle } from '../../hooks/useProvinceContext';
import ProvinceContextBanner from '../common/ProvinceContextBanner';
import { devLog } from '../../utils/logger';

// Advanced Components
import CohortRetentionMatrix from './advanced/CohortRetentionMatrix';
import FunnelVisualization from './advanced/FunnelVisualization';
import StrategicPlanning from './advanced/StrategicPlanning';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface BusinessIntelligenceData {
  membershipInsights: MembershipInsights;
  predictiveAnalytics: PredictiveAnalytics;
  performanceMetrics: PerformanceMetrics;
  riskAnalysis: RiskAnalysis;
  recommendations: Recommendation[];
  realTimeMetrics: RealTimeMetrics;
  executiveSummary?: ExecutiveSummary;
  advancedAnalytics?: {
    cohortAnalysis: CohortAnalysisResult[];
    funnelAnalytics: FunnelAnalyticsResult[];
    whatIfScenarios: WhatIfScenarioResult[];
    roiAnalysis: any[];
    resourceOptimization: any[];
    dataQualityMetrics: DataQualityMetricsResult;
  };
}

interface MembershipInsights {
  growthTrend: 'accelerating' | 'steady' | 'declining' | 'stagnant';
  churnRisk: number;
  engagementScore: number;
  demographicShifts: DemographicShift[];
  geographicExpansion: GeographicOpportunity[];
  seasonalPatterns: SeasonalPattern[];
}

interface PredictiveAnalytics {
  membershipForecast: ForecastData[];
  churnPrediction: ChurnPrediction[];
  growthOpportunities: GrowthOpportunity[];
  resourceNeeds: ResourcePrediction[];
  expirationForecast?: ExpirationForecast[];
  expiredBreakdown?: ExpiredBreakdown[];
  smsUsage?: SMSUsage[];
  growthTrend?: GrowthTrendData[];
}

interface PerformanceMetrics {
  kpis: KPI[];
  benchmarks: Benchmark[];
  targets: Target[];
  achievements: Achievement[];
  adminWorkload?: AdminWorkload[];
  applicationPipeline?: ApplicationPipeline[];
}

interface RiskAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
}

interface Recommendation {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: string;
  timeline: string;
  metrics: string[];
}

interface RealTimeMetrics {
  activeUsers: number;
  newRegistrations: number;
  engagementRate: number;
  systemHealth: number;
  lastUpdated: string;
}

interface ExecutiveSummary {
  healthScore: number;
  growthTrend: string;
  total_members: number;
  active_members: number;
  expired_members: number;
  new_this_month: number;
  engagementRate: number;
  expirationRate: number;
  youthPct: number;
  churnRisk: number;
  provinceCount: number;
  riskLevel: string;
  riskFactorCount: number;
  topRisks: RiskFactor[];
  critical_insights: CriticalInsight[];
  expansionOpportunities: number;
}

interface CriticalInsight {
  title: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  detail: string;
  action_item?: string;
  owner?: string;
  deadline?: string;
  impact_estimate?: string;
}

interface CohortAnalysisResult {
  cohort: string;
  size: number;
  retention_3m: number;
  retention_6m: number;
  retention_12m: number;
  lifetime_value: number;
}

interface FunnelAnalyticsResult {
  stage: string;
  count: number;
  conversion_rate: number;
  drop_off: number;
}

interface WhatIfScenarioResult {
  scenario_name: string;
  projected_members: number;
  projected_revenue: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
}

interface DataQualityMetricsResult {
  completeness_score: number;
  missing_phone_pct: number;
  missing_email_pct: number;
  missing_id_pct: number;
  duplicate_records: number;
  overall_confidence: 'low' | 'medium' | 'high';
}

interface Priority {
  title: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  detail: string;
}

interface ExpirationForecast {
  month: string;
  expiring_count: number;
  cumulative: number;
}

interface ExpiredBreakdown {
  category: string;
  member_count: number;
}

interface SMSUsage {
  month: string;
  total_sent: number;
  total_cost: number;
  campaigns_count: number;
}

interface GrowthTrendData {
  month: string;
  new_members: number;
  cumulative_members: number;
}

interface AdminWorkload {
  admin_name: string;
  admin_id: number;
  applications_processed: number;
  avg_processing_hours: number;
}

interface ApplicationPipeline {
  status: string;
  count: number;
  avg_age_hours: number;
}

interface DemographicShift { type: string; trend: string; impact: string; description: string; }
interface GeographicOpportunity { area: string; type: string; potential: string; currentMembers: number; targetMembers: number; description: string; }
interface SeasonalPattern { period: string; trend: string; averageGrowth: number; description: string; }
interface ForecastData { month: string; predicted_members: number; confidence: number; lower_bound: number; upper_bound: number; }
interface ChurnPrediction { segment: string; churnProbability: number; timeframe: string; affectedMembers?: number; total?: number; }
interface GrowthOpportunity { segment: string; potential: number; currentSize: number; growthRate: number; strategy: string; }
interface ResourcePrediction { resource: string; currentNeed: number; predictedNeed: number; timeframe: string; justification: string; }
interface KPI { name: string; value: number; target: number; unit: string; trend: 'up' | 'down' | 'stable'; status: 'success' | 'warning' | 'error'; }
interface Benchmark { metric: string; industry: number; peers: number; current: number; }
interface Target { name: string; current: number; target: number; deadline: string; progress: number; }
interface Achievement { title: string; description: string; date: string; impact: string; }
interface RiskFactor { factor: string; severity: 'low' | 'medium' | 'high' | 'critical'; probability: number; impact: string; }
interface MitigationStrategy { risk: string; strategy: string; timeline: string; resources: string; expectedImpact: string; }

// ─── Colors ─────────────────────────────────────────────────────────────────

const COLORS = {
  primary: ['#1976d2', '#42a5f5', '#90caf9', '#e3f2fd'],
  success: ['#2e7d32', '#4caf50', '#81c784', '#c8e6c9'],
  warning: ['#ed6c02', '#ff9800', '#ffb74d', '#ffe0b2'],
  error: ['#d32f2f', '#f44336', '#e57373', '#ffcdd2'],
  info: ['#0288d1', '#03a9f4', '#4fc3f7', '#b3e5fc'],
};

// ─── Component ──────────────────────────────────────────────────────────────

const BusinessIntelligenceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  useProvinceContext();
  const pageTitle = useProvincePageTitle('Business Intelligence');

  const { data: biData, isLoading: biLoading, error: biError, refetch } = useQuery({
    queryKey: ['business-intelligence', timeRange],
    queryFn: () => analyticsApi.getBusinessIntelligence({ timeRange } as any),
    refetchInterval: 60000,
  });

  const processedBiData: BusinessIntelligenceData | null = biData?.businessIntelligence || null;
  const execSummary = processedBiData?.executiveSummary;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (biLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (biError || !processedBiData) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load business intelligence data. Please try again.
      </Alert>
    );
  }

  // ─── Render Functions ───────────────────────────────────────────────────

  const renderExecutiveSummary = () => (
    <Grid container spacing={3}>
      {/* Health Score */}
      {execSummary && (
        <Grid item xs={12}>
          <Card sx={{ bgcolor: execSummary.healthScore >= 70 ? '#e8f5e9' : execSummary.healthScore >= 50 ? '#fff8e1' : '#ffebee' }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
                  <HealthAndSafety sx={{ fontSize: 48, color: execSummary.healthScore >= 70 ? 'success.main' : execSummary.healthScore >= 50 ? 'warning.main' : 'error.main' }} />
                  <Typography variant="h2" fontWeight="bold" color={execSummary.healthScore >= 70 ? 'success.main' : execSummary.healthScore >= 50 ? 'warning.main' : 'error.main'}>
                    {execSummary.healthScore}
                  </Typography>
                  <Typography variant="body2">Organization Health Score</Typography>
                </Grid>
                <Grid item xs={12} md={9}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h5" fontWeight="bold">{execSummary.total_members?.toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">Total Members</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h5" fontWeight="bold" color="success.main">{execSummary.active_members?.toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">Active Members</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h5" fontWeight="bold" color="error.main">{execSummary.expired_members?.toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">Expired Members</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="h5" fontWeight="bold" color="primary.main">{execSummary.new_this_month}</Typography>
                      <Typography variant="caption" color="text.secondary">New (30 Days)</Typography>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 1.5 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2"><strong>Engagement:</strong> {execSummary.engagementRate}%</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2"><strong>Expiration Rate:</strong> {execSummary.expirationRate}%</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2"><strong>Youth:</strong> {execSummary.youthPct}%</Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Growth & Risk Cards */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp color="primary" /> Growth Trend Analysis
            </Typography>
            <Chip
              label={processedBiData.membershipInsights.growthTrend.toUpperCase()}
              color={
                processedBiData.membershipInsights.growthTrend === 'accelerating' ? 'success' :
                  processedBiData.membershipInsights.growthTrend === 'steady' ? 'primary' :
                    processedBiData.membershipInsights.growthTrend === 'declining' ? 'warning' : 'error'
              }
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              Current membership growth is {processedBiData.membershipInsights.growthTrend}.
              {processedBiData.membershipInsights.growthTrend === 'declining' && ' Action required to reverse the trend.'}
              {processedBiData.membershipInsights.growthTrend === 'accelerating' && ' Excellent momentum — maintain current strategies.'}
              {processedBiData.membershipInsights.growthTrend === 'stagnant' && ' Consider new recruitment initiatives.'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning color="warning" /> Risk Assessment
            </Typography>
            <Chip
              label={`${processedBiData.riskAnalysis.riskLevel.toUpperCase()} RISK`}
              color={processedBiData.riskAnalysis.riskLevel === 'low' ? 'success' : processedBiData.riskAnalysis.riskLevel === 'medium' ? 'warning' : 'error'}
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              {processedBiData.riskAnalysis.riskFactors.length} risk factors identified.
              {processedBiData.riskAnalysis.riskFactors[0] && ` Primary concern: ${processedBiData.riskAnalysis.riskFactors[0].factor}`}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Key Metrics Row */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Engagement Score</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h3" color="primary.main">{processedBiData.membershipInsights.engagementScore}%</Typography>
              <Box sx={{ flexGrow: 1 }}>
                <LinearProgress variant="determinate" value={Math.min(processedBiData.membershipInsights.engagementScore, 100)} sx={{ height: 8, borderRadius: 4 }} />
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {processedBiData.membershipInsights.engagementScore >= 80 ? 'Excellent' : processedBiData.membershipInsights.engagementScore >= 60 ? 'Good' : 'Needs attention'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Churn Risk</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h3" color={processedBiData.membershipInsights.churnRisk > 20 ? 'error.main' : 'success.main'}>
                {processedBiData.membershipInsights.churnRisk.toFixed(1)}%
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <LinearProgress variant="determinate" value={Math.min(processedBiData.membershipInsights.churnRisk, 100)} color={processedBiData.membershipInsights.churnRisk > 20 ? 'error' : 'success'} sx={{ height: 8, borderRadius: 4 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOn color="primary" /> Expansion Opportunities
            </Typography>
            <Typography variant="h3" color="primary.main">
              {execSummary?.expansionOpportunities ?? processedBiData.membershipInsights.geographicExpansion.length}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {execSummary ? `In ${execSummary.provinceCount} of 9 provinces` : 'High-potential areas identified'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Critical Insights */}
      {execSummary?.critical_insights && execSummary.critical_insights.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PriorityHigh color="error" /> Top Critical Insights & Actions
              </Typography>
              <Grid container spacing={2}>
                {execSummary.critical_insights.map((p, i) => (
                  <Grid item xs={12} md={4} key={i}>
                    <Paper sx={{ p: 2, border: '1px solid', borderColor: p.urgency === 'critical' ? 'error.main' : p.urgency === 'high' ? 'warning.main' : 'divider', borderLeft: '4px solid', borderLeftColor: p.urgency === 'critical' ? 'error.main' : p.urgency === 'high' ? 'warning.main' : 'primary.main' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{p.title}</Typography>
                        <Chip label={p.urgency.toUpperCase()} size="small" color={p.urgency === 'critical' ? 'error' : p.urgency === 'high' ? 'warning' : 'primary'} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{p.detail}</Typography>

                      {p.action_item && (
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="caption" display="block" color="primary.main" fontWeight="bold">Recommended Action:</Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>{p.action_item}</Typography>

                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Owner:</Typography>
                              <Typography variant="caption" display="block" fontWeight="medium">{p.owner}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Deadline:</Typography>
                              <Typography variant="caption" display="block" fontWeight="medium">{p.deadline}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">Est. Impact:</Typography>
                              <Typography variant="caption" display="block" color="success.main" fontWeight="bold">{p.impact_estimate}</Typography>
                            </Grid>
                          </Grid>
                          <Button variant="outlined" size="small" fullWidth sx={{ mt: 1 }}>Assign Action</Button>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Top Recommendations */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology color="primary" /> Top Strategic Recommendations
            </Typography>
            <Grid container spacing={2}>
              {processedBiData.recommendations.slice(0, 3).map((rec) => (
                <Grid item xs={12} md={4} key={rec.id}>
                  <Paper sx={{ p: 2, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip label={rec.priority.toUpperCase()} size="small" color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'default'} />
                      <Chip label={rec.type.toUpperCase()} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{rec.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{rec.description}</Typography>
                    <Typography variant="caption" color="primary.main">Expected Impact: {rec.impact}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPredictiveAnalytics = () => {
    const pa = processedBiData.predictiveAnalytics;
    return (
      <Grid container spacing={3}>
        {/* Expiration Forecast Chart */}
        {pa.expirationForecast && pa.expirationForecast.length > 0 && (
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Timeline color="error" /> Membership Expiration Forecast (Next 6 Months)
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={pa.expirationForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="expiring_count" name="Expiring Members" fill={COLORS.error[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Expired Breakdown */}
        {pa.expiredBreakdown && pa.expiredBreakdown.length > 0 && (
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Expired Members Breakdown</Typography>
                {pa.expiredBreakdown.map((item, i) => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{item.category}</Typography>
                      <Typography variant="body2" fontWeight="bold">{item.member_count.toLocaleString()}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((item.member_count / (pa.expiredBreakdown!.reduce((s, b) => s + b.member_count, 0) || 1)) * 100, 100)}
                      color="error"
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* SMS Usage */}
        {pa.smsUsage && pa.smsUsage.length > 0 && (
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmsOutlined color="primary" /> SMS Usage Trends
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={pa.smsUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="total_sent" name="Messages Sent" fill={COLORS.primary[1]} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="total_cost" name="Cost (R)" stroke={COLORS.warning[0]} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Growth Trend Chart */}
        {pa.growthTrend && pa.growthTrend.length > 0 && (
          <Grid item xs={12} lg={pa.smsUsage && pa.smsUsage.length > 0 ? 4 : 12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Membership Growth Trend</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={pa.growthTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="new_members" name="New Members" fill={COLORS.success[1]} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="cumulative_members" name="Total Members" stroke={COLORS.primary[0]} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Churn Predictions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Churn Predictions</Typography>
              {pa.churnPrediction.map((churn, i) => (
                <Paper key={i} sx={{ p: 2, mb: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <Typography variant="subtitle1" fontWeight="bold">{churn.segment}</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Risk: {churn.churnProbability}% in {churn.timeframe}
                  </Typography>
                  <Typography variant="body2">
                    Affected: {(churn.affectedMembers || churn.total || 0).toLocaleString()} members
                  </Typography>
                  <LinearProgress variant="determinate" value={churn.churnProbability} color="warning" sx={{ mt: 1, height: 6, borderRadius: 3 }} />
                </Paper>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Growth Opportunities */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Growth Opportunities</Typography>
              {pa.growthOpportunities.map((opp, i) => (
                <Paper key={i} sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="subtitle1" fontWeight="bold">{opp.segment}</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>Current: {opp.currentSize.toLocaleString()} | Potential: {opp.potential.toLocaleString()}</Typography>
                  <Typography variant="body2">Strategy: {opp.strategy}</Typography>
                  <Chip label={`${opp.growthRate}% Growth Potential`} size="small" color="success" variant="outlined" sx={{ mt: 1 }} />
                </Paper>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderPerformanceMetrics = () => {
    const pm = processedBiData.performanceMetrics;
    return (
      <Grid container spacing={3}>
        {/* KPIs */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Key Performance Indicators</Typography>
              <Grid container spacing={3}>
                {pm.kpis.map((kpi, i) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color={kpi.status === 'success' ? 'success.main' : kpi.status === 'warning' ? 'warning.main' : 'error.main'}>
                        {kpi.value}{kpi.unit}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">{kpi.name}</Typography>
                      <Typography variant="body2" color="text.secondary">Target: {kpi.target}{kpi.unit}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1 }}>
                        {kpi.trend === 'up' ? <TrendingUp color="success" /> : kpi.trend === 'down' ? <TrendingDown color="error" /> : <Timeline color="action" />}
                        <Chip label={kpi.status.toUpperCase()} size="small" color={kpi.status as any} />
                      </Box>
                      <LinearProgress variant="determinate" value={Math.min((kpi.value / kpi.target) * 100, 100)} color={kpi.status as any} sx={{ mt: 2, height: 6, borderRadius: 3 }} />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Admin Workload Table */}
        {pm.adminWorkload && pm.adminWorkload.length > 0 && (
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupWork color="primary" /> Admin Workload Analysis
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Admin</strong></TableCell>
                        <TableCell align="right"><strong>Apps Processed</strong></TableCell>
                        <TableCell align="right"><strong>Avg Time (hrs)</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pm.adminWorkload.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row.admin_name}</TableCell>
                          <TableCell align="right">{row.applications_processed}</TableCell>
                          <TableCell align="right">{row.avg_processing_hours}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Application Pipeline */}
        {pm.applicationPipeline && pm.applicationPipeline.length > 0 && (
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Speed color="primary" /> Application Pipeline
                </Typography>
                {pm.applicationPipeline.map((item, i) => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{item.status}</Typography>
                      <Typography variant="body2" fontWeight="bold">{item.count} apps</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Avg age: {item.avg_age_hours < 24 ? `${item.avg_age_hours.toFixed(0)}h` : `${(item.avg_age_hours / 24).toFixed(1)}d`}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((item.count / (pm.applicationPipeline!.reduce((s, p) => s + p.count, 0) || 1)) * 100, 100)}
                      sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Targets & Achievements */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Target Progress</Typography>
              {pm.targets.map((target, i) => (
                <Box key={i} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{target.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{target.progress.toFixed(1)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={Math.min(target.progress, 100)} color={target.progress >= 90 ? 'success' : target.progress >= 70 ? 'primary' : 'warning'} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">{target.current.toLocaleString()} / {target.target.toLocaleString()}</Typography>
                  <Typography variant="caption" color="text.secondary">Deadline: {new Date(target.deadline).toLocaleDateString()}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle color="success" /> Recent Achievements
              </Typography>
              {pm.achievements.length > 0 ? pm.achievements.map((a, i) => (
                <Paper key={i} sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="subtitle1" fontWeight="bold">{a.title}</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>{a.description}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip label={`${a.impact.toUpperCase()} IMPACT`} size="small" color="success" variant="outlined" />
                    <Typography variant="caption">{new Date(a.date).toLocaleDateString()}</Typography>
                  </Box>
                </Paper>
              )) : (
                <Typography variant="body2" color="text.secondary">No achievements yet this period.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderRiskAnalysis = () => (
    <Grid container spacing={3}>
      {/* Risk Overview */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>Overall Risk Level</Typography>
            <Shield sx={{ fontSize: 48, color: processedBiData.riskAnalysis.riskLevel === 'low' ? 'success.main' : processedBiData.riskAnalysis.riskLevel === 'medium' ? 'warning.main' : 'error.main', mb: 1 }} />
            <Typography variant="h2" color={processedBiData.riskAnalysis.riskLevel === 'low' ? 'success.main' : processedBiData.riskAnalysis.riskLevel === 'medium' ? 'warning.main' : 'error.main'}>
              {processedBiData.riskAnalysis.riskLevel.toUpperCase()}
            </Typography>
            <Chip label={`${processedBiData.riskAnalysis.riskFactors.length} Risk Factors`} color={processedBiData.riskAnalysis.riskLevel === 'low' ? 'success' : processedBiData.riskAnalysis.riskLevel === 'medium' ? 'warning' : 'error'} sx={{ mt: 2 }} />
          </CardContent>
        </Card>
      </Grid>

      {/* Risk Factors */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Risk Factors Analysis</Typography>
            {processedBiData.riskAnalysis.riskFactors.length > 0 ? processedBiData.riskAnalysis.riskFactors.map((risk, i) => (
              <Paper key={i} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid', borderLeftColor: risk.severity === 'critical' ? 'error.main' : risk.severity === 'high' ? 'error.light' : risk.severity === 'medium' ? 'warning.main' : 'success.main' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">{risk.factor}</Typography>
                  <Chip label={risk.severity.toUpperCase()} size="small" color={risk.severity === 'low' ? 'success' : risk.severity === 'medium' ? 'warning' : 'error'} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{risk.impact}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2">Probability: {risk.probability}%</Typography>
                  <LinearProgress variant="determinate" value={risk.probability} color={risk.severity === 'low' ? 'success' : risk.severity === 'medium' ? 'warning' : 'error'} sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
                </Box>
              </Paper>
            )) : (
              <Alert severity="success">No significant risk factors identified. Well done!</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Mitigation Strategies */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Mitigation Strategies</Typography>
            <Grid container spacing={2}>
              {processedBiData.riskAnalysis.mitigationStrategies.map((strategy, i) => (
                <Grid item xs={12} md={6} key={i}>
                  <Paper sx={{ p: 2, height: '100%', bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Risk: {strategy.risk}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}><strong>Strategy:</strong> {strategy.strategy}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}><strong>Timeline:</strong> {strategy.timeline}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}><strong>Resources:</strong> {strategy.resources}</Typography>
                    <Typography variant="body2"><strong>Expected Impact:</strong> {strategy.expectedImpact}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderRecommendations = () => (
    <Grid container spacing={3}>
      {processedBiData.recommendations.map((rec) => (
        <Grid item xs={12} md={6} lg={4} key={rec.id}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Chip label={rec.priority.toUpperCase()} color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'default'} />
                <Chip label={rec.type.toUpperCase()} variant="outlined" color="primary" />
              </Box>
              <Typography variant="h6" gutterBottom>{rec.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{rec.description}</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Impact:</strong> {rec.impact}</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Effort:</strong> {rec.effort}</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Timeline:</strong> {rec.timeline}</Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 1 }}><strong>Key Metrics:</strong></Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {rec.metrics.map((m, i) => (
                  <Chip key={i} label={m} size="small" variant="outlined" color="primary" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // ─── Main Render ────────────────────────────────────────────────────────

  return (
    <Box sx={{ width: '100%' }}>
      <ProvinceContextBanner variant="banner" sx={{ mb: 3 }} />

      {/* Header & Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" fontWeight="bold">
            {pageTitle}
          </Typography>
          {processedBiData?.executiveSummary?.critical_insights && (
            <Chip icon={<CheckCircle fontSize="small" />} label={`Data Completeness`} color="success" size="small" />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 3 Months</MenuItem>
              <MenuItem value="1y">Last 12 Months</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={refreshing} color="primary" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Refresh sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<Download />}>
            Export Report
          </Button>
        </Box>
      </Box>

      <ProvinceContextBanner />

      {/* Real-time metrics bar */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{processedBiData.realTimeMetrics.activeUsers.toLocaleString()}</Typography>
              <Typography variant="body2">Active Members</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{processedBiData.realTimeMetrics.newRegistrations.toLocaleString()}</Typography>
              <Typography variant="body2">New This Month</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{processedBiData.realTimeMetrics.engagementRate}%</Typography>
              <Typography variant="body2">Engagement Rate</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{processedBiData.realTimeMetrics.systemHealth}%</Typography>
              <Typography variant="body2">Health Score</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Insights />} label="Executive Summary" iconPosition="start" />
          <Tab icon={<GroupWork />} label="Cohort Analysis" iconPosition="start" />
          <Tab icon={<Timeline />} label="Funnel Analytics" iconPosition="start" />
          <Tab icon={<Psychology />} label="Strategic Planning" iconPosition="start" />
          <Tab icon={<Speed />} label="Performance Metrics" iconPosition="start" />
          <Tab icon={<Shield />} label="Risk Analysis" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <Box sx={{ pb: 4 }}>
        {activeTab === 0 && renderExecutiveSummary()}
        {activeTab === 1 && (
          <Paper sx={{ p: 2 }}>
            <CohortRetentionMatrix data={processedBiData?.advancedAnalytics?.cohortAnalysis || []} />
          </Paper>
        )}
        {activeTab === 2 && (
          <Paper sx={{ p: 2 }}>
            <FunnelVisualization data={processedBiData?.advancedAnalytics?.funnelAnalytics || []} />
          </Paper>
        )}
        {activeTab === 3 && (
          <StrategicPlanning
            whatIfScenarios={processedBiData?.advancedAnalytics?.whatIfScenarios || []}
            roiAnalysis={processedBiData?.advancedAnalytics?.roiAnalysis || []}
            resourceOptimization={processedBiData?.advancedAnalytics?.resourceOptimization || []}
          />
        )}
        {activeTab === 4 && renderPerformanceMetrics()}
        {activeTab === 5 && renderRiskAnalysis()}
      </Box>
    </Box>
  );
};

export default BusinessIntelligenceDashboard;
