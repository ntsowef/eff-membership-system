/**
 * Manual Notes Tab Component
 * Displays all manual notes across all renewals with comprehensive filtering
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Refresh,
  Search,
  CheckCircle,
  Warning,
  Info,
  CalendarToday,
  NoteAdd,
  Add,
} from '@mui/icons-material';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  getPendingFollowUps,
  completeFollowUp,
  addManualNote,
} from '../../services/renewalBulkUploadService';
import type { ManualNote } from '../../types/renewalBulkUpload';

const ManualNotesTab: React.FC = () => {
  const [notes, setNotes] = useState<ManualNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<ManualNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state for adding notes
  const [formData, setFormData] = useState({
    renewal_id: 0,
    member_id: 0,
    note_type: 'General' as 'General' | 'Issue' | 'Follow-up' | 'Resolution',
    note_priority: 'Medium' as 'Low' | 'Medium' | 'High',
    note_content: '',
    requires_follow_up: false,
    follow_up_date: null as Date | null,
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    filterNotes();
  }, [notes, typeFilter, priorityFilter, searchQuery]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await getPendingFollowUps();
      if (response.success) {
        setNotes(response.data.notes || []);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((note) => note.note_type === typeFilter);
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((note) => note.priority === priorityFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.note_content.toLowerCase().includes(query) ||
          note.member_name?.toLowerCase().includes(query) ||
          note.created_by_name?.toLowerCase().includes(query)
      );
    }

    setFilteredNotes(filtered);
    setPage(1); // Reset to first page when filters change
  };

  const handleCompleteFollowUp = async (noteId: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await completeFollowUp(noteId);
      if (response.success) {
        setSuccessMessage('Follow-up marked as complete');
        fetchNotes();
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to complete follow-up');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!formData.note_content.trim()) {
      setErrorMessage('Note content is required');
      return;
    }

    if (!formData.renewal_id || !formData.member_id) {
      setErrorMessage('Renewal ID and Member ID are required');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await addManualNote(formData.renewal_id, formData.member_id, {
        note_type: formData.note_type,
        note_content: formData.note_content,
        requires_follow_up: formData.requires_follow_up,
        follow_up_date: formData.follow_up_date?.toISOString(),
      } as any);

      if (response.success) {
        setSuccessMessage('Note added successfully');
        setShowAddDialog(false);
        resetForm();
        fetchNotes();
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      renewal_id: 0,
      member_id: 0,
      note_type: 'General',
      note_priority: 'Medium',
      note_content: '',
      requires_follow_up: false,
      follow_up_date: null,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Issue':
        return <Warning />;
      case 'Follow-up':
        return <CalendarToday />;
      case 'Resolution':
        return <CheckCircle />;
      default:
        return <Info />;
    }
  };

  const getTypeColor = (type: string): 'error' | 'warning' | 'info' | 'success' => {
    switch (type) {
      case 'Issue':
        return 'error';
      case 'Follow-up':
        return 'warning';
      case 'Resolution':
        return 'success';
      default:
        return 'info';
    }
  };

  const getPriorityColor = (priority: string): 'error' | 'warning' | 'info' => {
    switch (priority) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const paginatedNotes = filteredNotes.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Manual Notes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage notes and follow-ups across all renewals
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<NoteAdd />}
            onClick={() => setShowAddDialog(true)}
          >
            Add Note
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchNotes}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search by content, member, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Note Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Note Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="General">General</MenuItem>
                <MenuItem value="Issue">Issue</MenuItem>
                <MenuItem value="Follow-up">Follow-up</MenuItem>
                <MenuItem value="Resolution">Resolution</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                label="Priority"
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Notes Grid */}
      {paginatedNotes.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            {loading ? 'Loading...' : 'No notes found'}
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={2}>
            {paginatedNotes.map((note) => (
              <Grid item xs={12} key={note.note_id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          icon={getTypeIcon(note.note_type)}
                          label={note.note_type}
                          color={getTypeColor(note.note_type)}
                          size="small"
                        />
                        <Chip
                          label={note.priority}
                          color={getPriorityColor(note.priority)}
                          size="small"
                        />
                        {note.requires_followup && !note.followup_completed && (
                          <Chip
                            label="Requires Follow-up"
                            color="warning"
                            size="small"
                            icon={<CalendarToday />}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(note.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {note.note_content}
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Member: {note.member_name || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          By: {note.created_by_name || 'Unknown'}
                        </Typography>
                      </Grid>
                      {note.followup_date && (
                        <Grid item xs={12}>
                          <Chip
                            label={`Follow-up: ${new Date(note.followup_date).toLocaleDateString()}`}
                            color="warning"
                            size="small"
                            icon={<CalendarToday />}
                          />
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                  {note.requires_followup && !note.followup_completed && (
                    <CardActions>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={() => handleCompleteFollowUp(note.note_id)}
                        disabled={loading}
                      >
                        Mark Complete
                      </Button>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Add Note Dialog - Similar to ManualNotesInterface */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Manual Note</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Renewal ID *"
                value={formData.renewal_id || ''}
                onChange={(e) => setFormData({ ...formData, renewal_id: parseInt(e.target.value) || 0 })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Member ID *"
                value={formData.member_id || ''}
                onChange={(e) => setFormData({ ...formData, member_id: parseInt(e.target.value) || 0 })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Note Type</InputLabel>
                <Select
                  value={formData.note_type}
                  onChange={(e) => setFormData({ ...formData, note_type: e.target.value as any })}
                  label="Note Type"
                >
                  <MenuItem value="General">General</MenuItem>
                  <MenuItem value="Issue">Issue</MenuItem>
                  <MenuItem value="Follow-up">Follow-up</MenuItem>
                  <MenuItem value="Resolution">Resolution</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.note_priority}
                  onChange={(e) => setFormData({ ...formData, note_priority: e.target.value as any })}
                  label="Priority"
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Note Content *"
                value={formData.note_content}
                onChange={(e) => setFormData({ ...formData, note_content: e.target.value })}
                placeholder="Enter note details..."
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddNote}
            variant="contained"
            disabled={loading || !formData.note_content.trim() || !formData.renewal_id || !formData.member_id}
            startIcon={<Add />}
          >
            {loading ? 'Adding...' : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManualNotesTab;

