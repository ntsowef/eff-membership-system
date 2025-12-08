import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  InputAdornment,

  Stack,
} from '@mui/material';
import {
  Search,
  FilterList,

  PictureAsPdf,
  TableChart,
  Refresh,
  Person,
  LocationOn,
  Phone,
  Email,
  Clear,

} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Extend jsPDF type to include autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface Member {
  member_id: number;
  membership_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  id_number: string;
  membership_status: string;
  membership_type: string;
  province_name: string;
  district_name: string;
  municipality_name: string;
  ward_name: string;
  voting_district_name: string;
  created_at: string;
  last_updated: string;
}

interface MemberDirectoryFilters {
  search?: string;
  province?: string;
  district?: string;
  municipality?: string;
  ward?: string;
  membership_status?: string;
  membership_type?: string;
  gender?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

const MemberDirectory: React.FC = () => {
  const [filters, setFilters] = useState<MemberDirectoryFilters>({
    page: 0,
    limit: 25,
    sort_by: 'last_name',
    sort_order: 'asc'
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch member directory data
  const { data: memberData, isLoading, error, refetch } = useQuery({
    queryKey: ['member-directory', filters, refreshKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
      const response = await api.get(`/members/directory?${params.toString()}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['member-directory-filters'],
    queryFn: async () => {
      const response = await api.get('/members/directory/filters');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleFilterChange = (key: keyof MemberDirectoryFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 0 : value // Reset page when other filters change
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      page: 0,
      limit: 25,
      sort_by: 'last_name',
      sort_order: 'asc'
    });
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // Fetch all members for export (without pagination)
      const exportFilters = { ...filters };
      delete exportFilters.page;
      delete exportFilters.limit;
      
      const params = new URLSearchParams();
      Object.entries(exportFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await api.get(`/members/directory/export?${params.toString()}`);
      const allMembers = response.data.data.members;

      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      // Add title
      pdf.setFontSize(18);
      pdf.text('Member Directory Report', 20, 20);
      
      // Add generation info
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
      pdf.text(`Total Members: ${allMembers.length}`, 20, 35);
      
      // Prepare table data
      const tableData = allMembers.map((member: Member) => [
        member.membership_number,
        `${member.first_name} ${member.last_name}`,
        member.email,
        member.phone,
        member.membership_status,
        member.province_name,
        member.municipality_name,
        new Date(member.created_at).toLocaleDateString()
      ]);

      // Add table
      pdf.autoTable({
        head: [['Member #', 'Name', 'Email', 'Phone', 'Status', 'Province', 'Municipality', 'Joined']],
        body: tableData,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 45, right: 20, bottom: 20, left: 20 },
      });

      pdf.save(`member-directory-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Fetch all members for export (without pagination)
      const exportFilters = { ...filters };
      delete exportFilters.page;
      delete exportFilters.limit;
      
      const params = new URLSearchParams();
      Object.entries(exportFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await api.get(`/members/directory/export?${params.toString()}`);
      const allMembers = response.data.data.members;

      // Prepare Excel data
      const excelData = allMembers.map((member: Member) => ({
        'Member Number': member.membership_number,
        'First Name': member.first_name,
        'Last Name': member.last_name,
        'Email': member.email,
        'Phone': member.phone,
        'ID Number': member.id_number,
        'Date of Birth': member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : '',
        'Gender': member.gender,
        'Membership Status': member.membership_status,
        'Membership Type': member.membership_type,
        'Province': member.province_name,
        'District': member.district_name,
        'Municipality': member.municipality_name,
        'Ward': member.ward_name,
        'Voting District': member.voting_district_name,
        'Date Joined': new Date(member.created_at).toLocaleDateString(),
        'Last Updated': new Date(member.last_updated).toLocaleDateString()
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const colWidths = Object.keys(excelData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Member Directory');

      // Save file
      XLSX.writeFile(wb, `member-directory-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
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
        Failed to load member directory. Please try again.
      </Alert>
    );
  }

  const members = memberData?.data?.members || [];
  const totalCount = memberData?.data?.total || 0;
  const options = filterOptions?.data || {};

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Person color="primary" />
            Member Directory
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Complete directory of all members with contact details and geographic information
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={isExporting ? <CircularProgress size={16} /> : <PictureAsPdf />}
            onClick={exportToPDF}
            disabled={isExporting}
          >
            Export PDF
          </Button>
          <Button
            variant="contained"
            startIcon={isExporting ? <CircularProgress size={16} /> : <TableChart />}
            onClick={exportToExcel}
            disabled={isExporting}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList color="primary" />
            Filters & Search
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search Members"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: filters.search && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => handleFilterChange('search', '')}>
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                placeholder="Search by name, email, phone, or member number"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Province</InputLabel>
                <Select
                  value={filters.province || ''}
                  onChange={(e) => handleFilterChange('province', e.target.value)}
                  label="Province"
                >
                  <MenuItem value="">All Provinces</MenuItem>
                  {options.provinces?.map((province: any) => (
                    <MenuItem key={province.province_code} value={province.province_code}>
                      {province.province_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.membership_status || ''}
                  onChange={(e) => handleFilterChange('membership_status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={filters.gender || ''}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                  label="Gender"
                >
                  <MenuItem value="">All Genders</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearFilters}
                sx={{ height: '56px' }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {totalCount.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Members
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {members.filter((m: Member) => m.membership_status === 'Active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Members
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {new Set(members.map((m: Member) => m.province_name)).size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Provinces Covered
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {members.filter((m: Member) => m.membership_status === 'Pending').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Applications
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Member Table */}
      <Card ref={reportRef}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Member Directory ({totalCount.toLocaleString()} members)
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label={`Page ${(filters.page || 0) + 1} of ${Math.ceil(totalCount / (filters.limit || 25))}`}
                variant="outlined"
              />
              <Chip
                label={`Showing ${members.length} of ${totalCount}`}
                color="primary"
                variant="outlined"
              />
            </Stack>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member #</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Joined</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member: Member) => (
                  <TableRow key={member.member_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {member.membership_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {member.first_name[0]}{member.last_name[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {member.first_name} {member.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.gender} • {member.membership_type}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Email sx={{ fontSize: 14 }} color="action" />
                          <Typography variant="body2">
                            {member.email}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone sx={{ fontSize: 14 }} color="action" />
                          <Typography variant="body2">
                            {member.phone}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.membership_status}
                        color={
                          member.membership_status === 'Active' ? 'success' :
                          member.membership_status === 'Pending' ? 'warning' :
                          member.membership_status === 'Suspended' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn sx={{ fontSize: 14 }} color="action" />
                        <Box>
                          <Typography variant="body2">
                            {member.municipality_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.province_name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(member.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalCount}
            page={filters.page || 0}
            onPageChange={(_, newPage) => handleFilterChange('page', newPage)}
            rowsPerPage={filters.limit || 25}
            onRowsPerPageChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            rowsPerPageOptions={[10, 25, 50, 100]}
            showFirstButton
            showLastButton
          />
        </CardContent>
      </Card>

      {/* Report Footer */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          Member Directory Report
        </Typography>
        <Typography variant="body2">
          This member directory provides a comprehensive list of all registered members with their contact details
          and geographic information. Use the filters to narrow down the results and export the data in PDF or Excel format
          for further analysis or communication purposes.
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption">
            Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
          </Typography>
          <Typography variant="caption">
            Membership Management System - Member Directory v1.0
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default MemberDirectory;
