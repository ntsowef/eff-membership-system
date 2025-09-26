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

export interface VotingDistrictCreateRequest {
  voting_district_code: string;
  voting_district_name: string;
  voting_district_number: string;
  ward_code: string;
  latitude?: number;
  longitude?: number;
}

export interface VotingDistrictUpdateRequest {
  voting_district_name?: string;
  voting_district_number?: string;
  ward_code?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
}

export interface VotingDistrictFilters {
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  voting_district_code?: string;
  is_active?: boolean;
  search?: string;
}

export interface VotingDistrictStatistics {
  total_voting_districts: number;
  active_voting_districts: number;
  voting_districts_by_province: Array<{
    province_code: string;
    province_name: string;
    voting_district_count: number;
  }>;
  voting_districts_by_ward: Array<{
    ward_code: string;
    ward_name: string;
    voting_district_count: number;
  }>;
  member_distribution: Array<{
    voting_district_code: string;
    voting_district_name: string;
    member_count: number;
  }>;
}

export interface GeographicHierarchyComplete {
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  municipal_code: string;
  municipal_name: string;
  ward_code: string;
  ward_name: string;
  ward_number: string;
  voting_district_code?: string;
  voting_district_name?: string;
  voting_district_number?: string;
  full_hierarchy: string;
}
