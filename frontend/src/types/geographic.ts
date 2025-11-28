export interface Province {
  id: number;
  province_code: string;
  province_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface District {
  id: number;
  district_code: string;
  district_name: string;
  province_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Municipality {
  id: number;
  municipal_code: string;
  municipal_name: string;
  district_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ward {
  id: number;
  ward_code: string;
  ward_name: string;
  ward_number: string;
  municipal_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VotingDistrict {
  id: number;
  voting_district_code: string;
  voting_district_name: string;
  voting_district_number: string;
  ward_code: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Related data (when joined)
  ward_name?: string;
  ward_number?: string;
  municipal_code?: string;
  municipal_name?: string;
  district_code?: string;
  district_name?: string;
  province_code?: string;
  province_name?: string;
  member_count?: number;
}

export interface GeographicHierarchy {
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  municipal_code: string;
  municipal_name: string;
  subregion_code?: string;
  subregion_name?: string;
  ward_code: string;
  ward_name: string;
  ward_number: string;
  voting_district_code?: string;
  voting_district_name?: string;
  voting_district_number?: string;
  full_hierarchy: string;
}

export interface GeographicFilters {
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  subregion_code?: string;
  ward_code?: string;
  voting_district_code?: string;
  is_active?: boolean;
  search?: string;
}

export interface Municipality {
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  province_code: string;
  municipality_type: 'Local' | 'Metropolitan' | 'District' | 'Metro Sub-Region';
  parent_municipality_id?: number | null;
  parent_municipality_code?: string | null;
  parent_municipality_name?: string | null;
  district_name?: string;
  province_name?: string;
  member_count?: number;
}

export interface Subregion {
  municipality_code: string;
  municipality_name: string;
  parent_municipality_code: string;
  parent_municipality_name: string;
  district_code: string;
  province_code: string;
  district_name?: string;
  province_name?: string;
  member_count?: number;
}

export interface GeographicStatistics {
  provinces: number;
  districts: number;
  municipalities: number;
  wards: number;
  voting_districts: number;
  members_by_province: Array<{
    province_code: string;
    province_name: string;
    member_count: number;
  }>;
  members_by_voting_district: Array<{
    voting_district_code: string;
    voting_district_name: string;
    member_count: number;
  }>;
}
