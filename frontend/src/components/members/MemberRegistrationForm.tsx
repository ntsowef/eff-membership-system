import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  MenuItem,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Save, ArrowBack, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { lookupApi, geographicApi, memberApi } from '../../services/api';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface LookupOption {
  id: number;
  name: string;
  code?: string;
}

interface GeographicOption {
  code: string;
  name: string;
}

interface MemberFormData {
  // Personal Information
  id_number: string;
  firstname: string;
  surname: string;
  date_of_birth: string;
  gender_id: number | '';
  race_id: number | '';
  citizenship_id: number | '';
  language_id: number | '';

  // Geographic Information
  province_code: string;
  district_code: string;
  municipality_code: string;
  ward_code: string;
  voting_district_code: string;
  voting_station_id: number | '';

  // Contact Information
  cell_number: string;
  landline_number: string;
  email: string;
  residential_address: string;

  // Additional Information
  occupation_id: number | '';
  qualification_id: number | '';
  voter_registration_number: string;
}

const initialFormData: MemberFormData = {
  id_number: '',
  firstname: '',
  surname: '',
  date_of_birth: '',
  gender_id: '',
  race_id: '',
  citizenship_id: '',
  language_id: '',
  province_code: '',
  district_code: '',
  municipality_code: '',
  ward_code: '',
  voting_district_code: '',
  voting_station_id: '',
  cell_number: '',
  landline_number: '',
  email: '',
  residential_address: '',
  occupation_id: '',
  qualification_id: '',
  voter_registration_number: '',
};

const steps = ['Personal Information', 'Geographic Information', 'Contact & Additional'];

// =====================================================================================
// COMPONENT
// =====================================================================================

const MemberRegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<MemberFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Lookup data
  const [genders, setGenders] = useState<LookupOption[]>([]);
  const [races, setRaces] = useState<LookupOption[]>([]);
  const [citizenships, setCitizenships] = useState<LookupOption[]>([]);
  const [languages, setLanguages] = useState<LookupOption[]>([]);
  const [occupations, setOccupations] = useState<LookupOption[]>([]);
  const [qualifications, setQualifications] = useState<LookupOption[]>([]);

  // Geographic data
  const [provinces, setProvinces] = useState<GeographicOption[]>([]);
  const [districts, setDistricts] = useState<GeographicOption[]>([]);
  const [municipalities, setMunicipalities] = useState<GeographicOption[]>([]);
  const [wards, setWards] = useState<GeographicOption[]>([]);
  const [votingStations, setVotingStations] = useState<LookupOption[]>([]);

  // Load initial lookup data
  useEffect(() => {
    loadLookupData();
    loadProvinces();
  }, []);

  // Load districts when province changes
  useEffect(() => {
    if (formData.province_code) {
      loadDistricts(formData.province_code);
    } else {
      setDistricts([]);
      setMunicipalities([]);
      setWards([]);
    }
  }, [formData.province_code]);

  // Load municipalities when district changes
  useEffect(() => {
    if (formData.district_code) {
      loadMunicipalities(formData.district_code);
    } else {
      setMunicipalities([]);
      setWards([]);
    }
  }, [formData.district_code]);

  // Load wards when municipality changes
  useEffect(() => {
    if (formData.municipality_code) {
      loadWards(formData.municipality_code);
    } else {
      setWards([]);
    }
  }, [formData.municipality_code]);

  // Load voting stations when ward changes
  useEffect(() => {
    if (formData.ward_code) {
      loadVotingStations(formData.ward_code);
    } else {
      setVotingStations([]);
    }
  }, [formData.ward_code]);

  const loadLookupData = async () => {
    try {
      const [gendersRes, racesRes, citizenshipsRes, languagesRes, occupationsRes, qualificationsRes] =
        await Promise.all([
          lookupApi.getGenders(),
          lookupApi.getRaces(),
          lookupApi.getCitizenships(),
          lookupApi.getLanguages(),
          lookupApi.getOccupations(),
          lookupApi.getQualificationLevels(),
        ]);

      setGenders(gendersRes.data || []);
      setRaces(racesRes.data || []);
      setCitizenships(citizenshipsRes.data || []);
      setLanguages(languagesRes.data || []);
      setOccupations(occupationsRes.data || []);
      setQualifications(qualificationsRes.data || []);
    } catch (err) {
      console.error('Failed to load lookup data:', err);
    }
  };

  const loadProvinces = async () => {
    try {
      const response = await geographicApi.getProvinces();
      setProvinces(
        response.data.map((p: any) => ({
          code: p.province_code,
          name: p.province_name,
        }))
      );
    } catch (err) {
      console.error('Failed to load provinces:', err);
    }
  };

  const loadDistricts = async (provinceCode: string) => {
    try {
      const response = await geographicApi.getDistricts(provinceCode);
      setDistricts(
        response.data.map((d: any) => ({
          code: d.district_code,
          name: d.district_name,
        }))
      );
    } catch (err) {
      console.error('Failed to load districts:', err);
    }
  };

  const loadMunicipalities = async (districtCode: string) => {
    try {
      const response = await geographicApi.getMunicipalities(districtCode);
      setMunicipalities(
        response.data.map((m: any) => ({
          code: m.municipality_code,
          name: m.municipality_name,
        }))
      );
    } catch (err) {
      console.error('Failed to load municipalities:', err);
    }
  };

  const loadWards = async (municipalityCode: string) => {
    try {
      const response = await geographicApi.getWards(municipalityCode);
      setWards(
        response.data.map((w: any) => ({
          code: w.ward_code,
          name: w.ward_name || `Ward ${w.ward_number}`,
        }))
      );
    } catch (err) {
      console.error('Failed to load wards:', err);
    }
  };

  const loadVotingStations = async (wardCode: string) => {
    try {
      const response = await lookupApi.getVotingStations();
      const filtered = response.data.filter((vs: any) => vs.ward_code === wardCode);
      setVotingStations(
        filtered.map((vs: any) => ({
          id: vs.voting_station_id,
          name: vs.station_name,
        }))
      );
    } catch (err) {
      console.error('Failed to load voting stations:', err);
    }
  };

  const handleChange = (field: keyof MemberFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        gender_id: formData.gender_id || undefined,
        race_id: formData.race_id || undefined,
        citizenship_id: formData.citizenship_id || 1, // Default to South African
        language_id: formData.language_id || undefined,
        voting_station_id: formData.voting_station_id || undefined,
        occupation_id: formData.occupation_id || undefined,
        qualification_id: formData.qualification_id || undefined,
      };

      await memberApi.createMember(submitData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/members');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register member');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0: // Personal Information
        return (
          formData.id_number.trim() !== '' &&
          formData.firstname.trim() !== '' &&
          formData.surname.trim() !== '' &&
          formData.gender_id !== ''
        );
      case 1: // Geographic Information
        return (
          formData.province_code !== '' &&
          formData.district_code !== '' &&
          formData.municipality_code !== '' &&
          formData.ward_code !== ''
        );
      case 2: // Contact & Additional
        return true; // Optional fields
      default:
        return false;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Register New Member
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Member registered successfully! Redirecting...
          </Alert>
        )}

        {/* Step Content */}
        <Box sx={{ minHeight: 400 }}>
          {/* STEP 1: Personal Information */}
          {activeStep === 0 && <PersonalInformationStep />}

          {/* STEP 2: Geographic Information */}
          {activeStep === 1 && <GeographicInformationStep />}

          {/* STEP 3: Contact & Additional */}
          {activeStep === 2 && <ContactAdditionalStep />}
        </Box>

        {/* Navigation Buttons */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep < steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepValid()}
                endIcon={<ArrowForward />}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading || !isStepValid()}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              >
                {loading ? 'Registering...' : 'Register Member'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );

  // Step 1: Personal Information
  function PersonalInformationStep() {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Personal Information
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="ID Number"
            value={formData.id_number}
            onChange={(e) => handleChange('id_number', e.target.value)}
            placeholder="e.g., 8001015009087"
            helperText="South African ID Number"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="First Name"
            value={formData.firstname}
            onChange={(e) => handleChange('firstname', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="Surname"
            value={formData.surname}
            onChange={(e) => handleChange('surname', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="Date of Birth"
            value={formData.date_of_birth}
            onChange={(e) => handleChange('date_of_birth', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Gender"
            value={formData.gender_id}
            onChange={(e) => handleChange('gender_id', e.target.value)}
          >
            {genders.map((gender) => (
              <MenuItem key={gender.id} value={gender.id}>
                {gender.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Race"
            value={formData.race_id}
            onChange={(e) => handleChange('race_id', e.target.value)}
          >
            <MenuItem value="">
              <em>Select Race</em>
            </MenuItem>
            {races.map((race) => (
              <MenuItem key={race.id} value={race.id}>
                {race.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Citizenship"
            value={formData.citizenship_id}
            onChange={(e) => handleChange('citizenship_id', e.target.value)}
          >
            <MenuItem value="">
              <em>Select Citizenship</em>
            </MenuItem>
            {citizenships.map((citizenship) => (
              <MenuItem key={citizenship.id} value={citizenship.id}>
                {citizenship.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Language"
            value={formData.language_id}
            onChange={(e) => handleChange('language_id', e.target.value)}
          >
            <MenuItem value="">
              <em>Select Language</em>
            </MenuItem>
            {languages.map((language) => (
              <MenuItem key={language.id} value={language.id}>
                {language.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
    );
  }

  // Step 2: Geographic Information
  function GeographicInformationStep() {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Geographic Information
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Select your location from province down to ward
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Province"
            value={formData.province_code}
            onChange={(e) => {
              handleChange('province_code', e.target.value);
              handleChange('district_code', '');
              handleChange('municipality_code', '');
              handleChange('ward_code', '');
            }}
          >
            <MenuItem value="">
              <em>Select Province</em>
            </MenuItem>
            {provinces.map((province) => (
              <MenuItem key={province.code} value={province.code}>
                {province.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="District"
            value={formData.district_code}
            onChange={(e) => {
              handleChange('district_code', e.target.value);
              handleChange('municipality_code', '');
              handleChange('ward_code', '');
            }}
            disabled={!formData.province_code}
          >
            <MenuItem value="">
              <em>Select District</em>
            </MenuItem>
            {districts.map((district) => (
              <MenuItem key={district.code} value={district.code}>
                {district.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Municipality"
            value={formData.municipality_code}
            onChange={(e) => {
              handleChange('municipality_code', e.target.value);
              handleChange('ward_code', '');
            }}
            disabled={!formData.district_code}
          >
            <MenuItem value="">
              <em>Select Municipality</em>
            </MenuItem>
            {municipalities.map((municipality) => (
              <MenuItem key={municipality.code} value={municipality.code}>
                {municipality.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Ward"
            value={formData.ward_code}
            onChange={(e) => handleChange('ward_code', e.target.value)}
            disabled={!formData.municipality_code}
          >
            <MenuItem value="">
              <em>Select Ward</em>
            </MenuItem>
            {wards.map((ward) => (
              <MenuItem key={ward.code} value={ward.code}>
                {ward.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Voting Station"
            value={formData.voting_station_id}
            onChange={(e) => handleChange('voting_station_id', e.target.value)}
            disabled={!formData.ward_code}
          >
            <MenuItem value="">
              <em>Select Voting Station</em>
            </MenuItem>
            {votingStations.map((station) => (
              <MenuItem key={station.id} value={station.id}>
                {station.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Residential Address"
            value={formData.residential_address}
            onChange={(e) => handleChange('residential_address', e.target.value)}
            placeholder="Enter full residential address"
          />
        </Grid>
      </Grid>
    );
  }

  // Step 3: Contact & Additional Information
  function ContactAdditionalStep() {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Contact Information
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Cell Number"
            value={formData.cell_number}
            onChange={(e) => handleChange('cell_number', e.target.value)}
            placeholder="e.g., 0821234567"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Landline Number"
            value={formData.landline_number}
            onChange={(e) => handleChange('landline_number', e.target.value)}
            placeholder="e.g., 0123456789"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            type="email"
            label="Email Address"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="e.g., member@example.com"
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            Additional Information
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Occupation"
            value={formData.occupation_id}
            onChange={(e) => handleChange('occupation_id', e.target.value)}
          >
            <MenuItem value="">
              <em>Select Occupation</em>
            </MenuItem>
            {occupations.map((occupation) => (
              <MenuItem key={occupation.id} value={occupation.id}>
                {occupation.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Qualification Level"
            value={formData.qualification_id}
            onChange={(e) => handleChange('qualification_id', e.target.value)}
          >
            <MenuItem value="">
              <em>Select Qualification</em>
            </MenuItem>
            {qualifications.map((qualification) => (
              <MenuItem key={qualification.id} value={qualification.id}>
                {qualification.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Voter Registration Number"
            value={formData.voter_registration_number}
            onChange={(e) => handleChange('voter_registration_number', e.target.value)}
            placeholder="Enter voter registration number (if applicable)"
          />
        </Grid>
      </Grid>
    );
  }
};

export default MemberRegistrationForm;

