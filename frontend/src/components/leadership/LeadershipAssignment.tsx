// LeadershipAssignment Component
// Core interface for assigning members to leadership positions

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search,
  Assignment,
  Person,
  Add,
  Visibility,
  Edit,
  CheckCircle,
  Cancel,
  Info
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUI } from '../../store';
import * as LeadershipService from '../../services/leadershipApi';

// Extract what we need from the service
const { LeadershipAPI } = LeadershipService;
type LeadershipPosition = LeadershipService.LeadershipPosition;
type CreateAppointmentData = LeadershipService.CreateAppointmentData;
type PositionFilters = LeadershipService.PositionFilters;
import MemberSelector from './MemberSelector';
import GeographicSelector from './GeographicSelector';
import type { GeographicSelection } from './GeographicSelector';
import { useProvinceContext } from '../../hooks/useProvinceContext';

// =====================================================
// Interfaces
// =====================================================

// Member interface that matches the backend API response
interface Member {
  // Core fields
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  first_name: string; // alias for firstname
  last_name: string; // alias for surname
  age?: number;
  gender_id: number;
  gender_name: string;

  // Geographic information
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  municipality_code: string;
  municipality_name: string;
  ward_code: string;
  ward_name: string;
  ward_number: string;

  // Contact information
  cell_number?: string;
  landline_number?: string;
  email?: string;
  residential_address?: string;

  // Membership information
  membership_status: string;
  membership_id?: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  member_created_at: string;
}

interface LeadershipAssignmentProps {
  onAssignmentComplete?: () => void;
}

interface AssignmentFormData {
  position_id: number;
  member_id: number;
  hierarchy_level: string;
  entity_id: number;
  appointment_type: 'Elected' | 'Appointed' | 'Acting' | 'Interim';
  start_date: Date | null;
  end_date: Date | null;
  appointment_notes: string;
}

interface PositionWithVacancy extends LeadershipPosition {
  is_vacant?: boolean;
  current_holder?: string;
}

// =====================================================
// LeadershipAssignment Component
// =====================================================

const LeadershipAssignment: React.FC<LeadershipAssignmentProps> = ({
  onAssignmentComplete
}) => {
  // ==================== State ====================
  const [selectedHierarchyLevel, setSelectedHierarchyLevel] = useState<string>('');
  const [geographicSelection, setGeographicSelection] = useState<GeographicSelection | null>(null);

  // Get province context for provincial admin restrictions
  const provinceContext = useProvinceContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showVacantOnly, setShowVacantOnly] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<LeadershipPosition | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSelectorOpen, setMemberSelectorOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [formData, setFormData] = useState<AssignmentFormData>({
    position_id: 0,
    member_id: 0,
    hierarchy_level: '',
    entity_id: 1,
    appointment_type: 'Appointed',
    start_date: new Date(),
    end_date: null,
    appointment_notes: ''
  });

  const { addNotification } = useUI();
  const queryClient = useQueryClient();

  // ==================== API Queries ====================
  
  // Build position filters
  const buildPositionFilters = (): PositionFilters => {
    const filters: PositionFilters = {};

    if (selectedHierarchyLevel) {
      filters.hierarchy_level = selectedHierarchyLevel;
    }

    if (geographicSelection?.entityId) {
      filters.entity_id = geographicSelection.entityId;
    }

    if (showVacantOnly) {
      filters.vacant_only = true;
    }

    return filters;
  };

  // Fetch positions
  const { data: positions = [], isLoading: positionsLoading, error: positionsError } = useQuery({
    queryKey: ['leadership-positions', selectedHierarchyLevel, geographicSelection?.entityId, showVacantOnly],
    queryFn: () => LeadershipAPI.getPositions(buildPositionFilters()),
    enabled: !!selectedHierarchyLevel && (selectedHierarchyLevel === 'National' || !!geographicSelection),
  });

  // Filter positions by search term and vacancy status
  const filteredPositions = positions.filter(position => {
    // Search term filter
    const matchesSearch = position.position_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.position_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (position.description && position.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // Vacancy filter
    const matchesVacancy = !showVacantOnly || position.position_status === 'Vacant';

    return matchesSearch && matchesVacancy;
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (data: CreateAppointmentData) => LeadershipAPI.createAppointment(data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        message: 'Leadership appointment created successfully!'
      });
      queryClient.invalidateQueries({ queryKey: ['leadership-positions'] });
      queryClient.invalidateQueries({ queryKey: ['leadership-appointments'] });
      handleCloseAssignmentDialog();
      onAssignmentComplete?.();
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        message: `Failed to create appointment: ${error.message}`
      });
    },
  });

  // ==================== Event Handlers ====================
  
  const handlePositionSelect = (position: LeadershipPosition) => {
    setSelectedPosition(position);
    setFormData(prev => ({
      ...prev,
      position_id: position.id,
      hierarchy_level: position.hierarchy_level,
      entity_id: geographicSelection?.entityId || 1
    }));
  };

  const handleOpenMemberSelector = () => {
    if (!selectedPosition) {
      addNotification({
        type: 'warning',
        message: 'Please select a position first'
      });
      return;
    }
    setMemberSelectorOpen(true);
  };

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
    setFormData(prev => ({
      ...prev,
      member_id: member.member_id
    }));
    setMemberSelectorOpen(false);
    setAssignmentDialogOpen(true);
  };

  const handleFormChange = (field: keyof AssignmentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitAssignment = () => {
    if (!formData.position_id || !formData.member_id || !formData.start_date) {
      addNotification({
        type: 'warning',
        message: 'Please fill in all required fields'
      });
      return;
    }

    const appointmentData: CreateAppointmentData = {
      position_id: formData.position_id,
      member_id: formData.member_id,
      hierarchy_level: formData.hierarchy_level,
      entity_id: formData.entity_id,
      appointment_type: formData.appointment_type,
      start_date: formData.start_date.toISOString().split('T')[0],
      end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : undefined,
      appointment_notes: formData.appointment_notes || undefined
    };

    createAppointmentMutation.mutate(appointmentData);
  };

  const handleCloseAssignmentDialog = () => {
    setAssignmentDialogOpen(false);
    setSelectedPosition(null);
    setSelectedMember(null);
    setFormData({
      position_id: 0,
      member_id: 0,
      hierarchy_level: '',
      entity_id: 1,
      appointment_type: 'Appointed',
      start_date: new Date(),
      end_date: null,
      appointment_notes: ''
    });
  };

  // ==================== Helper Functions ====================
  
  const getHierarchyColor = (level: string) => {
    switch (level) {
      case 'National': return 'error';
      case 'Province': return 'warning';
      case 'Municipality': return 'info';
      case 'Ward': return 'success';
      default: return 'default';
    }
  };

  const getAppointmentTypeDescription = (type: string) => {
    switch (type) {
      case 'Elected': return 'Democratically elected through voting process';
      case 'Appointed': return 'Directly appointed by authorized personnel';
      case 'Acting': return 'Temporarily acting in position';
      case 'Interim': return 'Interim appointment pending permanent selection';
      default: return '';
    }
  };

  // ==================== Render ====================

  return (
    <Box>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h5" component="h2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment color="primary" />
            Leadership Assignment
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Assign members to leadership positions across the organizational hierarchy
          </Typography>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Position Filters
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Leadership Level</InputLabel>
                  <Select
                    value={selectedHierarchyLevel}
                    label="Leadership Level"
                    onChange={(e) => {
                      setSelectedHierarchyLevel(e.target.value);
                      setGeographicSelection(null);
                    }}
                  >
                    <MenuItem value="National">National Leadership</MenuItem>
                    <MenuItem value="Province">Provincial Leadership</MenuItem>
                    <MenuItem value="Municipality">Municipal Leadership</MenuItem>
                    <MenuItem value="Ward">Ward Leadership</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search positions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Show</InputLabel>
                  <Select
                    value={showVacantOnly ? 'vacant' : 'all'}
                    label="Show"
                    onChange={(e) => setShowVacantOnly(e.target.value === 'vacant')}
                  >
                    <MenuItem value="all">All Positions</MenuItem>
                    <MenuItem value="vacant">Vacant Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Geographic Selector */}
        {selectedHierarchyLevel && (
          <GeographicSelector
            hierarchyLevel={selectedHierarchyLevel as any}
            onSelectionChange={setGeographicSelection}
            disabled={positionsLoading}
          />
        )}

        {/* Positions Table */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Available Positions
              </Typography>
              {selectedPosition && (
                <Button
                  variant="contained"
                  startIcon={<Person />}
                  onClick={handleOpenMemberSelector}
                >
                  Select Member
                </Button>
              )}
            </Box>

            {!selectedHierarchyLevel && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Please select a hierarchy level to view available positions.
              </Alert>
            )}

            {selectedHierarchyLevel && selectedHierarchyLevel !== 'National' && !geographicSelection && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Please complete the geographic selection to view positions for {selectedHierarchyLevel.toLowerCase()} level.
              </Alert>
            )}

            {positionsLoading && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}

            {positionsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load positions. Please try again.
              </Alert>
            )}

            {selectedHierarchyLevel && !positionsLoading && !positionsError && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Position</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Term Duration</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPositions.map((position) => (
                      <TableRow
                        key={position.id}
                        selected={selectedPosition?.id === position.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handlePositionSelect(position)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {position.position_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {position.position_code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={position.hierarchy_level}
                            size="small"
                            color={getHierarchyColor(position.hierarchy_level) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {position.description || 'No description available'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {position.term_duration_months} months
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={position.position_status || 'Vacant'}
                            size="small"
                            color={position.position_status === 'Filled' ? 'error' : 'success'}
                            icon={position.position_status === 'Filled' ? <Cancel /> : <CheckCircle />}
                          />
                          {position.current_holders && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              {position.current_holders}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {selectedHierarchyLevel && filteredPositions.length === 0 && !positionsLoading && (
              <Alert severity="info">
                No positions found matching your criteria.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Member Selector Dialog */}
        <MemberSelector
          open={memberSelectorOpen}
          onClose={() => setMemberSelectorOpen(false)}
          onSelect={handleMemberSelect}
          title={`Select Member for ${selectedPosition?.position_name}`}
          filterByLevel={selectedHierarchyLevel}
          entityId={geographicSelection?.entityId || 1}
          geographicSelection={geographicSelection}
        />

        {/* Assignment Form Dialog */}
        <Dialog
          open={assignmentDialogOpen}
          onClose={handleCloseAssignmentDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Create Leadership Assignment
          </DialogTitle>
          <DialogContent dividers>
            {selectedPosition && selectedMember && (
              <Box>
                {/* Assignment Summary */}
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Position:</strong> {selectedPosition.position_name} ({selectedPosition.position_code})
                    <br />
                    <strong>Member:</strong> {selectedMember.full_name} (ID: {selectedMember.id_number})
                    <br />
                    <strong>Level:</strong> {selectedPosition.hierarchy_level}
                  </Typography>
                </Alert>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Appointment Type</InputLabel>
                      <Select
                        value={formData.appointment_type}
                        label="Appointment Type"
                        onChange={(e) => handleFormChange('appointment_type', e.target.value)}
                      >
                        <MenuItem value="Appointed">Appointed</MenuItem>
                        <MenuItem value="Elected">Elected</MenuItem>
                        <MenuItem value="Acting">Acting</MenuItem>
                        <MenuItem value="Interim">Interim</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {getAppointmentTypeDescription(formData.appointment_type)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Start Date *"
                      value={formData.start_date}
                      onChange={(date) => handleFormChange('start_date', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="End Date (Optional)"
                      value={formData.end_date}
                      onChange={(date) => handleFormChange('end_date', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Appointment Notes"
                      multiline
                      rows={3}
                      value={formData.appointment_notes}
                      onChange={(e) => handleFormChange('appointment_notes', e.target.value)}
                      placeholder="Add any relevant notes about this appointment..."
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAssignmentDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAssignment}
              variant="contained"
              disabled={createAppointmentMutation.isPending}
            >
              {createAppointmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
};

export default LeadershipAssignment;
