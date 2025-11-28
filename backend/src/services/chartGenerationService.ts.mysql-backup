import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import {
  ChartConfiguration,
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

export class ChartGenerationService {
  private static readonly CHART_WIDTH = 600;
  private static readonly CHART_HEIGHT = 400;
  private static readonly CHART_BACKGROUND_COLOR = '#ffffff';

  // Color palettes for different chart types
  private static readonly GENDER_COLORS = ['#4A90E2', '#F5A623', '#7ED321'];
  private static readonly AGE_COLORS = ['#50E3C2', '#4A90E2', '#F5A623', '#D0021B'];
  private static readonly RACE_COLORS = ['#9013FE', '#4A90E2', '#F5A623', '#50E3C2', '#D0021B'];
  private static readonly LANGUAGE_COLORS = [
    '#4A90E2', '#F5A623', '#7ED321', '#50E3C2', '#D0021B', 
    '#9013FE', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'
  ];
  private static readonly OCCUPATION_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
  ];

  private static createChartCanvas(): ChartJSNodeCanvas {
    return new ChartJSNodeCanvas({
      width: this.CHART_WIDTH,
      height: this.CHART_HEIGHT,
      backgroundColour: this.CHART_BACKGROUND_COLOR,
      chartCallback: (ChartJS) => {
        // Register required components
        ChartJS.register(
          CategoryScale,
          LinearScale,
          BarElement,
          ArcElement,
          Title,
          Tooltip,
          Legend
        );
      }
    });
  }

  // Generate Gender Distribution Pie Chart
  static async generateGenderPieChart(genderData: any): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();
    
    const configuration: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: ['Male', 'Female', 'Other'].filter((_, index) => {
          const values = [genderData.male, genderData.female, genderData.other];
          return values[index] > 0;
        }),
        datasets: [{
          data: [genderData.male, genderData.female, genderData.other].filter(value => value > 0),
          backgroundColor: this.GENDER_COLORS,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Gender Distribution',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = genderData.total;
                const value = context.parsed;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate Age Groups Bar Chart
  static async generateAgeGroupsBarChart(ageGroupsData: any): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();

    // Handle both old object format and new array format for backward compatibility
    let labels: string[];
    let data: number[];
    let total: number;

    if (Array.isArray(ageGroupsData)) {
      // New array format
      labels = ageGroupsData.map((item: any) => item.age_group);
      data = ageGroupsData.map((item: any) => item.member_count);
      total = data.reduce((sum, count) => sum + count, 0);
    } else {
      // Old object format (for backward compatibility)
      labels = ['Under 18', '18-35 years', '36-60 years', 'Over 60'];
      data = [
        ageGroupsData.under_18 || 0,
        ageGroupsData.age_18_35 || 0,
        ageGroupsData.age_36_60 || 0,
        ageGroupsData.over_60 || 0
      ];
      total = ageGroupsData.total || data.reduce((sum, count) => sum + count, 0);
    }

    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Members',
          data: data,
          backgroundColor: this.AGE_COLORS.slice(0, data.length),
          borderWidth: 1,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Age Group Distribution',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return (value as number).toLocaleString();
              }
            },
            title: {
              display: true,
              text: 'Number of Members'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Age Groups'
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate Race Demographics Pie Chart
  static async generateRacePieChart(raceData: any[]): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();
    
    // Take top 5 races for better visibility
    const topRaces = raceData.slice(0, 5);
    
    const configuration: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: topRaces.map(item => item.race_name),
        datasets: [{
          data: topRaces.map(item => item.count),
          backgroundColor: this.RACE_COLORS,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Race Demographics',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = topRaces[context.dataIndex];
                return `${item.race_name}: ${item.count.toLocaleString()} (${item.percentage}%)`;
              }
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate Top Languages Bar Chart
  static async generateLanguagesBarChart(languageData: any[]): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();
    
    // Take top 8 languages for better visibility
    const topLanguages = languageData.slice(0, 8);
    
    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: topLanguages.map(item => item.language_name),
        datasets: [{
          label: 'Speakers',
          data: topLanguages.map(item => item.count),
          backgroundColor: this.LANGUAGE_COLORS,
          borderWidth: 1,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Top Languages',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = topLanguages[context.dataIndex];
                return `${item.language_name}: ${item.count.toLocaleString()} (${item.percentage}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return (value as number).toLocaleString();
              }
            },
            title: {
              display: true,
              text: 'Number of Speakers'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Languages'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate Occupation Categories Horizontal Bar Chart
  static async generateOccupationHorizontalBarChart(occupationData: any[]): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();
    
    // Take top 8 occupations for better visibility
    const topOccupations = occupationData.slice(0, 8);
    
    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: topOccupations.map(item => item.category_name),
        datasets: [{
          label: 'Members',
          data: topOccupations.map(item => item.count),
          backgroundColor: this.OCCUPATION_COLORS,
          borderWidth: 1,
          borderColor: '#ffffff'
        }]
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Occupation Categories',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = topOccupations[context.dataIndex];
                return `${item.category_name}: ${item.count.toLocaleString()} (${item.percentage}%)`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return (value as number).toLocaleString();
              }
            },
            title: {
              display: true,
              text: 'Number of Members'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Occupation Categories'
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate Provincial Distribution Pie Chart
  static async generateProvincialDistributionPieChart(provincialData: any): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();

    const { provinces } = provincialData;

    // Take top 8 provinces for better visibility, group others
    const topProvinces = provinces.slice(0, 8);
    const otherProvinces = provinces.slice(8);
    const otherTotal = otherProvinces.reduce((sum: number, p: any) => sum + p.member_count, 0);

    const chartData = [...topProvinces];
    if (otherTotal > 0) {
      chartData.push({
        province_name: 'Others',
        member_count: otherTotal,
        percentage: otherProvinces.reduce((sum: number, p: any) => sum + p.percentage, 0)
      });
    }

    const configuration: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: chartData.map(item => item.province_name),
        datasets: [{
          data: chartData.map(item => item.member_count),
          backgroundColor: [
            '#4A90E2', '#F5A623', '#7ED321', '#50E3C2', '#D0021B',
            '#9013FE', '#FF6B6B', '#4ECDC4', '#45B7D1'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Provincial Distribution',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: { size: 10 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = chartData[context.dataIndex];
                return `${item.province_name}: ${item.member_count.toLocaleString()} (${item.percentage}%)`;
              }
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate Provincial Comparison Bar Chart
  static async generateProvincialComparisonBarChart(provincialData: any): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();

    const { provinces } = provincialData;

    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: provinces.map((item: any) => item.province_name),
        datasets: [{
          label: 'Members',
          data: provinces.map((item: any) => item.member_count),
          backgroundColor: '#4A90E2',
          borderWidth: 1,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Provincial Member Comparison',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = provinces[context.dataIndex];
                return `${item.province_name}: ${item.member_count.toLocaleString()} members (${item.percentage}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return (value as number).toLocaleString();
              }
            },
            title: {
              display: true,
              text: 'Number of Members'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Provinces'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate all charts for provincial distribution data
  static async generateProvincialDistributionCharts(provincialData: any): Promise<{
    distributionChart: Buffer;
    comparisonChart: Buffer;
  }> {
    console.log('🎨 Generating provincial distribution charts...');

    const [distributionChart, comparisonChart] = await Promise.all([
      this.generateProvincialDistributionPieChart(provincialData),
      this.generateProvincialComparisonBarChart(provincialData)
    ]);

    console.log('✅ All provincial distribution charts generated successfully');

    return {
      distributionChart,
      comparisonChart
    };
  }

  // Generate Regional Comparison Bar Chart
  static async generateRegionalComparisonBarChart(comparisonData: any): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();

    const { regions } = comparisonData;

    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: regions.map((region: any) => region.region_name),
        datasets: [{
          label: 'Members',
          data: regions.map((region: any) => region.member_count),
          backgroundColor: regions.map((_: any, index: number) => {
            const colors = ['#4A90E2', '#F5A623', '#7ED321', '#50E3C2', '#D0021B'];
            return colors[index % colors.length];
          }),
          borderWidth: 1,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Regional Comparison - Member Count',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const region = regions[context.dataIndex];
                return `${region.region_name}: ${region.member_count.toLocaleString()} members (${region.percentage}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return (value as number).toLocaleString();
              }
            },
            title: {
              display: true,
              text: 'Number of Members'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Regions'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate Regional Performance Comparison Chart
  static async generateRegionalPerformanceChart(comparisonData: any): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();

    const { regions, summary } = comparisonData;
    const averageLine = summary.average_members_per_region;

    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: regions.map((region: any) => region.region_name),
        datasets: [
          {
            label: 'Member Count',
            data: regions.map((region: any) => region.member_count),
            backgroundColor: regions.map((region: any) =>
              region.above_average ? '#7ED321' : '#F5A623'
            ),
            borderWidth: 1,
            borderColor: '#ffffff'
          },
          {
            label: 'Average',
            data: regions.map(() => averageLine),
            type: 'line' as const,
            borderColor: '#D0021B',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Regional Performance vs Average',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            position: 'top',
            labels: {
              padding: 20,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.datasetIndex === 0) {
                  const region = regions[context.dataIndex];
                  const status = region.above_average ? 'Above Average' : 'Below Average';
                  return `${region.region_name}: ${region.member_count.toLocaleString()} (${status})`;
                } else {
                  return `Average: ${averageLine.toLocaleString()}`;
                }
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return (value as number).toLocaleString();
              }
            },
            title: {
              display: true,
              text: 'Number of Members'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Regions'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate all charts for regional comparison data
  static async generateRegionalComparisonCharts(comparisonData: any): Promise<{
    comparisonChart: Buffer;
    performanceChart: Buffer;
  }> {
    console.log('🎨 Generating regional comparison charts...');

    const [comparisonChart, performanceChart] = await Promise.all([
      this.generateRegionalComparisonBarChart(comparisonData),
      this.generateRegionalPerformanceChart(comparisonData)
    ]);

    console.log('✅ All regional comparison charts generated successfully');

    return {
      comparisonChart,
      performanceChart
    };
  }

  // Generate Monthly Trend Line Chart
  static async generateMonthlyTrendChart(summaryData: any): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();

    // Create mock trend data for demonstration (in real app, would use historical data)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentMonth = summaryData.monthly_metrics.report_period.split(' ')[0].substring(0, 3);
    const currentValue = summaryData.monthly_metrics.total_members;

    // Generate mock historical data
    const trendData = months.map((month, index) => {
      if (month === currentMonth) {
        return currentValue;
      }
      return Math.floor(currentValue * (0.85 + (index * 0.03)));
    });

    const configuration: ChartConfiguration = {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Total Members',
          data: trendData,
          borderColor: '#4A90E2',
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#4A90E2',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Monthly Membership Trend',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            position: 'top',
            labels: {
              padding: 20,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} members`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value) {
                return (value as number).toLocaleString();
              }
            },
            title: {
              display: true,
              text: 'Number of Members'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Month'
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate Monthly Registration Pattern Chart
  static async generateRegistrationPatternChart(summaryData: any): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();

    const { registration_patterns } = summaryData.activity_summary;

    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: registration_patterns.map((pattern: any) => `Day ${pattern.day_of_month}`),
        datasets: [{
          label: 'Registrations',
          data: registration_patterns.map((pattern: any) => pattern.registrations),
          backgroundColor: '#7ED321',
          borderWidth: 1,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Registration Patterns - Top Days',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.parsed.y} registrations on day ${registration_patterns[context.dataIndex].day_of_month}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            },
            title: {
              display: true,
              text: 'Number of Registrations'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Day of Month'
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate Monthly Geographic Distribution Chart
  static async generateMonthlyGeographicChart(summaryData: any): Promise<Buffer> {
    const chartCanvas = this.createChartCanvas();

    const { provincial_distribution } = summaryData.geographic_breakdown;
    const topProvinces = provincial_distribution.slice(0, 6);

    const configuration: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: topProvinces.map((province: any) => province.province_name),
        datasets: [{
          data: topProvinces.map((province: any) => province.member_count),
          backgroundColor: [
            '#4A90E2', '#F5A623', '#7ED321', '#50E3C2', '#D0021B', '#9013FE'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Geographic Distribution',
            font: { size: 18, weight: 'bold' },
            padding: 20
          },
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: { size: 10 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const province = topProvinces[context.dataIndex];
                return `${province.province_name}: ${province.member_count.toLocaleString()} (${province.percentage}%)`;
              }
            }
          }
        }
      }
    };

    return await chartCanvas.renderToBuffer(configuration);
  }

  // Generate all charts for monthly summary data
  static async generateMonthlySummaryCharts(summaryData: any): Promise<{
    trendChart: Buffer;
    registrationChart: Buffer;
    geographicChart: Buffer;
  }> {
    console.log('🎨 Generating monthly summary charts...');

    const [trendChart, registrationChart, geographicChart] = await Promise.all([
      this.generateMonthlyTrendChart(summaryData),
      this.generateRegistrationPatternChart(summaryData),
      this.generateMonthlyGeographicChart(summaryData)
    ]);

    console.log('✅ All monthly summary charts generated successfully');

    return {
      trendChart,
      registrationChart,
      geographicChart
    };
  }

  // Generate all charts for demographics data
  static async generateAllDemographicsCharts(demographics: any): Promise<{
    genderChart: Buffer;
    ageGroupsChart: Buffer;
    raceChart: Buffer;
    languagesChart: Buffer;
    occupationChart: Buffer;
  }> {
    console.log('🎨 Generating all demographics charts...');

    const [genderChart, ageGroupsChart, raceChart, languagesChart, occupationChart] = await Promise.all([
      this.generateGenderPieChart(demographics.gender),
      this.generateAgeGroupsBarChart(demographics.age_groups),
      this.generateRacePieChart(demographics.race),
      this.generateLanguagesBarChart(demographics.language),
      this.generateOccupationHorizontalBarChart(demographics.occupation)
    ]);

    console.log('✅ All demographics charts generated successfully');

    return {
      genderChart,
      ageGroupsChart,
      raceChart,
      languagesChart,
      occupationChart
    };
  }
}
