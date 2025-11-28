import React, { useState } from 'react';
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

  Paper,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save,
  Cancel,
  Preview,
  People,
  ExpandMore,
  Person,
  HowToVote,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiGet, apiPut } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import ActionButton from '../../components/ui/ActionButton';
import HierarchicalGeographicSelector from '../../components/users/HierarchicalGeographicSelector';

interface MeetingType {
  type_id: number;
  type_name: string;
  type_code: string;
  description: string;
  hierarchy_level: string;
  meeting_category: string;
  default_duration_minutes: number;
  requires_quorum: boolean;
  min_notice_days: number;
  frequency_type: string;
}

interface InvitationPreview {
  member_id: number;
  member_name: string;
  member_email: string;
  member_phone: string;
  membership_number: string;
  attendance_type: string;
  role_in_meeting: string;
  voting_rights: boolean;
  invitation_priority: number;
}

interface CreateMeetingData {
  meeting_title: string;
  meeting_type_id: number | string;
  hierarchy_level: string;
  entity_id?: number;
  entity_type?: string;
  meeting_date: string;
  meeting_time: string;
  end_time?: string;
  duration_minutes: number;
  location: string;
  virtual_meeting_link: string;
  meeting_platform: string;
  description: string;
  objectives: string;
  agenda_summary: string;
  quorum_required: number;
  meeting_chair_id?: number;
  meeting_secretary_id?: number;
  auto_send_invitations: boolean;
  // Geographic selection fields
  province_code?: string;
  municipality_code?: string;
  ward_code?: string;
}

interface GeographicSelection {
  province?: { province_code: string; province_name: string };
  municipality?: { municipality_code: string; municipality_name: string };
  ward?: { ward_code: string; ward_name: string };
}

const HierarchicalMeetingCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id && id !== 'new';

  const [formData, setFormData] = useState<CreateMeetingData>({
    meeting_title: '',
    meeting_type_id: '',
    hierarchy_level: 'National',
    entity_id: undefined,
    entity_type: undefined,
    meeting_date: '',
    meeting_time: '',
    end_time: '',
    duration_minutes: 120,
    location: '',
    virtual_meeting_link: '',
    meeting_platform: 'In-Person',
    description: '',
    objectives: '',
    agenda_summary: '',
    quorum_required: 0,
    meeting_chair_id: undefined,
    meeting_secretary_id: undefined,
    auto_send_invitations: true,
    province_code: undefined,
    municipality_code: undefined,
    ward_code: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [invitationPreview, setInvitationPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [geographicSelection, setGeographicSelection] = useState<GeographicSelection>({});

  // Fetch meeting types based on hierarchy level
  const { data: meetingTypesData, isLoading: meetingTypesLoading, error: meetingTypesError } = useQuery({
    queryKey: ['hierarchical-meeting-types', formData.hierarchy_level],
    queryFn: () => apiGet(`/hierarchical-meetings/meeting-types?hierarchy_level=${formData.hierarchy_level}`),
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // The apiGet function already extracts the 'data' property from the API response
  // So meetingTypesData is already { meeting_types: [...] }
  const meetingTypes: MeetingType[] = (meetingTypesData as any)?.meeting_types || [];

  // Fetch existing meeting data when in edit mode
  const { data: existingMeetingData, isLoading: meetingLoading } = useQuery({
    queryKey: ['hierarchical-meeting', id],
    queryFn: async () => {
      const result = await apiGet(`/hierarchical-meetings/${id}`);
      return result;
    },
    enabled: isEditMode && !!id,
  });

  // Populate form when existing meeting data is loaded
  React.useEffect(() => {
    if (existingMeetingData && isEditMode) {
      const meeting = (existingMeetingData as any)?.meeting;
      if (meeting) {
        // Convert date and time from ISO format
        const meetingDateTime = new Date(meeting.meeting_date);
        const dateStr = meetingDateTime.toISOString().split('T')[0];
        const timeStr = meetingDateTime.toTimeString().slice(0, 5);

        setFormData({
          meeting_title: meeting.meeting_title || '',
          meeting_type_id: meeting.meeting_type_id || '',
          hierarchy_level: meeting.hierarchy_level || 'National',
          entity_id: meeting.entity_id,
          entity_type: meeting.entity_type,
          meeting_date: dateStr,
          meeting_time: timeStr,
          end_time: meeting.end_time || '',
          duration_minutes: meeting.duration_minutes || 120,
          location: meeting.location || '',
          virtual_meeting_link: meeting.virtual_meeting_link || '',
          meeting_platform: meeting.meeting_platform || 'In-Person',
          description: meeting.description || '',
          objectives: meeting.objectives || '',
          agenda_summary: meeting.agenda_summary || '',
          quorum_required: meeting.quorum_required || 0,
          meeting_chair_id: meeting.meeting_chair_id,
          meeting_secretary_id: meeting.meeting_secretary_id,
          auto_send_invitations: false, // Don't auto-send when editing
          province_code: meeting.province_code,
          municipality_code: meeting.municipality_code,
          ward_code: meeting.ward_code,
        });
      }
    }
  }, [existingMeetingData, isEditMode]);


  // Update meeting mutation
  const updateMeetingMutation = useMutation({
    mutationFn: (data: CreateMeetingData) => apiPut(`/hierarchical-meetings/${id}`, data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchical-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchical-meeting', id] });

      console.log('✅ Meeting updated successfully!');
      alert('✅ Meeting updated successfully!');

      if (id) {
        navigate(`/admin/meetings/hierarchical/${id}`);
      } else {
        navigate('/admin/meetings/hierarchical');
      }
    },
    onError: (error: any) => {
      console.error('Failed to update meeting:', error);
      let errorMessage = 'Failed to update meeting. Please check your input and try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      alert(`❌ ${errorMessage}`);
    },
  });

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: (data: CreateMeetingData) => apiPost('/hierarchical-meetings', data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchical-meetings'] });

      // The apiPost function unwraps the response, so we access response.meeting.meeting_id directly
      const meetingId = response.meeting?.meeting_id;
      const invitationResults = response.invitation_results;

      console.log('✅ Meeting created successfully! ID:', meetingId);
      console.log('📧 Invitations sent:', invitationResults?.total_invitations_sent);

      // Show detailed success notification
      const totalInvitations = invitationResults?.total_invitations_sent || 0;
      const invitationBreakdown = invitationResults?.invitation_breakdown || {};

      const successMessage = `Meeting created successfully! ${totalInvitations} invitation${totalInvitations !== 1 ? 's' : ''} sent.`;
      const detailsMessage = totalInvitations > 0
        ? `Required: ${invitationBreakdown.required || 0}, Optional: ${invitationBreakdown.optional || 0}, Observer: ${invitationBreakdown.observer || 0}`
        : 'No invitations were sent.';

      // You can use a toast notification library here
      alert(`✅ ${successMessage}\n\n${detailsMessage}`);

      if (meetingId) {
        navigate(`/admin/meetings/${meetingId}`);
      } else {
        console.error('Meeting ID not found in response:', response);
        // Navigate to meetings list as fallback
        navigate('/admin/meetings/hierarchical');
      }
    },
    onError: (error: any) => {
      console.error('Failed to create meeting:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Full error object:', error);

      let errorMessage = 'Failed to create meeting. Please check your input and try again.';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid input data. Please check all required fields and try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in and try again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to create meetings.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      setErrors({ general: errorMessage });
    },
  });

  const handleInputChange = (field: keyof CreateMeetingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Reset geographic selection when hierarchy level changes
    if (field === 'hierarchy_level') {
      setGeographicSelection({});
      setFormData(prev => ({
        ...prev,
        [field]: value,
        province_code: undefined,
        municipality_code: undefined,
        ward_code: undefined,
        entity_id: value === 'National' ? 1 : undefined,
        entity_type: getEntityTypeFromHierarchy(value),
      }));
    }
  };

  const handleMeetingTypeChange = (meetingTypeId: number) => {
    const selectedType = meetingTypes.find(type => type.type_id === meetingTypeId);
    if (selectedType && meetingTypeId > 0) {
      setFormData(prev => ({
        ...prev,
        meeting_type_id: meetingTypeId,
        duration_minutes: selectedType.default_duration_minutes,
        quorum_required: selectedType.requires_quorum ? 5 : 0,
      }));
    } else {
      // Handle empty selection
      setFormData(prev => ({
        ...prev,
        meeting_type_id: '',
        duration_minutes: 120,
        quorum_required: 0,
      }));
    }
  };

  // Handle geographic selection changes
  const handleGeographicSelectionChange = (selection: GeographicSelection) => {
    setGeographicSelection(selection);

    // Update form data with geographic codes and entity_id
    setFormData(prev => ({
      ...prev,
      province_code: selection.province?.province_code || undefined,
      municipality_code: selection.municipality?.municipality_code || undefined,
      ward_code: selection.ward?.ward_code || undefined,
      // Set entity_id based on hierarchy level
      entity_id: getEntityIdFromSelection(prev.hierarchy_level, selection),
      entity_type: getEntityTypeFromHierarchy(prev.hierarchy_level),
    }));
  };

  // Helper function to get entity_id based on hierarchy level and selection
  const getEntityIdFromSelection = (hierarchyLevel: string, selection: GeographicSelection): number | undefined => {
    switch (hierarchyLevel) {
      case 'Provincial':
        return selection.province ? 1 : undefined; // Use province code hash or ID
      case 'Municipal':
        return selection.municipality ? 1 : undefined; // Use municipality code hash or ID
      case 'Ward':
        return selection.ward ? 1 : undefined; // Use ward code hash or ID
      default:
        return 1; // National level
    }
  };

  // Helper function to get entity_type based on hierarchy level
  const getEntityTypeFromHierarchy = (hierarchyLevel: string): string => {
    switch (hierarchyLevel) {
      case 'Provincial':
        return 'Province';
      case 'Municipal':
        return 'Municipality';
      case 'Ward':
        return 'Ward';
      default:
        return 'National';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.meeting_title.trim()) {
      newErrors.meeting_title = 'Meeting title is required';
    }
    if (!formData.meeting_type_id || formData.meeting_type_id === '') {
      newErrors.meeting_type_id = 'Meeting type is required';
    }
    if (!formData.meeting_date) {
      newErrors.meeting_date = 'Meeting date is required';
    }
    if (!formData.meeting_time) {
      newErrors.meeting_time = 'Meeting time is required';
    }

    // Geographic validation based on hierarchy level
    if (formData.hierarchy_level === 'Provincial' && !formData.province_code) {
      newErrors.geographic = 'Please select a province for provincial meetings';
    }
    if (formData.hierarchy_level === 'Municipal' && (!formData.province_code || !formData.municipality_code)) {
      newErrors.geographic = 'Please select province and municipality for municipal meetings';
    }
    if (formData.hierarchy_level === 'Ward' && (!formData.province_code || !formData.municipality_code || !formData.ward_code)) {
      newErrors.geographic = 'Please select province, municipality, and ward for ward meetings';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreviewInvitations = async () => {
    if (!formData.meeting_type_id || formData.meeting_type_id === '' || !formData.hierarchy_level) {
      setErrors({ general: 'Please select meeting type and hierarchy level first' });
      return;
    }

    setPreviewLoading(true);
    try {
      const requestData = {
        meeting_type_id: Number(formData.meeting_type_id),
        hierarchy_level: formData.hierarchy_level,
        entity_id: formData.entity_id,
        entity_type: formData.entity_type,
      };

      console.log('🔍 Sending invitation preview request:', requestData);

      const response = await apiPost('/hierarchical-meetings/invitation-preview', requestData);

      console.log('📥 Received invitation preview response:', response);
      console.log('📊 Preview data structure:', response);

      // The apiPost function already extracts the data from the API response
      // So response is already the data object, not wrapped in { data: ... }
      setInvitationPreview(response as any);
      setPreviewDialogOpen(true);
    } catch (error: any) {
      console.error('❌ Failed to preview invitations:', error);
      console.error('Error details:', error.response?.data || error.message);
      setErrors({ general: `Failed to preview invitations: ${error.response?.data?.error?.message || error.message}` });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Convert meeting_type_id to number and map meeting_title to title for API submission
      const submitData = {
        ...formData,
        title: formData.meeting_title, // Backend expects 'title', not 'meeting_title'
        meeting_type_id: Number(formData.meeting_type_id)
      };
      // Remove the old meeting_title field to avoid confusion
      delete (submitData as any).meeting_title;

      console.log('🚀 Submitting meeting data:', submitData);

      // Use update mutation if in edit mode, otherwise create
      if (isEditMode) {
        updateMeetingMutation.mutate(submitData);
      } else {
        createMeetingMutation.mutate(submitData);
      }
    }
  };

  const selectedMeetingType = meetingTypes.find(type => type.type_id === Number(formData.meeting_type_id));

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <PageHeader
        title={isEditMode ? "Edit Hierarchical Meeting" : "Create Hierarchical Meeting"}
        subtitle={isEditMode
          ? "Update meeting details and invitation settings"
          : "Schedule meetings with automatic invitation management based on organizational hierarchy"}
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Meetings', href: '/admin/meetings' },
          { label: isEditMode ? 'Edit Meeting' : 'Create Meeting' },
        ]}
      />

      <Box sx={{ p: 3 }}>
        {errors.general && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.general}
          </Alert>
        )}

        <Paper sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Meeting Title */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Meeting Title"
                  value={formData.meeting_title}
                  onChange={(e) => handleInputChange('meeting_title', e.target.value)}
                  error={!!errors.meeting_title}
                  helperText={errors.meeting_title}
                  required
                />
              </Grid>

              {/* Hierarchy Level */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Hierarchy Level</InputLabel>
                  <Select
                    value={formData.hierarchy_level}
                    onChange={(e) => handleInputChange('hierarchy_level', e.target.value)}
                    label="Hierarchy Level"
                  >
                    <MenuItem value="National">National</MenuItem>
                    <MenuItem value="Provincial">Provincial</MenuItem>
                    <MenuItem value="Regional">Regional</MenuItem>
                    <MenuItem value="Municipal">Municipal</MenuItem>
                    <MenuItem value="Ward">Ward</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Geographic Selection - Show for Provincial, Municipal, and Ward levels */}
              {(formData.hierarchy_level === 'Provincial' ||
                formData.hierarchy_level === 'Municipal' ||
                formData.hierarchy_level === 'Ward') && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon color="primary" />
                        Geographic Selection
                        <Chip
                          label={`Required for ${formData.hierarchy_level} meetings`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {formData.hierarchy_level === 'Provincial' && 'Select the province where this meeting will be held.'}
                        {formData.hierarchy_level === 'Municipal' && 'Select the province and municipality where this meeting will be held.'}
                        {formData.hierarchy_level === 'Ward' && 'Select the province, municipality, and ward where this meeting will be held.'}
                      </Typography>

                      <HierarchicalGeographicSelector
                        adminLevel={formData.hierarchy_level === 'Ward' ? 'Ward' : 'Municipal'}
                        onSelectionChange={handleGeographicSelectionChange}
                        disabled={false}
                      />

                      {errors.geographic && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          {errors.geographic}
                        </Alert>
                      )}

                      {/* Display current selection */}
                      {(geographicSelection.province || geographicSelection.municipality || geographicSelection.ward) && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Current Selection:</Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {geographicSelection.province && (
                              <Chip
                                label={`Province: ${geographicSelection.province.province_name}`}
                                size="small"
                                color="primary"
                              />
                            )}
                            {geographicSelection.municipality && (
                              <Chip
                                label={`Municipality: ${geographicSelection.municipality.municipality_name}`}
                                size="small"
                                color="secondary"
                              />
                            )}
                            {geographicSelection.ward && (
                              <Chip
                                label={`Ward: ${geographicSelection.ward.ward_name}`}
                                size="small"
                                color="success"
                              />
                            )}
                          </Stack>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}




              {/* Meeting Type */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Meeting Type</InputLabel>
                  <Select
                    value={formData.meeting_type_id}
                    onChange={(e) => handleMeetingTypeChange(Number(e.target.value))}
                    label="Meeting Type"
                    disabled={meetingTypesLoading}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>
                        {meetingTypesLoading
                          ? 'Loading meeting types...'
                          : meetingTypesError
                            ? 'Error loading meeting types'
                            : meetingTypes.length === 0
                              ? 'No meeting types available'
                              : 'Select a meeting type'
                        }
                      </em>
                    </MenuItem>
                    {!meetingTypesLoading && !meetingTypesError && meetingTypes.map((type) => (
                      <MenuItem key={type.type_id} value={type.type_id}>
                        <Box>
                          <Typography variant="body1">{type.type_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {type.meeting_category} • {type.frequency_type}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Meeting Type Description */}
              {selectedMeetingType && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {selectedMeetingType.type_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {selectedMeetingType.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={selectedMeetingType.meeting_category} 
                          size="small" 
                          color="primary" 
                        />
                        <Chip 
                          label={`${selectedMeetingType.default_duration_minutes} min`} 
                          size="small" 
                        />
                        <Chip 
                          label={selectedMeetingType.frequency_type} 
                          size="small" 
                        />
                        {selectedMeetingType.requires_quorum && (
                          <Chip 
                            label="Requires Quorum" 
                            size="small" 
                            color="secondary" 
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Date and Time */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Meeting Date"
                  type="date"
                  value={formData.meeting_date}
                  onChange={(e) => handleInputChange('meeting_date', e.target.value)}
                  error={!!errors.meeting_date}
                  helperText={errors.meeting_date}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="time"
                  value={formData.meeting_time}
                  onChange={(e) => handleInputChange('meeting_time', e.target.value)}
                  error={!!errors.meeting_time}
                  helperText={errors.meeting_time}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value))}
                  inputProps={{ min: 15, max: 720 }}
                />
              </Grid>

              {/* Location and Platform */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Meeting Platform</InputLabel>
                  <Select
                    value={formData.meeting_platform}
                    onChange={(e) => handleInputChange('meeting_platform', e.target.value)}
                    label="Meeting Platform"
                  >
                    <MenuItem value="In-Person">In-Person</MenuItem>
                    <MenuItem value="Virtual">Virtual</MenuItem>
                    <MenuItem value="Hybrid">Hybrid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Physical location or venue"
                />
              </Grid>

              {/* Virtual Meeting Link */}
              {(formData.meeting_platform === 'Virtual' || formData.meeting_platform === 'Hybrid') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Virtual Meeting Link"
                    value={formData.virtual_meeting_link}
                    onChange={(e) => handleInputChange('virtual_meeting_link', e.target.value)}
                    placeholder="https://zoom.us/j/123456789 or Teams meeting link"
                  />
                </Grid>
              )}

              {/* Description and Objectives */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the meeting purpose"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Objectives"
                  multiline
                  rows={3}
                  value={formData.objectives}
                  onChange={(e) => handleInputChange('objectives', e.target.value)}
                  placeholder="Key objectives and expected outcomes"
                />
              </Grid>

              {/* Quorum */}
              {selectedMeetingType?.requires_quorum && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Quorum Required"
                    type="number"
                    value={formData.quorum_required}
                    onChange={(e) => handleInputChange('quorum_required', parseInt(e.target.value))}
                    inputProps={{ min: 1 }}
                    helperText="Minimum number of attendees required for the meeting to proceed"
                  />
                </Grid>
              )}

              {/* Auto Send Invitations */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.auto_send_invitations}
                      onChange={(e) => handleInputChange('auto_send_invitations', e.target.checked)}
                    />
                  }
                  label="Automatically send invitations based on meeting type and hierarchy"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <ActionButton
                      icon={Preview}
                      onClick={handlePreviewInvitations}
                      variant="outlined"
                      color="info"
                      disabled={!formData.meeting_type_id || formData.meeting_type_id === '' || previewLoading}
                    >
                      {previewLoading ? 'Loading...' : 'Preview Invitations'}
                    </ActionButton>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={() => navigate('/admin/meetings')}
                    >
                      Cancel
                    </Button>
                    <ActionButton
                      icon={Save}
                      type="submit"
                      gradient={true}
                      vibrant={true}
                      disabled={createMeetingMutation.isPending || updateMeetingMutation.isPending}
                    >
                      {isEditMode
                        ? (updateMeetingMutation.isPending ? 'Updating...' : 'Update Meeting')
                        : (createMeetingMutation.isPending ? 'Creating...' : 'Create Meeting')
                      }
                    </ActionButton>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>

      {/* Invitation Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <People />
            Invitation Preview
          </Box>
        </DialogTitle>
        <DialogContent>
          {invitationPreview ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>📊 Summary:</strong> {invitationPreview.total_invitations} total invitations |
                  {invitationPreview.summary?.total_with_voting_rights || 0} with voting rights
                </Typography>
              </Alert>

              {invitationPreview.grouped_invitations && Object.entries(invitationPreview.grouped_invitations).map(([type, invitations]: [string, any]) => (
                invitations && invitations.length > 0 && (
                  <Accordion key={type} defaultExpanded={type === 'required'}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                        {type} ({invitations.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {invitations.map((invitation: InvitationPreview, index: number) => (
                          <ListItem key={invitation.member_id || index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                              <ListItemIcon sx={{ minWidth: 40 }}>
                                <Person />
                              </ListItemIcon>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight="medium">
                                  {invitation.member_name || 'Unknown Member'}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  {invitation.role_in_meeting || 'No role specified'}
                                </Typography>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {invitation.member_email && `Email: ${invitation.member_email}`}
                                  {invitation.member_phone && ` | Phone: ${invitation.member_phone}`}
                                  {invitation.membership_number && ` | ID: ${invitation.membership_number}`}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, ml: 5, flexWrap: 'wrap' }}>
                              {invitation.voting_rights && (
                                <Chip icon={<HowToVote />} label="Voting Rights" size="small" color="primary" />
                              )}
                              <Chip
                                label={`Priority: ${invitation.invitation_priority || 'N/A'}`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={invitation.attendance_type || 'Required'}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )
              ))}

              {/* Show message if no invitations */}
              {(!invitationPreview.grouped_invitations ||
                Object.values(invitationPreview.grouped_invitations).every((invitations: any) => !invitations || invitations.length === 0)) && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No invitations found for this meeting configuration.
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No invitation preview data available.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HierarchicalMeetingCreatePage;
