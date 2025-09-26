import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Button
} from '@mui/material';
import GeographicSelector from '../common/GeographicSelector';

const GeographicSelectorTest: React.FC = () => {
  const [formData, setFormData] = useState({
    province_code: '',
    district_code: '',
    municipal_code: '',
    ward_code: '',
    voting_district_code: ''
  });

  const handleReset = () => {
    setFormData({
      province_code: '',
      district_code: '',
      municipal_code: '',
      ward_code: '',
      voting_district_code: ''
    });
  };

  const handleSetTestData = () => {
    // Set to a known ward with voting districts
    setFormData({
      province_code: 'KZN',
      district_code: 'ETH',
      municipal_code: 'ETH',
      ward_code: '59500105',
      voting_district_code: ''
    });
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        GeographicSelector Component Test
      </Typography>
      
      <Box display="flex" gap={2} mb={3}>
        <Button variant="outlined" onClick={handleReset}>
          Reset All
        </Button>
        <Button variant="contained" onClick={handleSetTestData}>
          Set Test Data (KZN → eThekwini → Ward 105)
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Geographic Selector Component
          </Typography>
          
          <GeographicSelector
            selectedProvince={formData.province_code}
            selectedDistrict={formData.district_code}
            selectedMunicipality={formData.municipal_code}
            selectedWard={formData.ward_code}
            selectedVotingDistrict={formData.voting_district_code}
            onProvinceChange={(code) => {
              console.log('Province changed:', code);
              setFormData(prev => ({ 
                ...prev, 
                province_code: code, 
                district_code: '', 
                municipal_code: '', 
                ward_code: '', 
                voting_district_code: '' 
              }));
            }}
            onDistrictChange={(code) => {
              console.log('District changed:', code);
              setFormData(prev => ({ 
                ...prev, 
                district_code: code, 
                municipal_code: '', 
                ward_code: '', 
                voting_district_code: '' 
              }));
            }}
            onMunicipalityChange={(code) => {
              console.log('Municipality changed:', code);
              setFormData(prev => ({ 
                ...prev, 
                municipal_code: code, 
                ward_code: '', 
                voting_district_code: '' 
              }));
            }}
            onWardChange={(code) => {
              console.log('Ward changed:', code);
              setFormData(prev => ({ 
                ...prev, 
                ward_code: code, 
                voting_district_code: '' 
              }));
            }}
            onVotingDistrictChange={(code) => {
              console.log('Voting District changed:', code);
              setFormData(prev => ({ 
                ...prev, 
                voting_district_code: code 
              }));
            }}
            showVotingDistricts={true}
            required={false}
            size="medium"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Form Data
          </Typography>
          
          <Alert severity="info">
            <Typography variant="body2" component="div">
              <strong>Selected Values:</strong>
              <br />• Province: {formData.province_code || 'Not selected'}
              <br />• District: {formData.district_code || 'Not selected'}
              <br />• Municipality: {formData.municipal_code || 'Not selected'}
              <br />• Ward: {formData.ward_code || 'Not selected'}
              <br />• Voting District: {formData.voting_district_code || 'Not selected'}
            </Typography>
          </Alert>

          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Raw Form Data:
            </Typography>
            <Box 
              component="pre" 
              sx={{ 
                backgroundColor: 'grey.100', 
                p: 2, 
                borderRadius: 1, 
                fontSize: '0.75rem',
                overflow: 'auto'
              }}
            >
              {JSON.stringify(formData, null, 2)}
            </Box>
          </Box>

          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Instructions:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              1. Click "Set Test Data" to automatically select KwaZulu-Natal → eThekwini → Ward 105
              <br />2. This ward has 28 voting districts that should appear in the dropdown
              <br />3. Check the browser console for debug logs
              <br />4. The voting districts dropdown should appear after selecting a ward
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default GeographicSelectorTest;
