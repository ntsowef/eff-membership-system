import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import { FilterList as FilterIcon } from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface ProvinceData {
  province_code: string;
  province_name: string;
  expired_count: number;
  expiring_soon_count: number;
  expiring_urgent_count: number;
  total_members: number;
  expired_percentage: number;
}

interface ProvinceBreakdownChartsProps {
  data: ProvinceData[];
  viewMode: 'gauge' | 'bar' | 'list';
  onFilterByProvince?: (provinceCode: string) => void;
}

// Color palette for provinces
const PROVINCE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
];

const ProvinceBreakdownCharts: React.FC<ProvinceBreakdownChartsProps> = ({
  data,
  viewMode,
  onFilterByProvince
}) => {
  const theme = useTheme();

  // Sort provinces by total at-risk members (expired + expiring) - SHOW ALL PROVINCES
  const sortedData = [...data]
    .sort((a, b) => {
      const aTotal = (Number(a.expired_count) || 0) + (Number(a.expiring_soon_count) || 0);
      const bTotal = (Number(b.expired_count) || 0) + (Number(b.expiring_soon_count) || 0);
      return bTotal - aTotal;
    });
    // Removed .slice(0, 5) to show ALL provinces

  // Calculate risk percentage for each province
  const chartData = sortedData.map((province, index) => {
    const totalAtRisk = (Number(province.expired_count) || 0) + (Number(province.expiring_soon_count) || 0);
    const provinceTotalMembers = Number(province.total_members) || 0;
    const riskPercentage = provinceTotalMembers > 0
      ? (totalAtRisk / provinceTotalMembers) * 100
      : 0;

    return {
      ...province,
      riskPercentage,
      color: PROVINCE_COLORS[index % PROVINCE_COLORS.length]
    };
  });

  // Gauge Chart View (Car Speedometer Style)
  const renderGaugeView = () => (
    <Grid container spacing={3}>
      {chartData.map((province) => {
        // Create gauge data with 3 color segments like a car speedometer
        const gaugeData = [
          { name: 'Low Risk', value: 30, fill: theme.palette.success.main },
          { name: 'Medium Risk', value: 20, fill: theme.palette.warning.main },
          { name: 'High Risk', value: 50, fill: theme.palette.error.main }
        ];

        const getGaugeColor = (percentage: number) => {
          if (percentage > 50) return theme.palette.error.main;
          if (percentage > 30) return theme.palette.warning.main;
          return theme.palette.success.main;
        };

        // Calculate needle angle for speedometer
        // 0% = -90 degrees (left), 50% = 0 degrees (top), 100% = 90 degrees (right)
        const needleAngle = -90 + (province.riskPercentage * 1.8);

        return (
          <Grid item xs={12} sm={6} md={4} key={province.province_code}>
            <Card
              sx={{
                height: '100%',
                '&:hover': {
                  boxShadow: theme.shadows[8],
                  transform: 'translateY(-4px)',
                  transition: 'all 0.3s ease'
                }
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle1" fontWeight="bold" noWrap>
                    {province.province_name}
                  </Typography>
                  {onFilterByProvince && (
                    <Tooltip title={`Filter by ${province.province_name}`}>
                      <IconButton
                        size="small"
                        onClick={() => onFilterByProvince(province.province_code)}
                      >
                        <FilterIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                <Box position="relative">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={gaugeData}
                        cx="50%"
                        cy="75%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                      >
                        {gaugeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Needle indicator */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: '25%',
                      left: '50%',
                      width: '3px',
                      height: '55px',
                      backgroundColor: theme.palette.text.primary,
                      transformOrigin: 'bottom center',
                      transform: `translateX(-50%) rotate(${needleAngle}deg)`,
                      transition: 'transform 0.5s ease',
                      zIndex: 10,
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: theme.palette.text.primary,
                        border: `2px solid ${theme.palette.background.paper}`,
                      }
                    }}
                  />

                  {/* Percentage scale markers */}
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      left: '8%',
                      top: '72%',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: theme.palette.text.secondary
                    }}
                  >
                    0%
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      left: '18%',
                      top: '35%',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: theme.palette.text.secondary
                    }}
                  >
                    30%
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      left: '45%',
                      top: '15%',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: theme.palette.text.secondary
                    }}
                  >
                    50%
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      right: '18%',
                      top: '35%',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: theme.palette.text.secondary
                    }}
                  >
                    75%
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      right: '8%',
                      top: '72%',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: theme.palette.text.secondary
                    }}
                  >
                    100%
                  </Typography>
                </Box>

                <Box textAlign="center" mt={-2}>
                  <Typography variant="h4" fontWeight="bold" color={getGaugeColor(province.riskPercentage)}>
                    {province.riskPercentage.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    At Risk
                  </Typography>
                </Box>

                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    {Number(province.expired_count).toLocaleString()} expired • {' '}
                    {Number(province.expiring_soon_count).toLocaleString()} expiring
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total: {Number(province.total_members).toLocaleString()} members
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  // Stacked Bar Chart View
  const renderBarChartView = () => {
    // Prepare data for stacked bar chart
    const barChartData = chartData.map((province) => ({
      name: province.province_name.length > 15
        ? province.province_name.substring(0, 12) + '...'
        : province.province_name,
      fullName: province.province_name,
      expired: Number(province.expired_count) || 0,
      expiring: Number(province.expiring_soon_count) || 0,
      active: Math.max(0, (Number(province.total_members) || 0) - (Number(province.expired_count) || 0) - (Number(province.expiring_soon_count) || 0)),
      total: Number(province.total_members) || 0,
      riskPercentage: province.riskPercentage,
      province_code: province.province_code
    }));

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <Card sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              {data.fullName}
            </Typography>
            <Box>
              <Typography variant="body2" color="error.main">
                Expired: {data.expired.toLocaleString()} ({((data.expired / data.total) * 100).toFixed(1)}%)
              </Typography>
              <Typography variant="body2" color="warning.main">
                Expiring: {data.expiring.toLocaleString()} ({((data.expiring / data.total) * 100).toFixed(1)}%)
              </Typography>
              <Typography variant="body2" color="success.main">
                Active: {data.active.toLocaleString()} ({((data.active / data.total) * 100).toFixed(1)}%)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Total: {data.total.toLocaleString()} members
              </Typography>
              <Typography variant="caption" fontWeight="bold" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
                Risk: {data.riskPercentage.toFixed(1)}%
              </Typography>
            </Box>
          </Card>
        );
      }
      return null;
    };

    return (
      <Box>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={barChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              label={{ value: 'Number of Members', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="square"
            />
            <Bar
              dataKey="expired"
              stackId="a"
              fill={theme.palette.error.main}
              name="Expired"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="expiring"
              stackId="a"
              fill={theme.palette.warning.main}
              name="Expiring Soon"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="active"
              stackId="a"
              fill={theme.palette.success.main}
              name="Active"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Province filter buttons below chart */}
        {onFilterByProvince && (
          <Box display="flex" flexWrap="wrap" gap={1} mt={2} justifyContent="center">
            {barChartData.map((province) => (
              <Tooltip key={province.province_code} title={`Filter by ${province.fullName}`}>
                <IconButton
                  size="small"
                  onClick={() => onFilterByProvince(province.province_code)}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    px: 1.5,
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <Typography variant="caption" sx={{ mr: 0.5 }}>
                    {province.name}
                  </Typography>
                  <FilterIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  if (viewMode === 'gauge') {
    return renderGaugeView();
  } else if (viewMode === 'bar') {
    return renderBarChartView();
  }

  return null;
};

export default ProvinceBreakdownCharts;

