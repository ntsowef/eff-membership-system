export interface Member {
  id: number;
  member_id: number;
  id_number: string;
  full_name: string;
  first_name: string;
  last_name: string;
  age?: number;
  date_of_birth?: string;
  gender_id: number;
  race_id?: number;
  citizenship_id?: number;
  language_id?: number;
  
  // Geographic information
  province_code: string;
  province_name?: string;
  district_code: string;
  district_name?: string;
  municipal_code: string;
  municipal_name?: string;
  ward_code: string;
  ward_name?: string;
  ward_number?: string;
  voting_district_code?: string;
  voting_district_name?: string;
  voting_district_number?: string;
  
  // Contact information
  voting_station_id?: number;
  residential_address?: string;
  cell_number?: string;
  landline_number?: string;
  email?: string;
  
  // Additional information
  occupation_id?: number;
  qualification_id?: number;
  voter_status_id?: number;
  voter_registration_number?: string;
  voter_registration_date?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface MemberCreateRequest {
  id_number: string;
  full_name: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender_id: number;
  race_id?: number;
  citizenship_id?: number;
  language_id?: number;
  
  // Geographic information
  province_code: string;
  district_code: string;
  municipal_code: string;
  ward_code: string;
  voting_district_code?: string;
  
  // Contact information
  voting_station_id?: number;
  residential_address?: string;
  cell_number?: string;
  landline_number?: string;
  email?: string;
  
  // Additional information
  occupation_id?: number;
  qualification_id?: number;
  voter_status_id?: number;
  voter_registration_number?: string;
  voter_registration_date?: string;
}

export interface MemberUpdateRequest {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender_id?: number;
  race_id?: number;
  citizenship_id?: number;
  language_id?: number;
  
  // Geographic information
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  voting_district_code?: string;
  
  // Contact information
  voting_station_id?: number;
  residential_address?: string;
  cell_number?: string;
  landline_number?: string;
  email?: string;
  
  // Additional information
  occupation_id?: number;
  qualification_id?: number;
  voter_status_id?: number;
  voter_registration_number?: string;
  voter_registration_date?: string;
}

export interface MemberFilters {
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  voting_district_code?: string;
  gender_id?: number;
  race_id?: number;
  citizenship_id?: number;
  language_id?: number;
  occupation_id?: number;
  qualification_id?: number;
  voter_status_id?: number;
  age_min?: number;
  age_max?: number;
  search?: string;
  is_active?: boolean;
}

export interface MemberStatistics {
  total_members: number;
  active_members: number;
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
  members_by_gender: Array<{
    gender_id: number;
    gender_name: string;
    member_count: number;
  }>;
  members_by_age_group: Array<{
    age_group: string;
    member_count: number;
  }>;
}
