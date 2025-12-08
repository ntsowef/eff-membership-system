import React, { useState } from 'react';
import {
  Box,
  Typography,
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
import { Save, Cancel } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

interface CreateMeetingData {
  title: string;
  description: string;
  hierarchy_level: string;
  entity_id: number;
  meeting_type: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  virtual_meeting_link: string;
  max_attendees: number;
}

const MeetingCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateMeetingData>({
    title: '',
    description: '',
    hierarchy_level: 'Ward',
    entity_id: 1,
    meeting_type: 'Regular',
    start_datetime: '',
    end_datetime: '',
    location: '',
    virtual_meeting_link: '',
    max_attendees: 50,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: (data: any) => apiPost('/meetings', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      navigate(`/admin/meetings/${(response as any).data.meeting.meeting_id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create meeting:', error);
      console.error('Error response:', error.response?.data);

      // Set form errors based on API response
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Failed to create meeting. Please check your input and try again.' });
      }
    },
  });

  const handleInputChange = (field: keyof CreateMeetingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
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
    if (formData.start_datetime && formData.end_datetime &&
        new Date(formData.start_datetime) >= new Date(formData.end_datetime)) {
      newErrors.end_datetime = 'End time must be after start time';
    }

    // Validate virtual meeting link if provided
    if (formData.virtual_meeting_link.trim()) {
      try {
        new URL(formData.virtual_meeting_link.trim());
      } catch {
        newErrors.virtual_meeting_link = 'Please enter a valid URL (e.g., https://zoom.us/j/123456789)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Transform form data to match API expectations
      const apiData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        hierarchy_level: formData.hierarchy_level,
        entity_id: formData.entity_id,
        meeting_type: formData.meeting_type,
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString(),
        location: formData.location.trim() || undefined,
        virtual_meeting_link: formData.virtual_meeting_link.trim() || undefined,
        max_attendees: formData.max_attendees
      };

      // Remove empty optional fields to avoid validation issues
      Object.keys(apiData).forEach(key => {
        if (apiData[key as keyof typeof apiData] === undefined || apiData[key as keyof typeof apiData] === '') {
          delete apiData[key as keyof typeof apiData];
        }
      });

      console.log('Sending meeting data:', apiData);
      createMeetingMutation.mutate(apiData);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Schedule New Meeting
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Create and schedule a new organizational meeting
      </Typography>

      <Paper sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Meeting Title */}
            <Grid item xs={12}>
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

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </Grid>

            {/* Hierarchy Level and Entity */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Hierarchy Level</InputLabel>
                <Select
                  value={formData.hierarchy_level}
                  label="Hierarchy Level"
                  onChange={(e) => handleInputChange('hierarchy_level', e.target.value)}
                >
                  <MenuItem value="National">National</MenuItem>
                  <MenuItem value="Provincial">Provincial</MenuItem>
                  <MenuItem value="Regional">Regional</MenuItem>
                  <MenuItem value="Municipal">Municipal</MenuItem>
                  <MenuItem value="Ward">Ward</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Entity ID"
                type="number"
                value={formData.entity_id}
                onChange={(e) => handleInputChange('entity_id', parseInt(e.target.value) || 1)}
              />
            </Grid>

            {/* Meeting Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Meeting Type</InputLabel>
                <Select
                  value={formData.meeting_type}
                  label="Meeting Type"
                  onChange={(e) => handleInputChange('meeting_type', e.target.value)}
                >
                  <MenuItem value="Regular">Regular</MenuItem>
                  <MenuItem value="Special">Special</MenuItem>
                  <MenuItem value="Emergency">Emergency</MenuItem>
                  <MenuItem value="Annual">Annual</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Attendees"
                type="number"
                value={formData.max_attendees}
                onChange={(e) => handleInputChange('max_attendees', parseInt(e.target.value) || 50)}
              />
            </Grid>

            {/* Date and Time */}
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Physical Location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Conference Room A, Community Hall"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Virtual Meeting Link"
                value={formData.virtual_meeting_link}
                onChange={(e) => handleInputChange('virtual_meeting_link', e.target.value)}
                error={!!errors.virtual_meeting_link}
                helperText={errors.virtual_meeting_link}
                placeholder="e.g., https://zoom.us/j/123456789"
              />
            </Grid>

            {/* Error Display */}
            {(createMeetingMutation.isError || errors.general) && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {errors.general || 'Failed to create meeting. Please check your input and try again.'}
                </Alert>
              </Grid>
            )}

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => navigate('/admin/meetings')}
                  disabled={createMeetingMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={createMeetingMutation.isPending ? <CircularProgress size={20} /> : <Save />}
                  disabled={createMeetingMutation.isPending}
                >
                  {createMeetingMutation.isPending ? 'Creating...' : 'Schedule Meeting'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default MeetingCreatePage;
