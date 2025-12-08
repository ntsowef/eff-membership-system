/**
 * Types for Membership Renewal System
 */

export interface MemberRenewalData {
  // Core member fields
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  middle_name?: string;
  date_of_birth?: string;
  age?: number;

  // Demographic information
  gender_id?: number;
  gender_name?: string;
  race_id?: number;
  race_name?: string;
  citizenship_id?: number;
  citizenship_name?: string;
  language_id?: number;
  language_name?: string;

  // Contact information
  email?: string;
  cell_number?: string;
  landline_number?: string;
  alternative_contact?: string;
  residential_address?: string;
  postal_address?: string;

  // Geographic information
  ward_code?: string;
  ward_name?: string;
  ward_number?: number;
  voting_district_code?: string;
  voting_district_name?: string;
  voting_station_id?: number;
  voting_station_name?: string;
  voting_station_code?: string;
  province_code?: string;
  province_name?: string;
  district_code?: string;
  district_name?: string;
  municipality_code?: string;
  municipality_name?: string;

  // Professional information
  occupation_id?: number;
  occupation_name?: string;
  occupation_category?: string;
  qualification_id?: number;
  qualification_name?: string;

  // Voter information
  voter_status_id?: number;
  voter_status_name?: string;
  voter_registration_number?: string;
  voter_registration_date?: string;
  voter_verified_at?: string;

  // Membership information
  membership_type?: string;
  application_id?: number;
  membership_number?: string;
  date_joined?: string;
  last_payment_date?: string;
  expiry_date?: string;
  status_id?: number;
  membership_status_name?: string;
  subscription_type_id?: number;
  subscription_name?: string;
  membership_amount?: string;

  // Timestamps
  member_created_at?: string;
  member_updated_at?: string;
  membership_created_at?: string;
  membership_updated_at?: string;
}

export interface RenewalFormData {
  // Personal Information (editable)
  email?: string;
  cell_number?: string;
  landline_number?: string;
  alternative_contact?: string;
  residential_address?: string;
  postal_address?: string;
  ward_code?: string;

  // Payment Information
  payment_method: 'Card' | 'Cash' | 'EFT' | 'Mobile' | 'Other';
  payment_reference?: string;
  amount_paid: number;
}

export interface RenewalProcessRequest {
  id_number: string;
  payment_method: 'Card' | 'Cash' | 'EFT' | 'Mobile' | 'Other';
  payment_reference?: string;
  amount_paid: number;
  updated_member_data?: {
    email?: string;
    cell_number?: string;
    landline_number?: string;
    residential_address?: string;
    postal_address?: string;
    ward_code?: string;
  };
}

export interface RenewalProcessResponse {
  member: {
    member_id: number;
    id_number: string;
    firstname: string;
    surname?: string;
    email?: string;
    cell_number?: string;
    membership_number?: string;
    date_joined?: string;
    last_payment_date?: string;
    expiry_date?: string;
    status_id?: number;
    status_name?: string;
  };
  payment: {
    payment_id: number;
    payment_reference: string;
    amount_paid: number;
    payment_method: string;
    payment_date: string;
  };
  renewal_details: {
    last_payment_date: string;
    expiry_date: string;
    renewal_period: string;
  };
}

export interface GetMemberRenewalDataResponse {
  member: MemberRenewalData;
  renewal_eligible: boolean;
  message: string;
}

// Form validation errors
export interface RenewalFormErrors {
  id_number?: string;
  email?: string;
  cell_number?: string;
  landline_number?: string;
  residential_address?: string;
  postal_address?: string;
  ward_code?: string;
  payment_method?: string;
  payment_reference?: string;
  amount_paid?: string;
}

// Renewal steps
export type RenewalStep = 'id-entry' | 'review-info' | 'payment' | 'confirmation';

export interface RenewalState {
  currentStep: RenewalStep;
  memberData: MemberRenewalData | null;
  formData: RenewalFormData;
  errors: RenewalFormErrors;
  isLoading: boolean;
  renewalResult: RenewalProcessResponse | null;
}

