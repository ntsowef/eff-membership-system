import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  LocationOn,
  AdminPanelSettings,
  Link,
  Warning,
  PersonSearch,
  PersonAdd,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

import ProvinceSelectionDialog from './ProvinceSelectionDialog';
import HierarchicalGeographicSelector from './HierarchicalGeographicSelector';
import HierarchicalMemberLookupDialog from './HierarchicalMemberLookupDialog';
import MemberLookupDialog from './MemberLookupDialog';

interface Member {
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  full_name: string;
  email?: string;
  cell_number?: string;
  landline_number?: string;
  province_name: string;
  district_name: string;
  municipality_name: string;
  ward_name: string;
  ward_number: number;
  province_code: string;
  district_code: string;
  municipality_code: string;
  ward_code: string;
  residential_address?: string;
  age: number;
  gender_name: string;
  member_created_at: string;
}

interface Province {
  province_code: string;
  province_name: string;
  member_count?: number;
}

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateUser: (userData: any) => void;
}

const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onClose,
  onCreateUser,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    admin_level: '',
    role_name: '',
    province_code: '',
    district_code: '',
    municipality_code: '',
    ward_code: '',
    phone: '',
  });

  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [provinceSelectionOpen, setProvinceSelectionOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // User selection mode state
  const [isSelectExistingMode, setIsSelectExistingMode] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberLookupOpen, setMemberLookupOpen] = useState(false);

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Hierarchical geographic selection state
  const [hierarchicalGeographicSelection, setHierarchicalGeographicSelection] = useState<{
    province?: { province_code: string; province_name: string };
    municipality?: { municipality_code: string; municipality_name: string };
    ward?: { ward_code: string; ward_name: string };
  }>({});
  const [hierarchicalMemberLookupOpen, setHierarchicalMemberLookupOpen] = useState(false);

  const adminLevels = [
    { value: 'National', label: 'National Coordinator', requiresMember: false, requiresProvince: false, useHierarchical: false },
    { value: 'Provincial', label: 'Provincial Coordinator', requiresMember: false, requiresProvince: true, useHierarchical: false },
    { value: 'Regional', label: 'Regional Manager', requiresMember: false, requiresProvince: false, useHierarchical: false },
    { value: 'Municipal', label: 'Municipal Admin', requiresMember: true, requiresProvince: false, useHierarchical: true },
    { value: 'Ward', label: 'Ward Admin', requiresMember: true, requiresProvince: false, useHierarchical: true },
  ];

  const roles = [
    { value: 'Super Admin', label: 'Super Admin', levels: ['National'] },
    { value: 'Provincial Admin', label: 'Provincial Admin', levels: ['Provincial'] },
    { value: 'Regional Admin', label: 'Regional Admin', levels: ['Regional'] },
    { value: 'Municipal Admin', label: 'Municipal Admin', levels: ['Municipal'] },
    { value: 'Ward Admin', label: 'Ward Admin', levels: ['Ward'] },
  ];

  const selectedAdminLevel = adminLevels.find(level => level.value === formData.admin_level);
  const requiresProvinceSelection = selectedAdminLevel?.requiresProvince || false;
  const showUserSelectionOption = selectedAdminLevel?.requiresMember || false; // Municipal and Ward levels
  const useHierarchicalSelection = selectedAdminLevel?.useHierarchical || false; // Municipal and Ward levels

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-select appropriate role based on admin level
    if (field === 'admin_level') {
      const appropriateRole = roles.find(role => role.levels.includes(value));
      if (appropriateRole) {
        setFormData(prev => ({ ...prev, role_name: appropriateRole.value }));
      }
      


      // Clear selected province if changing to non-province-required level
      if (!adminLevels.find(level => level.value === value)?.requiresProvince) {
        setSelectedProvince(null);
      }
    }
  };



  const handleProvinceSelect = (province: Province) => {
    setSelectedProvince(province);

    // Update form data with selected province
    setFormData(prev => ({
      ...prev,
      province_code: province.province_code,
      // Clear lower-level geographic codes when province changes
      district_code: '',
      municipality_code: '',
      ward_code: '',
    }));
  };

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
    // Pre-fill form data with member information
    setFormData(prev => ({
      ...prev,
      name: `${member.firstname} ${member.surname}`,
      email: member.email || '',
      phone: member.cell_number || member.landline_number || '',
    }));
    setMemberLookupOpen(false);
  };

  const handleToggleSelectionMode = () => {
    setIsSelectExistingMode(!isSelectExistingMode);
    setSelectedMember(null);
    // Reset form data when switching modes
    if (!isSelectExistingMode) {
      setFormData(prev => ({
        ...prev,
        name: '',
        email: '',
        phone: '',
      }));
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Hierarchical geographic selection handlers
  const handleHierarchicalGeographicSelectionChange = (selection: {
    province?: { province_code: string; province_name: string };
    municipality?: { municipality_code: string; municipality_name: string };
    ward?: { ward_code: string; ward_name: string };
  }) => {
    setHierarchicalGeographicSelection(selection);

    // Update form data with geographic codes
    setFormData(prev => ({
      ...prev,
      province_code: selection.province?.province_code || '',
      municipal_code: selection.municipality?.municipality_code || '',
      ward_code: selection.ward?.ward_code || '',
    }));
  };

  const handleOpenHierarchicalMemberLookup = () => {
    setHierarchicalMemberLookupOpen(true);
  };

  const handleHierarchicalMemberSelect = (member: Member) => {
    setSelectedMember(member);
    setFormData(prev => ({
      ...prev,
      name: `${member.firstname} ${member.surname}`,
      email: member.email || '',
      phone: member.cell_number || '',
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Basic required fields
    if (!formData.admin_level) newErrors.admin_level = 'Admin level is required';
    if (!formData.role_name) newErrors.role_name = 'Role is required';

    if (isSelectExistingMode) {
      // Validation for "Select Existing User" mode
      if (!selectedMember) {
        newErrors.member_selection = 'Please select a member to promote to admin';
      } else {
        // Validate that selected member has required information
        if (!selectedMember.email || selectedMember.email.trim() === '') {
          newErrors.member_email = 'Selected member must have a valid email address';
        }
        if (!selectedMember.firstname || !selectedMember.surname) {
          newErrors.member_name = 'Selected member must have a valid name';
        }
      }
    } else {
      // Validation for "Create New User" mode
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Validate province selection requirement
    if (requiresProvinceSelection && !selectedProvince) {
      newErrors.province_selection = `${formData.admin_level} admins must have a province assigned`;
    }

    // Validate hierarchical geographic selection for Municipal and Ward admins
    if (useHierarchicalSelection) {
      if (!hierarchicalGeographicSelection.province) {
        newErrors.hierarchical_province = 'Province selection is required';
      }
      if (!hierarchicalGeographicSelection.municipality) {
        newErrors.hierarchical_municipality = 'Municipality selection is required';
      }
      if (formData.admin_level === 'Ward' && !hierarchicalGeographicSelection.ward) {
        newErrors.hierarchical_ward = 'Ward selection is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    let userData;

    if (isSelectExistingMode && selectedMember) {
      // Promoting existing member - use member's data for required fields
      userData = {
        // Required fields from member data
        name: selectedMember.full_name || `${selectedMember.firstname} ${selectedMember.surname}`,
        email: selectedMember.email,
        password: 'TEMP_PASSWORD_WILL_BE_RESET', // Backend will handle password reset for existing members

        // Admin level and role from form
        admin_level: formData.admin_level,
        role_name: formData.role_name,

        // Geographic codes from hierarchical selection or member data
        province_code: hierarchicalGeographicSelection.province?.province_code || selectedMember.province_code,
        district_code: selectedMember.district_code || '',
        municipal_code: hierarchicalGeographicSelection.municipality?.municipality_code || selectedMember.municipality_code,
        ward_code: hierarchicalGeographicSelection.ward?.ward_code || selectedMember.ward_code,

        // Member promotion flags
        member_id: selectedMember.member_id,
        promote_existing_member: true,

        // Additional metadata
        selected_province_code: selectedProvince?.province_code,
        selected_province_name: selectedProvince?.province_name,
        is_existing_user_promotion: true,
        selected_member: {
          member_id: selectedMember.member_id,
          id_number: selectedMember.id_number,
          firstname: selectedMember.firstname,
          surname: selectedMember.surname,
          email: selectedMember.email,
          cell_number: selectedMember.cell_number,
          province_code: selectedMember.province_code,
          municipality_code: selectedMember.municipality_code,
          ward_code: selectedMember.ward_code,
        },
      };
    } else {
      // Creating new user - use form data
      userData = {
        ...formData,
        selected_province_code: selectedProvince?.province_code,
        selected_province_name: selectedProvince?.province_name,
        is_existing_user_promotion: false,
        promote_existing_member: false,
      };
    }

    console.log('🚀 Submitting user data:', userData);
    onCreateUser(userData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      admin_level: '',
      role_name: '',
      province_code: '',
      district_code: '',
      municipality_code: '',
      ward_code: '',
      phone: '',
    });

    setSelectedProvince(null);
    setIsSelectExistingMode(false);
    setSelectedMember(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
    onClose();
  };



  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <AdminPanelSettings color="primary" />
            <Typography variant="h6">
              {isSelectExistingMode && selectedMember
                ? `Promote Member to Admin`
                : isSelectExistingMode
                  ? `Select Member for Admin Promotion`
                  : `Create New Admin User`
              }
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Admin Level Selection */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.admin_level}>
                  <InputLabel>Admin Level</InputLabel>
                  <Select
                    value={formData.admin_level}
                    label="Admin Level"
                    onChange={(e) => handleInputChange('admin_level', e.target.value)}
                  >
                    {adminLevels.map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                          <span>{level.label}</span>
                          <Box display="flex" gap={0.5}>
                            {level.requiresMember && (
                              <Chip label="Requires Member Link" size="small" color="warning" />
                            )}
                            {level.requiresProvince && (
                              <Chip label="Requires Province" size="small" color="info" />
                            )}
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.admin_level && (
                    <Typography variant="caption" color="error">
                      {errors.admin_level}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.role_name}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={formData.role_name}
                    label="Role"
                    onChange={(e) => handleInputChange('role_name', e.target.value)}
                    disabled={!formData.admin_level}
                  >
                    {roles
                      .filter(role => !formData.admin_level || role.levels.includes(formData.admin_level))
                      .map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                          {role.label}
                        </MenuItem>
                      ))}
                  </Select>
                  {errors.role_name && (
                    <Typography variant="caption" color="error">
                      {errors.role_name}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            </Grid>

            {/* User Selection Mode Toggle for Municipal and Ward Admins */}
            {showUserSelectionOption && (
              <Card variant="outlined" sx={{ mt: 3, mb: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                      <PersonSearch color="primary" />
                      Admin Creation Method
                    </Typography>
                  </Box>

                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      For {formData.admin_level} administrators, you can either create a new user account
                      or promote an existing member from the {formData.admin_level.toLowerCase()} area.
                    </Typography>
                  </Alert>

                  <Box display="flex" gap={2}>
                    <Button
                      variant={!isSelectExistingMode ? "contained" : "outlined"}
                      startIcon={<PersonAdd />}
                      onClick={() => !isSelectExistingMode || handleToggleSelectionMode()}
                      disabled={!isSelectExistingMode}
                    >
                      Create New User
                    </Button>
                    <Button
                      variant={isSelectExistingMode ? "contained" : "outlined"}
                      startIcon={<PersonSearch />}
                      onClick={() => isSelectExistingMode || handleToggleSelectionMode()}
                      disabled={isSelectExistingMode}
                    >
                      Select Existing User
                    </Button>
                  </Box>

                  {/* Selected Member Display */}
                  {isSelectExistingMode && selectedMember && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Selected Member:</strong> {selectedMember.firstname} {selectedMember.surname}
                        <br />
                        <strong>ID:</strong> {selectedMember.id_number}
                        <br />
                        <strong>Location:</strong> {selectedMember.municipality_name}, {selectedMember.ward_name}
                      </Typography>
                    </Alert>
                  )}

                  {/* Select Member Button - Use hierarchical selection for Municipal/Ward */}
                  {isSelectExistingMode && !selectedMember && (
                    <Box mt={2}>
                      <Button
                        variant="outlined"
                        startIcon={<PersonSearch />}
                        onClick={() => useHierarchicalSelection ? handleOpenHierarchicalMemberLookup() : setMemberLookupOpen(true)}
                        fullWidth
                        color={errors.member_selection ? "error" : "primary"}
                        disabled={useHierarchicalSelection && (
                          (formData.admin_level === 'Municipal' && !hierarchicalGeographicSelection.municipality) ||
                          (formData.admin_level === 'Ward' && !hierarchicalGeographicSelection.ward)
                        )}
                      >
                        {useHierarchicalSelection
                          ? `Browse Members in Selected ${formData.admin_level === 'Ward' ? 'Ward' : 'Municipality'}`
                          : 'Browse and Select Member'
                        }
                      </Button>
                      {errors.member_selection && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                          {errors.member_selection}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Hierarchical Geographic Selection for Municipal and Ward Admins */}
            {useHierarchicalSelection && (
              <Card variant="outlined" sx={{ mt: 3, mb: 2 }}>
                <CardContent>
                  <HierarchicalGeographicSelector
                    adminLevel={formData.admin_level as 'Municipal' | 'Ward'}
                    onSelectionChange={handleHierarchicalGeographicSelectionChange}
                    disabled={false}
                  />

                  {/* Display validation errors */}
                  {(errors.hierarchical_province || errors.hierarchical_municipality || errors.hierarchical_ward) && (
                    <Box mt={2}>
                      {errors.hierarchical_province && (
                        <Typography variant="caption" color="error" display="block">
                          {errors.hierarchical_province}
                        </Typography>
                      )}
                      {errors.hierarchical_municipality && (
                        <Typography variant="caption" color="error" display="block">
                          {errors.hierarchical_municipality}
                        </Typography>
                      )}
                      {errors.hierarchical_ward && (
                        <Typography variant="caption" color="error" display="block">
                          {errors.hierarchical_ward}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Province Selection Requirement Alert */}
            {requiresProvinceSelection && (
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <LocationOn />
                  <Typography variant="body2">
                    <strong>{formData.admin_level} administrators must be assigned to a specific province</strong>
                    to manage all EFF activities within that provincial boundary.
                  </Typography>
                </Box>
              </Alert>
            )}



            {/* Province Selection Section */}
            {requiresProvinceSelection && (
              <Card variant="outlined" sx={{ mt: 2, mb: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                      <LocationOn color="primary" />
                      Province Assignment
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => setProvinceSelectionOpen(true)}
                      startIcon={<LocationOn />}
                    >
                      {selectedProvince ? 'Change Province' : 'Select Province'}
                    </Button>
                  </Box>

                  {selectedProvince ? (
                    <Box>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Selected Province:</strong> {selectedProvince.province_name} ({selectedProvince.province_code})
                        </Typography>
                        {selectedProvince.member_count && (
                          <Typography variant="caption" display="block">
                            {selectedProvince.member_count.toLocaleString()} members in this province
                          </Typography>
                        )}
                      </Alert>
                    </Box>
                  ) : (
                    <Alert severity="info">
                      <Typography variant="body2">
                        Click "Select Province" to assign this admin to a specific province.
                      </Typography>
                    </Alert>
                  )}

                  {errors.province_selection && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {errors.province_selection}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}



            <Divider sx={{ my: 3 }} />

            {/* User Information */}
            <Typography variant="h6" gutterBottom>
              User Information
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name || (isSelectExistingMode && selectedMember ? 'Auto-filled from selected member' : '')}
                  disabled={!!(isSelectExistingMode && selectedMember)}
                  InputProps={{
                    startAdornment: <Person color="action" sx={{ mr: 1 }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={!!errors.email}
                  helperText={errors.email || (isSelectExistingMode && selectedMember ? 'Auto-filled from selected member' : '')}
                  disabled={!!(isSelectExistingMode && selectedMember)}
                  InputProps={{
                    startAdornment: <Email color="action" sx={{ mr: 1 }} />,
                  }}
                />
              </Grid>

              {/* Password fields - only show when creating new user */}
              {!isSelectExistingMode && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      error={!!errors.password}
                      helperText={errors.password}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={handleTogglePasswordVisibility}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle confirm password visibility"
                              onClick={handleToggleConfirmPasswordVisibility}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </>
              )}

              {/* Info alert for existing user mode */}
              {isSelectExistingMode && selectedMember && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Password:</strong> The selected member will use their existing login credentials.
                      No new password is required.
                    </Typography>
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!!(isSelectExistingMode && selectedMember)}
                  helperText={isSelectExistingMode && selectedMember ? 'Auto-filled from selected member' : ''}
                  InputProps={{
                    startAdornment: <Phone color="action" sx={{ mr: 1 }} />,
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={requiresProvinceSelection && !selectedProvince}
          >
            {isSelectExistingMode ? 'Promote to Admin' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>



      {/* Province Selection Dialog */}
      <ProvinceSelectionDialog
        open={provinceSelectionOpen}
        onClose={() => setProvinceSelectionOpen(false)}
        onSelectProvince={handleProvinceSelect}
      />

      {/* Member Lookup Dialog */}
      {showUserSelectionOption && !useHierarchicalSelection && (
        <MemberLookupDialog
          open={memberLookupOpen}
          onClose={() => setMemberLookupOpen(false)}
          onSelectMember={handleMemberSelect}
          adminLevel={formData.admin_level as 'Municipal' | 'Ward'}
          geographicScope={selectedProvince ? {
            province_code: selectedProvince.province_code,
            municipality_code: formData.municipality_code,
            ward_code: formData.ward_code,
          } : undefined}
        />
      )}

      {/* Hierarchical Member Lookup Dialog */}
      {showUserSelectionOption && useHierarchicalSelection && (
        <HierarchicalMemberLookupDialog
          open={hierarchicalMemberLookupOpen}
          onClose={() => setHierarchicalMemberLookupOpen(false)}
          onSelectMember={handleHierarchicalMemberSelect}
          adminLevel={formData.admin_level as 'Municipal' | 'Ward'}
          geographicSelection={hierarchicalGeographicSelection}
          title={`Select Member from ${formData.admin_level === 'Ward' ? 'Ward' : 'Municipality'}`}
        />
      )}
    </>
  );
};

export default CreateUserDialog;
