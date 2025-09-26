import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Event, Save, Cancel, ArrowBack } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { getMockMeetingById } from '../../lib/mockMeetingsData';

interface UpdateMeetingData {
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  virtual_meeting_link: string;
  meeting_status: string;
  max_attendees: number;
}

interface Meeting {
  id: number;
  title: string;
  description?: string;
  hierarchy_level: string;
  entity_id: number;
  meeting_type: string;
  start_datetime: string;
  end_datetime: string;
  location?: string;
  virtual_meeting_link?: string;
  meeting_status: string;
  max_attendees?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  entity_name?: string;
}

const MeetingEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<UpdateMeetingData>({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    location: '',
    virtual_meeting_link: '',
    meeting_status: 'Scheduled',
    max_attendees: 50,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch meeting details
  const { data: meetingData, isLoading: isLoadingMeeting, error: meetingError } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      try {
        return await apiGet(`/meetings/${id}`);
      } catch (error) {
        // Fallback to mock data for development when API fails
        console.log('API failed, using mock meeting data for development');
        return getMockMeetingById(parseInt(id || '1'));
      }
    },
    enabled: !!id,
  });

  const meeting = (meetingData as any)?.data?.meeting || (meetingData as any)?.meeting;

  // Populate form when meeting data is loaded
  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title || '',
        description: meeting.description || '',
        start_datetime: meeting.start_datetime ? new Date(meeting.start_datetime).toISOString().slice(0, 16) : '',
        end_datetime: meeting.end_datetime ? new Date(meeting.end_datetime).toISOString().slice(0, 16) : '',
        location: meeting.location || '',
        virtual_meeting_link: meeting.virtual_meeting_link || '',
        meeting_status: meeting.meeting_status || 'Scheduled',
        max_attendees: meeting.max_attendees || 50,
      });
    }
  }, [meeting]);

  // Update meeting mutation
  const updateMeetingMutation = useMutation({
    mutationFn: (data: UpdateMeetingData) => apiPut(`/meetings/${id}`, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
      navigate(`/admin/meetings/${id}`);
    },
    onError: (error: any) => {
      console.error('Failed to update meeting:', error);
      console.error('Error response:', error.response?.data);

      // Set form errors based on API response
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Failed to update meeting. Please check your input and try again.' });
      }
    },
  });

  const handleInputChange = (field: keyof UpdateMeetingData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Meeting title is required';
    }

    if (!formData.start_datetime) {
      newErrors.start_datetime = 'Start date and time is required';
    }

    if (!formData.end_datetime) {
      newErrors.end_datetime = 'End date and time is required';
    }

    if (formData.start_datetime && formData.end_datetime) {
      if (new Date(formData.end_datetime) <= new Date(formData.start_datetime)) {
        newErrors.end_datetime = 'End time must be after start time';
      }
    }

    if (formData.max_attendees && formData.max_attendees < 1) {
      newErrors.max_attendees = 'Maximum attendees must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Convert datetime strings to ISO format
    const submitData = {
      ...formData,
      start_datetime: new Date(formData.start_datetime).toISOString(),
      end_datetime: new Date(formData.end_datetime).toISOString(),
    };

    updateMeetingMutation.mutate(submitData);
  };

  if (isLoadingMeeting) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (meetingError || !meeting) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load meeting details. Please try again later.
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/meetings')}
        >
          Back to Meetings
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/admin/meetings/${id}`)}
          sx={{ mr: 2 }}
        >
          Back to Meeting
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            Edit Meeting
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {meeting.hierarchy_level} Meeting • {meeting.entity_name || `Entity ${meeting.entity_id}`}
          </Typography>
        </Box>
      </Box>

      {/* Form */}
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* General Error */}
            {errors.general && (
              <Grid item xs={12}>
                <Alert severity="error">{errors.general}</Alert>
              </Grid>
            )}

            {/* Meeting Title */}
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Meeting Title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                error={!!errors.title}
                helperText={errors.title}
                required
              />
            </Grid>

            {/* Meeting Status */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Meeting Status</InputLabel>
                <Select
                  value={formData.meeting_status}
                  label="Meeting Status"
                  onChange={(e) => handleInputChange('meeting_status', e.target.value)}
                >
                  <MenuItem value="Scheduled">Scheduled</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                  <MenuItem value="Postponed">Postponed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description}
              />
            </Grid>

            {/* Start DateTime */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Start Date & Time"
                type="datetime-local"
                value={formData.start_datetime}
                onChange={(e) => handleInputChange('start_datetime', e.target.value)}
                error={!!errors.start_datetime}
                helperText={errors.start_datetime}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            {/* End DateTime */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="End Date & Time"
                type="datetime-local"
                value={formData.end_datetime}
                onChange={(e) => handleInputChange('end_datetime', e.target.value)}
                error={!!errors.end_datetime}
                helperText={errors.end_datetime}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            {/* Location */}
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                error={!!errors.location}
                helperText={errors.location}
              />
            </Grid>

            {/* Max Attendees */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Maximum Attendees"
                type="number"
                value={formData.max_attendees}
                onChange={(e) => handleInputChange('max_attendees', parseInt(e.target.value) || 0)}
                error={!!errors.max_attendees}
                helperText={errors.max_attendees}
                inputProps={{ min: 1 }}
              />
            </Grid>

            {/* Virtual Meeting Link */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Virtual Meeting Link"
                value={formData.virtual_meeting_link}
                onChange={(e) => handleInputChange('virtual_meeting_link', e.target.value)}
                error={!!errors.virtual_meeting_link}
                helperText={errors.virtual_meeting_link}
                placeholder="https://zoom.us/j/123456789"
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => navigate(`/admin/meetings/${id}`)}
                  disabled={updateMeetingMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={updateMeetingMutation.isPending}
                >
                  {updateMeetingMutation.isPending ? 'Updating...' : 'Update Meeting'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default MeetingEditPage;
