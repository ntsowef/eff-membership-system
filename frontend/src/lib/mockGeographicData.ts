// Temporary mock data for geographic statistics until backend is fixed

export const mockProvinceStats = {
  data: [
    { province_code: 'GP', province_name: 'Gauteng', member_count: 2450 },
    { province_code: 'KZN', province_name: 'KwaZulu-Natal', member_count: 1890 },
    { province_code: 'WC', province_name: 'Western Cape', member_count: 1650 },
    { province_code: 'LP', province_name: 'Limpopo', member_count: 1250 },
    { province_code: 'EC', province_name: 'Eastern Cape', member_count: 980 },
    { province_code: 'MP', province_name: 'Mpumalanga', member_count: 850 },
    { province_code: 'NW', province_name: 'North West', member_count: 720 },
    { province_code: 'FS', province_name: 'Free State', member_count: 650 },
    { province_code: 'NC', province_name: 'Northern Cape', member_count: 420 }
  ]
};

export const mockDistrictStats: { [key: string]: any } = {
  'LP': {
    data: [
      { district_code: 'DC36', district_name: 'Capricorn', member_count: 450 },
      { district_code: 'DC33', district_name: 'Mopani', member_count: 380 },
      { district_code: 'DC34', district_name: 'Sekhukhune', member_count: 420 }
    ]
  },
  'GP': {
    data: [
      { district_code: 'JHB', district_name: 'City of Johannesburg', member_count: 850 },
      { district_code: 'TSH', district_name: 'City of Tshwane', member_count: 720 },
      { district_code: 'EKU', district_name: 'Ekurhuleni', member_count: 650 },
      { district_code: 'SED', district_name: 'Sedibeng', member_count: 230 }
    ]
  },
  'KZN': {
    data: [
      { district_code: 'ETH', district_name: 'eThekwini', member_count: 680 },
      { district_code: 'UMG', district_name: 'uMgungundlovu', member_count: 420 },
      { district_code: 'UGU', district_name: 'Ugu', member_count: 350 },
      { district_code: 'UTH', district_name: 'uThukela', member_count: 290 },
      { district_code: 'UMZ', district_name: 'uMzinyathi', member_count: 150 }
    ]
  }
};

export const mockMunicipalityStats: { [key: string]: any } = {
  'DC36': {
    data: [
      { municipality_code: 'LIM354', municipality_name: 'Polokwane', member_count: 180 },
      { municipality_code: 'LIM351', municipality_name: 'Blouberg', member_count: 150 },
      { municipality_code: 'LIM353', municipality_name: 'Lepelle-Nkumpi', member_count: 120 }
    ]
  },
  'JHB': {
    data: [
      { municipality_code: 'JHB', municipality_name: 'City of Johannesburg', member_count: 850 }
    ]
  },
  'TSH': {
    data: [
      { municipality_code: 'TSH', municipality_name: 'City of Tshwane', member_count: 720 }
    ]
  }
};

export const mockWardStats: { [key: string]: any } = {
  'LIM354': {
    data: [
      { ward_code: '12345001', ward_name: 'Ward 1', member_count: 25 },
      { ward_code: '12345002', ward_name: 'Ward 2', member_count: 30 },
      { ward_code: '12345003', ward_name: 'Ward 3', member_count: 22 },
      { ward_code: '12345004', ward_name: 'Ward 4', member_count: 28 },
      { ward_code: '12345005', ward_name: 'Ward 5', member_count: 35 },
      { ward_code: '12345006', ward_name: 'Ward 6', member_count: 40 }
    ]
  },
  'JHB': {
    data: [
      { ward_code: 'JHB001', ward_name: 'Ward 1', member_count: 45 },
      { ward_code: 'JHB002', ward_name: 'Ward 2', member_count: 38 },
      { ward_code: 'JHB003', ward_name: 'Ward 3', member_count: 42 },
      { ward_code: 'JHB004', ward_name: 'Ward 4', member_count: 35 },
      { ward_code: 'JHB005', ward_name: 'Ward 5', member_count: 50 }
    ]
  }
};

// Mock API function that simulates the backend response
export const getMockGeographicData = async (endpoint: string, params?: any): Promise<any> => {
  // Log for debugging
  console.log(`🎯 Mock API Call: ${endpoint}`, params);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  if (endpoint === '/members/stats/provinces') {
    console.log('📊 Returning province stats:', mockProvinceStats.data.length, 'provinces');
    return mockProvinceStats;
  }

  if (endpoint === '/members/stats/districts' && params?.province) {
    const result = mockDistrictStats[params.province] || { data: [] };
    console.log(`📊 Returning district stats for ${params.province}:`, result.data.length, 'districts');
    return result;
  }

  if (endpoint === '/members/stats/municipalities' && params?.district) {
    const result = mockMunicipalityStats[params.district] || { data: [] };
    console.log(`📊 Returning municipality stats for ${params.district}:`, result.data.length, 'municipalities');
    return result;
  }

  if (endpoint === '/members/stats/wards' && params?.municipality) {
    const result = mockWardStats[params.municipality] || { data: [] };
    console.log(`📊 Returning ward stats for ${params.municipality}:`, result.data.length, 'wards');
    return result;
  }

  console.log('📊 No mock data found for:', endpoint, params);
  return { data: [] };
};
