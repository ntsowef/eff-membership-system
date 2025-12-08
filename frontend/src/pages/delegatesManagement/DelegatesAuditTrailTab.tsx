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
  TablePagination,
  Chip,
  Typography,
  IconButton,
  Collapse,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getAllDelegateAuditLogs } from '../../services/auditLogsApi';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { format } from 'date-fns';

interface DelegatesAuditTrailTabProps {
  filters?: any;
}

const DelegatesAuditTrailTab: React.FC<DelegatesAuditTrailTabProps> = ({ filters }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Fetch audit logs
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['delegateAuditLogs', filters, actionFilter],
    queryFn: () => getAllDelegateAuditLogs({
      action: actionFilter || undefined
    })
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getActionColor = (action: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    if (action.includes('assigned')) return 'success';
    if (action.includes('updated') || action.includes('changed')) return 'warning';
    if (action.includes('removed') || action.includes('deleted')) return 'error';
    return 'info';
  };

  const getActionLabel = (action: string): string => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatJsonData = (data: any): string => {
    if (!data) return 'N/A';
    return JSON.stringify(data, null, 2);
  };

  const paginatedLogs = auditLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Filter by Action"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(0);
                }}
                size="small"
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="delegate_assigned">Delegate Assigned</MenuItem>
                <MenuItem value="delegate_updated">Delegate Updated</MenuItem>
                <MenuItem value="delegate_removed">Delegate Removed</MenuItem>
                <MenuItem value="delegate_status_changed">Status Changed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="body2" color="text.secondary">
                Showing {paginatedLogs.length} of {auditLogs.length} audit trail entries
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Audit Trail Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50} />
              <TableCell>Date & Time</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Delegate ID</TableCell>
              <TableCell>Performed By</TableCell>
              <TableCell>IP Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography>Loading audit trail...</Typography>
                </TableCell>
              </TableRow>
            ) : paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography>No audit trail entries found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        {expandedRow === log.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getActionLabel(log.action)}
                        color={getActionColor(log.action)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{log.entity_id || 'N/A'}</TableCell>
                    <TableCell>
                      {log.user_name || log.user_email || `User ID: ${log.user_id}` || 'System'}
                    </TableCell>
                    <TableCell>{log.ip_address || 'N/A'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                      <Collapse in={expandedRow === log.id} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Audit Details
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Previous Values
                                </Typography>
                                <pre style={{
                                  fontSize: '0.75rem',
                                  overflow: 'auto',
                                  maxHeight: '200px',
                                  margin: 0
                                }}>
                                  {formatJsonData(log.old_values)}
                                </pre>
                              </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  New Values
                                </Typography>
                                <pre style={{
                                  fontSize: '0.75rem',
                                  overflow: 'auto',
                                  maxHeight: '200px',
                                  margin: 0
                                }}>
                                  {formatJsonData(log.new_values)}
                                </pre>
                              </Paper>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Session ID:</strong> {log.session_id || 'N/A'} |
                                <strong> User Agent:</strong> {log.user_agent || 'N/A'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={auditLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
};

export default DelegatesAuditTrailTab;

