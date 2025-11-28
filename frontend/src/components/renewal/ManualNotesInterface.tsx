/**
 * Manual Notes Interface Component
 * Comprehensive interface for managing manual notes on renewals
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add,
  NoteAdd,
  CheckCircle,
  Warning,
  Info,
  Error as ErrorIcon,
  Refresh,
  CalendarToday,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  addManualNote,
  getRenewalNotes,
  getPendingFollowUps,
  completeFollowUp,
} from '../../services/renewalBulkUploadService';
import type { ManualNote } from '../../types/renewalBulkUpload';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notes-tabpanel-${index}`}
      aria-labelledby={`notes-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ManualNotesInterfaceProps {
  renewalId?: number;
  memberId?: number;
  showAddButton?: boolean;
}

const ManualNotesInterface: React.FC<ManualNotesInterfaceProps> = ({
  renewalId,
  memberId,
  showAddButton = true,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [notes, setNotes] = useState<ManualNote[]>([]);
  const [followUpNotes, setFollowUpNotes] = useState<ManualNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    renewal_id: renewalId || 0,
    member_id: memberId || 0,
    note_type: 'General' as 'General' | 'Issue' | 'Follow-up' | 'Resolution',
    note_priority: 'Medium' as 'Low' | 'Medium' | 'High',
    note_content: '',
    is_internal: false,
    requires_follow_up: false,
    follow_up_date: null as Date | null,
  });

  useEffect(() => {
    if (renewalId) {
      fetchNotes();
    }
  }, [renewalId]);

  const fetchNotes = async () => {
    if (!renewalId) return;

    setLoading(true);
    try {
      const response = await getRenewalNotes(renewalId);
      if (response.success) {
        setNotes(response.data.notes || []);
        // Filter notes requiring follow-up
        const followUps = (response.data.notes || []).filter(
          (note) => note.requires_followup && !note.followup_completed
        );
        setFollowUpNotes(followUps);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to fetch notes');
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
      const response = await addManualNote(
        formData.renewal_id,
        formData.member_id,
        {
          note_type: formData.note_type,
          note_priority: formData.note_priority,
          note_content: formData.note_content,
          is_internal: formData.is_internal,
          requires_follow_up: formData.requires_follow_up,
          follow_up_date: formData.follow_up_date?.toISOString(),
        }
      );

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
      renewal_id: renewalId || 0,
      member_id: memberId || 0,
      note_type: 'General',
      note_priority: 'Medium',
      note_content: '',
      is_internal: false,
      requires_follow_up: false,
      follow_up_date: null,
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Manual Notes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add and manage notes for renewal records
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {showAddButton && (
            <Button
              variant="contained"
              startIcon={<NoteAdd />}
              onClick={() => setShowAddDialog(true)}
              disabled={!renewalId || !memberId}
            >
              Add Note
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchNotes}
            disabled={!renewalId}
          >
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

      {/* Tabs */}
      <Paper>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="notes tabs">
          <Tab label={`All Notes (${notes.length})`} />
          <Tab label={`Follow-ups (${followUpNotes.length})`} />
        </Tabs>

        {/* All Notes Tab */}
        <TabPanel value={activeTab} index={0}>
          {notes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              {loading ? 'Loading...' : 'No notes found'}
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {notes.map((note) => (
                <Grid item xs={12} key={note.note_id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                          {note.followup_completed && (
                            <Chip
                              label="Follow-up Complete"
                              color="success"
                              size="small"
                              icon={<CheckCircle />}
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          By: {note.created_by_name || 'Unknown'}
                        </Typography>
                        {note.followup_date && (
                          <Typography variant="caption" color="text.secondary">
                            Follow-up: {new Date(note.followup_date).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Follow-ups Tab */}
        <TabPanel value={activeTab} index={1}>
          {followUpNotes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              No pending follow-ups
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {followUpNotes.map((note) => (
                <Grid item xs={12} key={note.note_id}>
                  <Card variant="outlined" sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(note.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {note.note_content}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          By: {note.created_by_name || 'Unknown'}
                        </Typography>
                        {note.followup_date && (
                          <Chip
                            label={`Due: ${new Date(note.followup_date).toLocaleDateString()}`}
                            color="warning"
                            size="small"
                            icon={<CalendarToday />}
                          />
                        )}
                      </Box>
                    </CardContent>
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
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Paper>

      {/* Add Note Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Manual Note</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
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
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.requires_follow_up}
                    onChange={(e) => setFormData({ ...formData, requires_follow_up: e.target.checked })}
                  />
                }
                label="Requires Follow-up"
              />
            </Grid>
            {formData.requires_follow_up && (
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Follow-up Date"
                    value={formData.follow_up_date}
                    onChange={(newValue) => setFormData({ ...formData, follow_up_date: newValue })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddNote}
            variant="contained"
            disabled={loading || !formData.note_content.trim()}
            startIcon={<Add />}
          >
            {loading ? 'Adding...' : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManualNotesInterface;

