import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
} from '@mui/material';
import {
  Storage,
  Refresh,
  Add,
  Edit,
  Delete,
  CloudUpload,
  CloudDownload,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/ui/PageHeader';
import ActionButton from '../../components/ui/ActionButton';
import { SuperAdminAPI } from '../../lib/superAdminApi';
import { useNotification } from '../../hooks/useNotification';

const LookupDataManagement: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  const [selectedTable, setSelectedTable] = useState<string>('provinces');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Fetch lookup tables
  const { data: tablesData } = useQuery({
    queryKey: ['lookupTables'],
    queryFn: () => SuperAdminAPI.getLookupTables(),
  });

  // Fetch lookup entries
  const { data: entriesData, isLoading, refetch } = useQuery({
    queryKey: ['lookupEntries', selectedTable],
    queryFn: () => SuperAdminAPI.getLookupEntries(selectedTable),
    enabled: !!selectedTable,
  });

  const tables = tablesData?.data || [];
  const entries = entriesData?.data?.entries || [];

  // Get current table metadata - prioritize entries response as it's always fresh
  const currentTable = entriesData?.data ? {
    key: selectedTable,
    id_column: entriesData.data.id_column,
    name_column: entriesData.data.name_column,
    code_column: entriesData.data.code_column,
    display_name: entriesData.data.display_name
  } : tables.find((t: any) => t.key === selectedTable);

  // Add entry mutation
  const addMutation = useMutation({
    mutationFn: (data: any) => SuperAdminAPI.addLookupEntry(selectedTable, data),
    onSuccess: () => {
      showSuccess('Entry added successfully');
      queryClient.invalidateQueries({ queryKey: ['lookupEntries', selectedTable] });
      setAddDialogOpen(false);
      setFormData({});
    },
    onError: () => {
      showError('Failed to add entry');
    },
  });

  // Update entry mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => SuperAdminAPI.updateLookupEntry(selectedTable, Number(id), data),
    onSuccess: () => {
      showSuccess('Entry updated successfully');
      queryClient.invalidateQueries({ queryKey: ['lookupEntries', selectedTable] });
      setEditDialogOpen(false);
      setSelectedEntry(null);
      setFormData({});
    },
    onError: () => {
      showError('Failed to update entry');
    },
  });

  // Delete entry mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => SuperAdminAPI.deleteLookupEntry(selectedTable, Number(id)),
    onSuccess: () => {
      showSuccess('Entry deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['lookupEntries', selectedTable] });
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
    },
    onError: () => {
      showError('Failed to delete entry');
    },
  });

  const handleAddClick = () => {
    setFormData({});
    setAddDialogOpen(true);
  };

  const handleEditClick = (entry: any) => {
    setSelectedEntry(entry);
    setFormData(entry);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (entry: any) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleAddSubmit = () => {
    addMutation.mutate(formData);
  };

  const handleEditSubmit = () => {
    if (selectedEntry && currentTable) {
      const idColumn = currentTable.id_column;
      const entryId = selectedEntry[idColumn];

      console.log('Edit - currentTable:', currentTable);
      console.log('Edit - idColumn:', idColumn);
      console.log('Edit - selectedEntry:', selectedEntry);
      console.log('Edit - entryId:', entryId);

      if (!entryId) {
        showError(`Cannot find ID column '${idColumn}' in entry`);
        return;
      }

      updateMutation.mutate({ id: entryId, data: formData });
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedEntry && currentTable) {
      const idColumn = currentTable.id_column;
      const entryId = selectedEntry[idColumn];

      console.log('Delete - currentTable:', currentTable);
      console.log('Delete - idColumn:', idColumn);
      console.log('Delete - selectedEntry:', selectedEntry);
      console.log('Delete - entryId:', entryId);

      if (!entryId) {
        showError(`Cannot find ID column '${idColumn}' in entry`);
        return;
      }

      deleteMutation.mutate(entryId);
    }
  };

  const handleExport = async () => {
    try {
      const response = await SuperAdminAPI.exportLookupData(selectedTable);
      // Create download link
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}_export.json`;
      a.click();
      showSuccess('Data exported successfully');
    } catch (error) {
      showError('Failed to export data');
    }
  };

  const renderTableColumns = () => {
    if (!currentTable || entries.length === 0) return null;

    const sampleEntry = entries[0];
    return Object.keys(sampleEntry).map((key) => (
      <TableCell key={key} sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
        {key.replace(/_/g, ' ')}
      </TableCell>
    ));
  };

  const renderTableRows = () => {
    if (!currentTable) return null;

    return entries.map((entry: any) => (
      <TableRow
        key={entry[currentTable.id_column]}
        sx={{
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
          },
        }}
      >
        {Object.entries(entry).map(([key, value]: [string, any]) => (
          <TableCell key={key}>
            {typeof value === 'boolean' ? (
              <Chip
                label={value ? 'Active' : 'Inactive'}
                size="small"
                color={value ? 'success' : 'default'}
                sx={{ borderRadius: '50px' }}
              />
            ) : (
              value?.toString() || 'N/A'
            )}
          </TableCell>
        ))}
        <TableCell align="right">
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleEditClick(entry)} sx={{ mr: 1 }}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => handleDeleteClick(entry)} color="error">
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
    ));
  };

  const renderFormFields = () => {
    if (!currentTable || entries.length === 0) return null;

    const sampleEntry = entries[0];
    return Object.keys(sampleEntry)
      .filter((key) => key !== currentTable.id_column && key !== 'created_at' && key !== 'updated_at')
      .map((key) => {
        const value = formData[key];
        const isBoolean = typeof sampleEntry[key] === 'boolean';

        if (isBoolean) {
          return (
            <FormControl key={key} fullWidth sx={{ mb: 2 }}>
              <InputLabel>{key.replace(/_/g, ' ')}</InputLabel>
              <Select
                value={value === undefined ? true : value}
                label={key.replace(/_/g, ' ')}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
              >
                <MenuItem value={true as any}>Active</MenuItem>
                <MenuItem value={false as any}>Inactive</MenuItem>
              </Select>
            </FormControl>
          );
        }

        return (
          <TextField
            key={key}
            label={key.replace(/_/g, ' ')}
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />
        );
      });
  };

  return (
    <Box>
      <PageHeader
        title="Lookup Data Management"
        subtitle="Manage system reference data and lookup tables"
        gradient
        actions={[
          <ActionButton key="export" icon={CloudDownload} onClick={handleExport} variant="outlined">
            Export
          </ActionButton>,
          <ActionButton key="add" icon={Add} onClick={handleAddClick} variant="contained">
            Add Entry
          </ActionButton>,
        ]}
      />

      {/* Table Selector */}
      <Box sx={{ mb: 4 }}>
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel>Select Lookup Table</InputLabel>
          <Select
            value={selectedTable}
            label="Select Lookup Table"
            onChange={(e) => setSelectedTable(e.target.value)}
            sx={{ borderRadius: '50px' }}
          >
            {tables.map((table: any) => (
              <MenuItem key={table.key} value={table.key}>
                {table.display_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Entries Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={60} />
        </Box>
      ) : entries.length === 0 ? (
        <Alert severity="info">No entries found in this table.</Alert>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: '16px',
            boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.02) }}>
                {renderTableColumns()}
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{renderTableRows()}</TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Entry</DialogTitle>
        <DialogContent>{renderFormFields()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSubmit} variant="contained" disabled={addMutation.isPending}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Entry</DialogTitle>
        <DialogContent>{renderFormFields()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={updateMutation.isPending}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Entry</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this entry? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleteMutation.isPending}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LookupDataManagement;

