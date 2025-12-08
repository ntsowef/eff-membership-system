import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { delegatesManagementApi } from '../../services/delegatesManagementApi';

interface DelegatesSummaryTabProps {
  filters: {
    province_code?: string;
    district_code?: string;
  };
}

interface GroupedData {
  [province: string]: {
    province_code: string;
    province_name: string;
    municipalities: any[];
    totals: {
      total_wards: number;
      compliant_wards: number;
      total_srpa_delegates: number;
      total_ppa_delegates: number;
      total_npa_delegates: number;
      total_delegates: number;
    };
  };
}

const DelegatesSummaryTab: React.FC<DelegatesSummaryTabProps> = ({ filters }) => {
  const [expandedProvinces, setExpandedProvinces] = React.useState<Set<string>>(new Set());

  // Fetch summary data
  const { data: summaryData = [], isLoading, error } = useQuery({
    queryKey: ['delegate-summary', filters],
    queryFn: () => delegatesManagementApi.getDelegateSummary(filters),
  });

  // Group data by province
  const groupedData = useMemo(() => {
    const grouped: GroupedData = {};

    summaryData.forEach((item: any) => {
      const provinceName = item.province_name || 'Unknown Province';

      if (!grouped[provinceName]) {
        grouped[provinceName] = {
          province_code: item.province_code,
          province_name: provinceName,
          municipalities: [],
          totals: {
            total_wards: 0,
            compliant_wards: 0,
            total_srpa_delegates: 0,
            total_ppa_delegates: 0,
            total_npa_delegates: 0,
            total_delegates: 0,
          },
        };
      }

      grouped[provinceName].municipalities.push(item);
      grouped[provinceName].totals.total_wards += parseInt(item.total_wards) || 0;
      grouped[provinceName].totals.compliant_wards += parseInt(item.compliant_wards) || 0;
      grouped[provinceName].totals.total_srpa_delegates += parseInt(item.total_srpa_delegates) || 0;
      grouped[provinceName].totals.total_ppa_delegates += parseInt(item.total_ppa_delegates) || 0;
      grouped[provinceName].totals.total_npa_delegates += parseInt(item.total_npa_delegates) || 0;
      grouped[provinceName].totals.total_delegates += parseInt(item.total_delegates) || 0;
    });

    return grouped;
  }, [summaryData]);

  const toggleProvince = (provinceName: string) => {
    setExpandedProvinces((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(provinceName)) {
        newSet.delete(provinceName);
      } else {
        newSet.add(provinceName);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load delegate summary. Please try again later.
      </Alert>
    );
  }

  if (summaryData.length === 0) {
    return (
      <Alert severity="info">
        No summary data available for the selected filters.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Delegate Summary by Region
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Region</TableCell>
              <TableCell align="center">Total Wards</TableCell>
              <TableCell align="center">Compliant Wards</TableCell>
              <TableCell align="center">SRPA</TableCell>
              <TableCell align="center">PPA</TableCell>
              <TableCell align="center">NPA</TableCell>
              <TableCell align="center">Total Delegates</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(groupedData).map(([provinceName, provinceData]) => (
              <React.Fragment key={provinceName}>
                {/* Province Row */}
                <TableRow sx={{ bgcolor: '#e3f2fd', '& > *': { fontWeight: 'bold' } }}>
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleProvince(provinceName)}>
                      {expandedProvinces.has(provinceName) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{provinceName}</TableCell>
                  <TableCell align="center">{provinceData.totals.total_wards}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={provinceData.totals.compliant_wards}
                      size="small"
                      color="success"
                    />
                  </TableCell>
                  <TableCell align="center">{provinceData.totals.total_srpa_delegates}</TableCell>
                  <TableCell align="center">{provinceData.totals.total_ppa_delegates}</TableCell>
                  <TableCell align="center">{provinceData.totals.total_npa_delegates}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={provinceData.totals.total_delegates}
                      size="small"
                      color="primary"
                    />
                  </TableCell>
                </TableRow>

                {/* Municipality Rows */}
                {provinceData.municipalities.map((muni: any) => (
                  <TableRow key={muni.municipality_code} sx={{ display: expandedProvinces.has(provinceName) ? 'table-row' : 'none' }}>
                    <TableCell></TableCell>
                    <TableCell sx={{ pl: 4 }}>{muni.municipality_name}</TableCell>
                    <TableCell align="center">{muni.total_wards}</TableCell>
                    <TableCell align="center">{muni.compliant_wards}</TableCell>
                    <TableCell align="center">{muni.total_srpa_delegates}</TableCell>
                    <TableCell align="center">{muni.total_ppa_delegates}</TableCell>
                    <TableCell align="center">{muni.total_npa_delegates}</TableCell>
                    <TableCell align="center">{muni.total_delegates}</TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DelegatesSummaryTab;

