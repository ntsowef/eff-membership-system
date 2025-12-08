import React, { useState } from 'react';
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
  Tabs,
  Tab,
  Button,
  Chip,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { delegatesManagementApi } from '../../services/delegatesManagementApi';

// Unused TabPanel interface and component - kept for future use
// interface TabPanelProps {
//   children?: React.ReactNode;
//   index: number;
//   value: number;
// }
// const TabPanel: React.FC<TabPanelProps> = (props) => {
//   const { children, value, index, ...other } = props;

//   return (
//     <div
//       role="tabpanel"
//       hidden={value !== index}
//       id={`conference-tabpanel-${index}`}
//       aria-labelledby={`conference-tab-${index}`}
//       {...other}
//     >
//       {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
//     </div>
//   );
// }

const ConferenceDelegatesTab: React.FC = () => {
  const [activeConference, setActiveConference] = useState(0);

  const conferences = ['SRPA', 'PPA', 'NPA'];
  const currentConference = conferences[activeConference];

  // Fetch conference delegates
  const { data: conferenceData, isLoading, error } = useQuery({
    queryKey: ['conference-delegates', currentConference],
    queryFn: () => delegatesManagementApi.getDelegatesByConference(currentConference),
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveConference(newValue);
  };

  const handleExportList = () => {
    if (!conferenceData || conferenceData.delegates.length === 0) return;

    // Create CSV content
    const headers = ['Member Name', 'ID Number', 'Ward', 'Municipality', 'Province', 'Cell Number', 'Email', 'Selection Date'];
    const rows = conferenceData.delegates.map((delegate: any) => [
      delegate.member_name,
      delegate.id_number,
      delegate.ward_name,
      delegate.municipality_name,
      delegate.province_name,
      delegate.cell_number || '',
      delegate.email || '',
      new Date(delegate.selection_date).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentConference}_Delegates_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Conference Delegates
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExportList}
          disabled={!conferenceData || conferenceData.delegates.length === 0}
        >
          Export List
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeConference} onChange={handleTabChange} aria-label="conference tabs">
          <Tab label="SRPA (Sub-Regional)" />
          <Tab label="PPA (Provincial)" />
          <Tab label="NPA (National)" />
        </Tabs>
      </Paper>

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">
          Failed to load conference delegates. Please try again later.
        </Alert>
      ) : !conferenceData || conferenceData.delegates.length === 0 ? (
        <Alert severity="info">
          No delegates assigned for {currentConference} conference yet.
        </Alert>
      ) : (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>{conferenceData.total_delegates}</strong> delegates assigned for {conferenceData.assembly_name}
            </Typography>
          </Alert>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member Name</TableCell>
                  <TableCell>ID Number</TableCell>
                  <TableCell>Ward</TableCell>
                  <TableCell>Municipality</TableCell>
                  <TableCell>Province</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Selection Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conferenceData.delegates.map((delegate: any) => (
                  <TableRow key={delegate.delegate_id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {delegate.member_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{delegate.id_number}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{delegate.ward_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {delegate.ward_code}
                      </Typography>
                    </TableCell>
                    <TableCell>{delegate.municipality_name}</TableCell>
                    <TableCell>
                      <Chip label={delegate.province_name} size="small" />
                    </TableCell>
                    <TableCell>
                      {delegate.cell_number && (
                        <Typography variant="caption" display="block">
                          📱 {delegate.cell_number}
                        </Typography>
                      )}
                      {delegate.email && (
                        <Typography variant="caption" display="block">
                          ✉️ {delegate.email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(delegate.selection_date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default ConferenceDelegatesTab;

