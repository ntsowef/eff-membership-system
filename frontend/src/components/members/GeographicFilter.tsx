import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Collapse,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Clear,
  ArrowBack,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { useMunicipalityContext } from '../../hooks/useMunicipalityContext';
import ProvinceContextBanner from '../common/ProvinceContextBanner';

// Types for geographic hierarchy
interface GeographicData {
  province_code?: string;
  province_name?: string;
  district_code?: string;
  district_name?: string;
  municipality_code?: string;
  municipality_name?: string;
  ward_code?: string;
  ward_name?: string;
  member_count: number;
}

interface GeographicFilters {
  province?: string;
  district?: string;
  municipality?: string;
  ward?: string;
  votingDistrict?: string;
}

interface GeographicFilterProps {
  filters: GeographicFilters;
  onFiltersChange: (filters: GeographicFilters) => void;
}

// Colors for charts
const CHART_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
];

const GeographicFilter: React.FC<GeographicFilterProps> = ({ filters, onFiltersChange }) => {
  const [expanded, setExpanded] = useState(true);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [districts, setDistricts] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [votingDistricts, setVotingDistricts] = useState<any[]>([]);

  // Pagination state for bar chart
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 30;

  // Get province context for provincial admin restrictions
  const provinceContext = useProvinceContext();

  // Get municipality context for municipality admin restrictions
  const municipalityContext = useMunicipalityContext();

  // Fetch province statistics (using real API data with fallback)
  const { data: provinceStats, isLoading: provincesLoading } = useQuery({
    queryKey: ['member-stats-provinces'],
    queryFn: async () => {
      try {
        console.log('🌍 Fetching province stats...');
        const result = await apiGet<GeographicData[]>('/members/stats/provinces');
        console.log('🌍 Province stats response:', result);

        // Since apiGet now returns the data directly, check if it's an array
        if (Array.isArray(result)) {
          return { data: result };
        } else if (result && typeof result === 'object' && Array.isArray(result.data)) {
          return result;
        }

        console.warn('🌍 Unexpected province stats response structure:', result);
        return { data: [] };
      } catch (error) {
        console.error('🌍 Failed to fetch province stats:', error);
        // Return fallback data to prevent crash
        return {
          data: [
            { province_code: 'GP', province_name: 'Gauteng', member_count: 0 },
            { province_code: 'KZN', province_name: 'KwaZulu-Natal', member_count: 0 },
            { province_code: 'WC', province_name: 'Western Cape', member_count: 0 },
            { province_code: 'LP', province_name: 'Limpopo', member_count: 0 },
            { province_code: 'EC', province_name: 'Eastern Cape', member_count: 0 },
            { province_code: 'MP', province_name: 'Mpumalanga', member_count: 0 },
            { province_code: 'NW', province_name: 'North West', member_count: 0 },
            { province_code: 'FS', province_name: 'Free State', member_count: 0 },
            { province_code: 'NC', province_name: 'Northern Cape', member_count: 0 }
          ]
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch districts when province is selected
  const { data: districtStats, isLoading: districtsLoading } = useQuery({
    queryKey: ['member-stats-districts', filters.province],
    queryFn: async () => {
      console.log('🏘️ Fetching districts for province:', filters.province);
      try {
        const result = await apiGet<{ data: GeographicData[] }>(`/members/stats/districts?province=${filters.province}`);
        console.log('🏘️ Districts response:', result);
        return result;
      } catch (error) {
        console.error('🏘️ Failed to fetch districts:', error);
        throw error;
      }
    },
    enabled: !!filters.province,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch municipalities when district is selected
  const { data: municipalityStats, isLoading: municipalitiesLoading } = useQuery({
    queryKey: ['member-stats-municipalities', filters.district],
    queryFn: () => apiGet<{ data: GeographicData[] }>(`/members/stats/municipalities?district=${filters.district}`),
    enabled: !!filters.district,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch wards when municipality is selected
  const { data: wardStats, isLoading: wardsLoading } = useQuery({
    queryKey: ['member-stats-wards', filters.municipality],
    queryFn: () => apiGet<{ data: GeographicData[] }>(`/members/stats/wards?municipality=${filters.municipality}`),
    enabled: !!filters.municipality,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch voting districts when ward is selected
  const { data: votingDistrictStats, isLoading: votingDistrictsLoading } = useQuery({
    queryKey: ['member-stats-voting-districts', filters.ward],
    queryFn: () => apiGet<{ data: GeographicData[] }>(`/members/stats/voting-districts?ward=${filters.ward}`),
    enabled: !!filters.ward,
    staleTime: 5 * 60 * 1000,
  });

  // Determine current loading state
  const isLoading = provincesLoading || districtsLoading || municipalitiesLoading || wardsLoading || votingDistrictsLoading;

  // Update cascading dropdowns
  useEffect(() => {
    console.log('🏘️ District stats changed:', districtStats);

    // Handle nested response structure: { data: { data: [...] } }
    let districtsArray = null;
    if (districtStats?.data) {
      if (Array.isArray(districtStats.data)) {
        // Direct array: { data: [...] }
        districtsArray = districtStats.data;
      } else if ((districtStats.data as any).data && Array.isArray((districtStats.data as any).data)) {
        // Nested array: { data: { data: [...] } }
        districtsArray = (districtStats.data as any).data;
      }
    }

    if (districtsArray && districtsArray.length > 0) {
      console.log('🏘️ Setting districts:', districtsArray);
      setDistricts(districtsArray);
    } else {
      console.log('🏘️ Clearing districts (no valid array found)');
      setDistricts([]);
    }
  }, [districtStats]);

  useEffect(() => {
    console.log('🏢 Municipality stats changed:', municipalityStats);

    // Handle nested response structure: { data: { data: [...] } }
    let municipalitiesArray = null;
    if (municipalityStats?.data) {
      if (Array.isArray(municipalityStats.data)) {
        // Direct array: { data: [...] }
        municipalitiesArray = municipalityStats.data;
      } else if ((municipalityStats.data as any).data && Array.isArray((municipalityStats.data as any).data)) {
        // Nested array: { data: { data: [...] } }
        municipalitiesArray = (municipalityStats.data as any).data;
      }
    }

    if (municipalitiesArray && municipalitiesArray.length > 0) {
      console.log('🏢 Setting municipalities:', municipalitiesArray);
      setMunicipalities(municipalitiesArray);
    } else {
      console.log('🏢 Clearing municipalities (no valid array found)');
      setMunicipalities([]);
    }
  }, [municipalityStats]);

  useEffect(() => {
    console.log('🏠 Ward stats changed:', wardStats);

    // Handle nested response structure: { data: { data: [...] } }
    let wardsArray = null;
    if (wardStats?.data) {
      if (Array.isArray(wardStats.data)) {
        // Direct array: { data: [...] }
        wardsArray = wardStats.data;
      } else if ((wardStats.data as any).data && Array.isArray((wardStats.data as any).data)) {
        // Nested array: { data: { data: [...] } }
        wardsArray = (wardStats.data as any).data;
      }
    }

    if (wardsArray && wardsArray.length > 0) {
      console.log('🏠 Setting wards:', wardsArray);
      setWards(wardsArray);
    } else {
      console.log('🏠 Clearing wards (no valid array found)');
      setWards([]);
    }
  }, [wardStats]);

  useEffect(() => {
    console.log('🗳️ Voting district stats changed:', votingDistrictStats);

    // Handle nested response structure: { data: { data: [...] } }
    let votingDistrictsArray = null;
    if (votingDistrictStats?.data) {
      if (Array.isArray(votingDistrictStats.data)) {
        // Direct array: { data: [...] }
        votingDistrictsArray = votingDistrictStats.data;
      } else if ((votingDistrictStats.data as any).data && Array.isArray((votingDistrictStats.data as any).data)) {
        // Nested array: { data: { data: [...] } }
        votingDistrictsArray = (votingDistrictStats.data as any).data;
      }
    }

    if (votingDistrictsArray && votingDistrictsArray.length > 0) {
      console.log('🗳️ Setting voting districts:', votingDistrictsArray);
      setVotingDistricts(votingDistrictsArray);
    } else {
      console.log('🗳️ Clearing voting districts (no valid array found)');
      setVotingDistricts([]);
    }
  }, [votingDistrictStats]);

  // Auto-select province for provincial admins
  useEffect(() => {
    if (provinceContext.shouldRestrictToProvince &&
        provinceContext.assignedProvince &&
        !filters.province) {
      handleProvinceChange(provinceContext.assignedProvince.code);
    }
  }, [provinceContext, filters.province]);

  // Auto-select geographic fields for municipality admins
  useEffect(() => {
    if (municipalityContext.shouldRestrictToMunicipality) {
      // Auto-select province
      if (municipalityContext.assignedProvince && !filters.province) {
        handleProvinceChange(municipalityContext.assignedProvince.code);
      }
      // Auto-select district
      if (municipalityContext.assignedDistrict && !filters.district) {
        handleDistrictChange(municipalityContext.assignedDistrict.code);
      }
      // Auto-select municipality
      if (municipalityContext.assignedMunicipality && !filters.municipality) {
        handleMunicipalityChange(municipalityContext.assignedMunicipality.code);
      }
    }
  }, [municipalityContext, filters.province, filters.district, filters.municipality]);

  // Handle filter changes with cascading reset
  const handleProvinceChange = (province: string) => {
    console.log('🌍 Province changed to:', province);
    console.log('🌍 Current filters before change:', filters);

    // FORCE RESET: Clear all state first to prevent corruption
    setDistricts([]);
    setMunicipalities([]);
    setWards([]);
    setVotingDistricts([]);

    // Create completely clean filter object
    const cleanFilters = {
      province: province || undefined,
      district: undefined,
      municipality: undefined,
      ward: undefined,
      votingDistrict: undefined
    };

    console.log('🌍 Clean filters being set:', cleanFilters);

    // Update filters with clean state
    onFiltersChange(cleanFilters);
  };

  const handleDistrictChange = (district: string) => {
    console.log('🏘️ District changed to:', district);
    // Ensure we keep province but clear lower levels
    setMunicipalities([]);
    setWards([]);
    setVotingDistricts([]);
    onFiltersChange({
      province: filters.province,
      district: district || undefined,
      municipality: undefined,
      ward: undefined,
      votingDistrict: undefined
    });
    setMunicipalities([]);
    setWards([]);
  };

  const handleMunicipalityChange = (municipality: string) => {
    console.log('🏢 Municipality changed to:', municipality);
    // Ensure we keep province and district but clear lower levels
    setWards([]);
    setVotingDistricts([]);
    onFiltersChange({
      province: filters.province,
      district: filters.district,
      municipality: municipality || undefined,
      ward: undefined,
      votingDistrict: undefined
    });
  };

  const handleWardChange = (ward: string) => {
    console.log('🏠 Ward changed to:', ward);
    setVotingDistricts([]);
    onFiltersChange({
      ...filters,
      ward,
      votingDistrict: undefined
    });
  };

  const handleVotingDistrictChange = (votingDistrict: string) => {
    console.log('🗳️ Voting district changed to:', votingDistrict);
    onFiltersChange({ ...filters, votingDistrict });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setDistricts([]);
    setMunicipalities([]);
    setWards([]);
    setVotingDistricts([]);
  };

  // Navigate back one level
  const goBack = () => {
    if (filters.votingDistrict) {
      onFiltersChange({
        province: filters.province,
        district: filters.district,
        municipality: filters.municipality,
        ward: filters.ward
      });
    } else if (filters.ward) {
      onFiltersChange({
        province: filters.province,
        district: filters.district,
        municipality: filters.municipality
      });
      setVotingDistricts([]);
    } else if (filters.municipality) {
      onFiltersChange({
        province: filters.province,
        district: filters.district
      });
      setWards([]);
      setVotingDistricts([]);
    } else if (filters.district) {
      onFiltersChange({ province: filters.province });
      setMunicipalities([]);
      setWards([]);
      setVotingDistricts([]);
    } else if (filters.province) {
      onFiltersChange({});
      setDistricts([]);
      setMunicipalities([]);
      setWards([]);
      setVotingDistricts([]);
    }
  };

  // Get current data for visualization
  const getCurrentData = () => {
    console.log('📊 Getting current data:', {
      filters,
      votingDistrictsLength: votingDistricts.length,
      wardsLength: wards.length,
      municipalitiesLength: municipalities.length,
      districtsLength: districts.length,
      provinceStatsData: provinceStats?.data
    });

    if (filters.ward && Array.isArray(votingDistricts) && votingDistricts.length > 0) {
      return votingDistricts.map((item: any) => ({
        name: item.voting_district_name || `VD ${item.voting_district_number}`,
        value: item.member_count || 0,
        code: item.voting_district_code,
      }));
    }
    if (filters.municipality && Array.isArray(wards) && wards.length > 0) {
      return wards.map((item: any) => ({
        name: item.ward_name || `Ward ${item.ward_code}`,
        value: item.member_count || 0,
        code: item.ward_code,
      }));
    }
    if (filters.district && Array.isArray(municipalities) && municipalities.length > 0) {
      return municipalities.map((item: any) => ({
        name: item.municipality_name,
        value: item.member_count || 0,
        code: item.municipality_code,
      }));
    }
    if (filters.province && Array.isArray(districts) && districts.length > 0) {
      return districts.map((item: any) => ({
        name: item.district_name,
        value: item.member_count || 0,
        code: item.district_code,
      }));
    }
    if (provinceStats?.data && Array.isArray(provinceStats.data)) {
      return provinceStats.data.map((item: any) => ({
        name: item.province_name,
        value: item.member_count || 0,
        code: item.province_code,
      }));
    }
    console.log('📊 Returning empty array');
    return [];
  };

  const currentData = getCurrentData();
  const totalMembers = currentData.reduce((sum: number, item: any) => sum + item.value, 0);

  // Pagination logic for bar chart
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = chartType === 'bar' ? currentData.slice(startIndex, endIndex) : currentData;

  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(0);
  }, [currentData.length, filters.province, filters.district, filters.municipality, filters.ward, filters.votingDistrict]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (chartType === 'bar' && currentData.length > itemsPerPage) {
        if (event.key === 'ArrowLeft' && currentPage > 0) {
          handlePrevPage();
        } else if (event.key === 'ArrowRight' && currentPage < totalPages - 1) {
          handleNextPage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [chartType, currentData.length, currentPage, totalPages]);

  console.log('📊 Current chart data:', {
    currentDataLength: currentData.length,
    totalMembers,
    sampleData: currentData.slice(0, 3)
  });

  // Handle chart click for drill-down
  const handleChartClick = (data: any) => {
    // Handle both direct data object and event-based data
    const clickData = data?.payload || data;
    const code = clickData?.code;

    console.log('📊 Chart clicked:', {
      data,
      clickData,
      code,
      currentFilters: filters,
      hasProvince: !!filters.province,
      hasDistrict: !!filters.district,
      hasMunicipality: !!filters.municipality,
      hasWard: !!filters.ward,
      currentDataLength: currentData.length
    });

    if (!code) return;

    // Determine what we're actually viewing based on the current data, not corrupted filter state
    const isViewingProvinces = currentData.length > 0 && currentData.some((item: any) =>
      ['GP', 'KZN', 'WC', 'LP', 'EC', 'MP', 'NW', 'FS', 'NC'].includes(item.code)
    );

    console.log('📊 Analysis:', {
      isViewingProvinces,
      currentDataSample: currentData.slice(0, 2),
      filterState: filters
    });

    if (isViewingProvinces) {
      // We're viewing provinces - clicking should set province (ignore corrupted filter state)
      console.log('📊 Clicking on province:', code);
      handleProvinceChange(code);
    } else if (!filters.district || filters.province === filters.district) {
      // We're viewing districts OR filter state is corrupted - clicking should set district
      console.log('📊 Clicking on district:', code);
      handleDistrictChange(code);
    } else if (!filters.municipality) {
      // District selected but no municipality - we're viewing municipalities, clicking sets municipality
      console.log('📊 Clicking on municipality:', code);
      handleMunicipalityChange(code);
    } else if (!filters.ward) {
      // Municipality selected but no ward - we're viewing wards, clicking sets ward
      console.log('📊 Clicking on ward:', code);
      handleWardChange(code);
    } else if (!filters.votingDistrict) {
      // Ward selected but no voting district - we're viewing voting districts, clicking sets voting district
      console.log('📊 Clicking on voting district:', code);
      handleVotingDistrictChange(code);
    }
  };

  const renderChart = () => {
    if (currentData.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No data available for chart
          </Typography>
        </Box>
      );
    }

    console.log('📊 Rendering chart with data:', currentData);

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={currentData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }: any) =>
                `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onClick={handleChartClick}
              style={{ cursor: 'pointer' }}
            >
              {currentData.map((_: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  onClick={() => handleChartClick(currentData[index])}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, _name: any, props: any) => [
                `${value} members`,
                props.payload.name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <Box>
        {/* Pagination Controls for Bar Chart */}
        {currentData.length > itemsPerPage && (
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            p: 1,
            bgcolor: 'grey.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            <Typography variant="body2" color="text.secondary">
              Showing {startIndex + 1}-{Math.min(endIndex, currentData.length)} of {currentData.length} items
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                size="small"
                sx={{
                  bgcolor: currentPage === 0 ? 'grey.100' : 'primary.main',
                  color: currentPage === 0 ? 'grey.400' : 'white',
                  '&:hover': {
                    bgcolor: currentPage === 0 ? 'grey.100' : 'primary.dark',
                  }
                }}
              >
                <ChevronLeft />
              </IconButton>
              <Typography variant="body2" sx={{
                minWidth: '80px',
                textAlign: 'center',
                fontWeight: 'medium'
              }}>
                Page {currentPage + 1} of {totalPages}
              </Typography>
              <IconButton
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
                size="small"
                sx={{
                  bgcolor: currentPage >= totalPages - 1 ? 'grey.100' : 'primary.main',
                  color: currentPage >= totalPages - 1 ? 'grey.400' : 'white',
                  '&:hover': {
                    bgcolor: currentPage >= totalPages - 1 ? 'grey.100' : 'primary.dark',
                  }
                }}
              >
                <ChevronRight />
              </IconButton>
            </Box>
          </Box>
        )}

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={paginatedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis />
            <Tooltip
              formatter={(value: any, _name: any, props: any) => [
                `${value} members`,
                props.payload.name
              ]}
            />
            <Bar
              dataKey="value"
              fill="#8884d8"
              style={{ cursor: 'pointer' }}
              onClick={handleChartClick}
            >
              {paginatedData.map((_: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  onClick={() => handleChartClick(paginatedData[index])}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  const getCurrentLevel = () => {
    if (filters.votingDistrict) return 'Voting District';
    if (filters.ward) return 'Voting Districts';
    if (filters.municipality) return 'Wards';
    if (filters.district) return 'Municipalities';
    if (filters.province) return 'Districts';
    return 'Provinces';
  };

  // Generate breadcrumb navigation
  const getBreadcrumbs = () => {
    const breadcrumbs = [];

    if (filters.province) {
      const provinceName = provinceStats?.data?.find((p: any) => p.province_code === filters.province)?.province_name;
      breadcrumbs.push({ label: provinceName || filters.province, level: 'province' });
    }

    if (filters.district) {
      const districtName = Array.isArray(districts) ? districts.find((d: any) => d.district_code === filters.district)?.district_name : undefined;
      breadcrumbs.push({ label: districtName || filters.district, level: 'district' });
    }

    if (filters.municipality) {
      const municipalityName = Array.isArray(municipalities) ? municipalities.find((m: any) => m.municipality_code === filters.municipality)?.municipality_name : undefined;
      breadcrumbs.push({ label: municipalityName || filters.municipality, level: 'municipality' });
    }

    if (filters.ward) {
      const wardName = Array.isArray(wards) ? wards.find((w: any) => w.ward_code === filters.ward)?.ward_name : undefined;
      breadcrumbs.push({ label: wardName || `Ward ${filters.ward}`, level: 'ward' });
    }

    if (filters.votingDistrict) {
      const votingDistrictName = Array.isArray(votingDistricts) ? votingDistricts.find((vd: any) => vd.voting_district_code === filters.votingDistrict)?.voting_district_name : undefined;
      breadcrumbs.push({ label: votingDistrictName || `VD ${filters.votingDistrict}`, level: 'votingDistrict' });
    }

    return breadcrumbs;
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (level: string) => {
    switch (level) {
      case 'province':
        onFiltersChange({ province: filters.province });
        setDistricts([]);
        setMunicipalities([]);
        setWards([]);
        setVotingDistricts([]);
        break;
      case 'district':
        onFiltersChange({ province: filters.province, district: filters.district });
        setMunicipalities([]);
        setWards([]);
        setVotingDistricts([]);
        break;
      case 'municipality':
        onFiltersChange({
          province: filters.province,
          district: filters.district,
          municipality: filters.municipality
        });
        setWards([]);
        setVotingDistricts([]);
        break;
      case 'ward':
        onFiltersChange({
          province: filters.province,
          district: filters.district,
          municipality: filters.municipality,
          ward: filters.ward
        });
        setVotingDistricts([]);
        break;
      default:
        break;
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6">
              Geographic Distribution - {getCurrentLevel()}
            </Typography>
            {/* Breadcrumb Navigation */}
            {getBreadcrumbs().length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  South Africa
                </Typography>
                {getBreadcrumbs().map((crumb, index) => (
                  <Box key={crumb.level} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      →
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => handleBreadcrumbClick(crumb.level)}
                      sx={{
                        minWidth: 'auto',
                        p: 0.5,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        fontWeight: index === getBreadcrumbs().length - 1 ? 600 : 400
                      }}
                    >
                      {crumb.label}
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Back Button */}
            {(filters.province || filters.district || filters.municipality || filters.ward) && (
              <IconButton
                size="small"
                onClick={goBack}
                title="Go back one level"
                sx={{ mr: 1 }}
              >
                <ArrowBack />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => setChartType(chartType === 'pie' ? 'bar' : 'pie')}
              title={`Switch to ${chartType === 'pie' ? 'Bar' : 'Pie'} Chart`}
            >
              {chartType === 'pie' ? <BarChartIcon /> : <PieChartIcon />}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          {/* Chart Visualization */}
          {currentData.length > 0 ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Total Members: {totalMembers.toLocaleString()} • Click on chart segments to drill down
                {totalMembers === 0 && ' (No data available - showing structure)'}
                {chartType === 'bar' && currentData.length > itemsPerPage && (
                  <span> • Use pagination controls to navigate through all {currentData.length} items</span>
                )}
              </Typography>
              {renderChart()}
            </Box>
          ) : (
            <Box sx={{ mb: 3, textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No geographic data available
              </Typography>
            </Box>
          )}

          {/* Loading State */}
          {(isLoading || currentData.length === 0) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {isLoading ? 'Loading geographic data...' : 'No data available for the selected area'}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Province Context Banner for Provincial Admins */}
          <ProvinceContextBanner variant="banner" sx={{ mb: 2 }} />

          {/* Cascading Filters */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              {(provinceContext.shouldRestrictToProvince && provinceContext.assignedProvince) ||
               (municipalityContext.shouldRestrictToMunicipality && municipalityContext.assignedProvince) ? (
                // Provincial Admin or Municipality Admin - Show locked province
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Province (Restricted)
                  </Typography>
                  <Alert
                    severity="info"
                    variant="outlined"
                    sx={{
                      '& .MuiAlert-message': {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }
                    }}
                  >
                    <strong>{provinceContext.assignedProvince?.name || municipalityContext.assignedProvince?.name}</strong>
                    <Chip size="small" label="Locked" color="primary" />
                  </Alert>
                </Box>
              ) : (
                // National Admin - Show province selector
                <FormControl fullWidth size="small">
                  <InputLabel>Province</InputLabel>
                  <Select
                    value={filters.province || ''}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    label="Province"
                  >
                    <MenuItem value="">All Provinces</MenuItem>
                    {provinceStats?.data?.map((province: any) => (
                      <MenuItem key={province.province_code} value={province.province_code}>
                        {province.province_name} ({province.member_count})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Grid>

            {filters.province && (
              <Grid item xs={12} sm={6} md={3}>
                {municipalityContext.shouldRestrictToMunicipality && municipalityContext.assignedDistrict ? (
                  // Municipality Admin - Show locked district
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      District (Restricted)
                    </Typography>
                    <Alert
                      severity="info"
                      variant="outlined"
                      sx={{
                        '& .MuiAlert-message': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }
                      }}
                    >
                      <strong>{municipalityContext.assignedDistrict.name}</strong>
                      <Chip size="small" label="Locked" color="primary" />
                    </Alert>
                  </Box>
                ) : (
                  <FormControl fullWidth size="small">
                    <InputLabel>District</InputLabel>
                    <Select
                      value={filters.district || ''}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      label="District"
                    >
                      <MenuItem value="">All Districts</MenuItem>
                      {Array.isArray(districts) && districts.map((district) => (
                        <MenuItem key={district.district_code} value={district.district_code}>
                          {district.district_name} ({district.member_count})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Grid>
            )}

            {filters.district && (
              <Grid item xs={12} sm={6} md={3}>
                {municipalityContext.shouldRestrictToMunicipality && municipalityContext.assignedMunicipality ? (
                  // Municipality Admin - Show locked municipality
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Municipality (Restricted)
                    </Typography>
                    <Alert
                      severity="info"
                      variant="outlined"
                      sx={{
                        '& .MuiAlert-message': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }
                      }}
                    >
                      <strong>{municipalityContext.assignedMunicipality.name}</strong>
                      <Chip size="small" label="Locked" color="primary" />
                    </Alert>
                  </Box>
                ) : (
                  <FormControl fullWidth size="small">
                    <InputLabel>Municipality</InputLabel>
                    <Select
                      value={filters.municipality || ''}
                      onChange={(e) => handleMunicipalityChange(e.target.value)}
                      label="Municipality"
                    >
                      <MenuItem value="">All Municipalities</MenuItem>
                      {Array.isArray(municipalities) && municipalities.map((municipality) => (
                        <MenuItem key={municipality.municipality_code} value={municipality.municipality_code}>
                          {municipality.municipality_name} ({municipality.member_count})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Grid>
            )}

            {filters.municipality && (
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ward</InputLabel>
                  <Select
                    value={filters.ward || ''}
                    onChange={(e) => handleWardChange(e.target.value)}
                    label="Ward"
                  >
                    <MenuItem value="">All Wards</MenuItem>
                    {Array.isArray(wards) && wards.map((ward) => (
                      <MenuItem key={ward.ward_code} value={ward.ward_code}>
                        {ward.ward_name || `Ward ${ward.ward_code}`} ({ward.member_count})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>

          {/* Active Filters */}
          {(filters.province || filters.district || filters.municipality || filters.ward) && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Active Filters:
              </Typography>
              {filters.province && (
                <Chip
                  label={`Province: ${provinceStats?.data?.find((p: any) => p.province_code === filters.province)?.province_name}`}
                  size="small"
                  onDelete={() => handleProvinceChange('')}
                />
              )}
              {filters.district && (
                <Chip
                  label={`District: ${Array.isArray(districts) ? districts.find(d => d.district_code === filters.district)?.district_name : filters.district}`}
                  size="small"
                  onDelete={() => handleDistrictChange('')}
                />
              )}
              {filters.municipality && (
                <Chip
                  label={`Municipality: ${Array.isArray(municipalities) ? municipalities.find(m => m.municipality_code === filters.municipality)?.municipality_name : filters.municipality}`}
                  size="small"
                  onDelete={() => handleMunicipalityChange('')}
                />
              )}
              {filters.ward && (
                <Chip
                  label={`Ward: ${Array.isArray(wards) ? wards.find(w => w.ward_code === filters.ward)?.ward_name || filters.ward : filters.ward}`}
                  size="small"
                  onDelete={() => handleWardChange('')}
                />
              )}
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={clearFilters}
                variant="outlined"
              >
                Clear All
              </Button>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default GeographicFilter;
