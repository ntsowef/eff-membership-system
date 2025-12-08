// Leadership API Service
// Provides comprehensive API integration for leadership management

import { api } from '../lib/api';

// =====================================================
// TypeScript Interfaces
// =====================================================

export interface LeadershipPosition {
  id: number;
  position_name: string;
  position_code: string;
  hierarchy_level: 'National' | 'Province' | 'District' | 'Municipality' | 'Ward';
  description?: string;
  responsibilities?: string;
  requirements?: string;
  term_duration_months: number;
  max_consecutive_terms: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New status fields
  current_appointments?: number;
  position_status?: 'Vacant' | 'Filled';
  current_holders?: string;
}

export interface LeadershipAppointment {
  id: number;
  position_id: number;
  member_id: number;
  hierarchy_level: 'National' | 'Province' | 'District' | 'Municipality' | 'Ward';
  entity_id: number;
  appointment_type: 'Elected' | 'Appointed' | 'Acting' | 'Interim';
  start_date: string;
  end_date?: string;
  appointment_status: 'Active' | 'Inactive' | 'Completed' | 'Terminated';
  appointed_by: number;
  appointment_notes?: string;
  termination_reason?: string;
  terminated_by?: number;
  terminated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadershipAppointmentDetails extends LeadershipAppointment {
  position_name: string;
  position_code: string;
  member_name: string;
  member_number: string;
  appointed_by_name: string;
  terminated_by_name?: string;
  entity_name?: string;
}

export interface CreateAppointmentData {
  position_id: number;
  member_id: number;
  hierarchy_level: 'National' | 'Province' | 'District' | 'Municipality' | 'Ward';
  entity_id: number;
  appointment_type: 'Elected' | 'Appointed' | 'Acting' | 'Interim';
  start_date: string;
  end_date?: string;
  appointment_notes?: string;
}

export interface GeographicEntity {
  id: number;
  province_code?: string;
  province_name?: string;
  municipality_code?: string;
  municipality_name?: string;
  ward_code?: string;
  ward_name?: string;
  ward_number?: string;
  member_count: number;
  leadership_appointments: number;
}

// Note: Member interface is now defined locally in each component to avoid import conflicts
// Generic member type for API responses
type MemberData = any; // Generic type to avoid import conflicts

export interface MemberFilters {
  // Search and pagination
  q?: string; // Backend uses 'q' for search, not 'search'
  page?: number;
  limit?: number;

  // Geographic filters (must match backend validation)
  province_code?: string; // 2-3 characters
  district_code?: string; // 3-10 characters
  municipality_code?: string; // 3-10 characters
  ward_code?: string; // 5-15 characters

  // Other filters supported by backend
  gender_id?: number; // 1-3
  race_id?: number; // 1-5
  age_min?: number; // 0-120
  age_max?: number; // 0-120
  has_email?: boolean;
  has_cell_number?: boolean;

  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PositionFilters {
  hierarchy_level?: string;
  entity_id?: number;
  vacant_only?: boolean;
}

export interface AppointmentFilters {
  hierarchy_level?: string;
  entity_id?: number;
  position_id?: number;
  member_id?: number;
  appointment_type?: string;
  appointment_status?: string;
}

// War Council Structure specific interfaces
export interface WarCouncilPosition extends LeadershipPosition {
  structure_id: number;
  province_specific: boolean;
  province_code?: string;
  province_name?: string;
  is_unique_position: boolean;
}

export interface WarCouncilStructureView {
  position_id: number;
  position_name: string;
  position_code: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  order_index: number;
  province_specific: boolean;
  province_code?: string;
  province_name?: string;
  appointment_id?: number;
  member_id?: number;
  member_name?: string;
  membership_number?: string;
  appointment_type?: string;
  start_date?: string;
  end_date?: string;
  appointment_status?: string;
  position_status: 'Vacant' | 'Filled';
}

export interface WarCouncilStructure {
  structure: {
    core_positions: WarCouncilStructureView[];
    cct_deployees: WarCouncilStructureView[];
    all_positions: WarCouncilStructureView[];
  };
  statistics: {
    total_positions: number;
    filled_positions: number;
    vacant_positions: number;
    fill_rate_percentage: number;
    core_positions_filled: number;
    core_positions_total: number;
    cct_deployees_filled: number;
    cct_deployees_total: number;
  };
}

export interface WarCouncilDashboard extends WarCouncilStructure {
  recent_appointments: LeadershipAppointmentDetails[];
  vacant_positions: WarCouncilStructureView[];
}

export interface WarCouncilValidation {
  isValid: boolean;
  errors: string[];
}

// =====================================================
// Leadership API Service Class
// =====================================================

export class LeadershipAPI {
  // ==================== POSITIONS ====================
  
  /**
   * Get leadership positions with optional filtering
   */
  static async getPositions(filters?: PositionFilters): Promise<LeadershipPosition[]> {
    try {
      const response = await api.get('/leadership/positions', { params: filters });
      return response.data.data.positions;
    } catch (error: any) {
      throw new Error(`Failed to fetch positions: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get positions by hierarchy level
   */
  static async getPositionsByLevel(hierarchyLevel: string, entityId?: number): Promise<LeadershipPosition[]> {
    try {
      const params: any = { hierarchy_level: hierarchyLevel };
      if (entityId) params.entity_id = entityId;
      
      const response = await api.get('/leadership/positions', { params });
      return response.data.data.positions;
    } catch (error: any) {
      throw new Error(`Failed to fetch positions by level: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get position by ID
   */
  static async getPositionById(id: number): Promise<LeadershipPosition> {
    try {
      const response = await api.get(`/leadership/positions/${id}`);
      return response.data.data.position;
    } catch (error: any) {
      throw new Error(`Failed to fetch position: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== APPOINTMENTS ====================
  
  /**
   * Create new leadership appointment
   */
  static async createAppointment(appointmentData: CreateAppointmentData): Promise<number> {
    try {
      const response = await api.post('/leadership/appointments', appointmentData);
      return response.data.data.appointment_id;
    } catch (error: any) {
      throw new Error(`Failed to create appointment: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get current appointments with filtering
   */
  static async getCurrentAppointments(filters?: AppointmentFilters): Promise<{
    appointments: LeadershipAppointmentDetails[];
    pagination: any;
  }> {
    try {
      const response = await api.get('/leadership/appointments', { params: filters });
      return {
        appointments: response.data.data.appointments,
        pagination: response.data.data.pagination
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch appointments: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get appointment history
   */
  static async getAppointmentHistory(filters?: AppointmentFilters): Promise<{
    appointments: LeadershipAppointmentDetails[];
    pagination: any;
  }> {
    try {
      const response = await api.get('/leadership/appointments/history', { params: filters });
      return {
        appointments: response.data.data.appointments,
        pagination: response.data.data.pagination
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch appointment history: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Terminate appointment
   */
  static async terminateAppointment(
    appointmentId: number,
    terminationReason: string,
    endDate?: string
  ): Promise<boolean> {
    try {
      const response = await api.post(`/leadership/appointments/${appointmentId}/terminate`, {
        termination_reason: terminationReason,
        end_date: endDate
      });
      return response.data.success;
    } catch (error: any) {
      throw new Error(`Failed to terminate appointment: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Remove member from leadership position (makes position vacant)
   */
  static async removeFromPosition(appointmentId: number, reason: string): Promise<boolean> {
    try {
      const response = await api.post(`/leadership/appointments/${appointmentId}/remove`, {
        removal_reason: reason
      });
      return response.data.success;
    } catch (error: any) {
      throw new Error(`Failed to remove from position: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== MEMBERS ====================
  
  /**
   * Get members with filtering for leadership assignment
   */
  static async getMembers(filters?: MemberFilters): Promise<{
    members: MemberData[];
    pagination: any;
  }> {
    try {
      const response = await api.get('/members', { params: filters });

      // Debug logging
      console.log('🔍 LeadershipAPI.getMembers response:', {
        status: response.status,
        data: response.data,
        dataType: typeof response.data,
        hasData: !!response.data.data,
        hasPagination: !!response.data.pagination
      });

      // Extract members array from response
      let members = [];
      if (Array.isArray(response.data.data)) {
        members = response.data.data;
      } else if (Array.isArray(response.data)) {
        members = response.data;
      } else {
        console.warn('⚠️ Unexpected response structure:', response.data);
        members = [];
      }

      // Normalize member data to ensure consistent field names
      const normalizedMembers = members.map((member: any) => ({
        ...member,
        // Ensure consistent name fields
        firstname: member.firstname || member.first_name,
        surname: member.surname || member.last_name,
        first_name: member.first_name || member.firstname,
        last_name: member.last_name || member.surname,
        full_name: member.full_name || `${member.first_name || member.firstname || ''} ${member.last_name || member.surname || ''}`.trim(),

        // Ensure consistent contact fields
        cell_number: member.cell_number || member.phone,
        phone: member.phone || member.cell_number,

        // Ensure consistent status fields
        membership_status: member.membership_status || 'Active',

        // Ensure consistent gender fields
        gender_name: member.gender_name || member.gender || 'Unknown'
      }));

      console.log('🔍 Normalized members:', {
        count: normalizedMembers.length,
        firstMember: normalizedMembers[0],
        pagination: response.data.pagination
      });

      return {
        members: normalizedMembers,
        pagination: response.data.pagination || { total: normalizedMembers.length, totalPages: 1 }
      };
    } catch (error: any) {
      console.error('❌ LeadershipAPI.getMembers error:', error);
      throw new Error(`Failed to fetch members: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get member by ID
   */
  static async getMemberById(id: number): Promise<MemberData> {
    try {
      const response = await api.get(`/members/${id}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch member: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== STRUCTURES ====================
  
  /**
   * Get organizational structures
   */
  static async getOrganizationalStructures(): Promise<any[]> {
    try {
      const response = await api.get('/leadership/structures');
      return response.data.data.structures;
    } catch (error: any) {
      throw new Error(`Failed to fetch structures: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get leadership structure for specific entity
   */
  static async getLeadershipStructure(hierarchyLevel: string, entityId: number): Promise<any[]> {
    try {
      const response = await api.get(`/leadership/structure/${hierarchyLevel}/${entityId}`);
      return response.data.data.leadership_structure;
    } catch (error: any) {
      throw new Error(`Failed to fetch leadership structure: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== VALIDATION ====================
  
  /**
   * Check if position is vacant
   */
  static async isPositionVacant(
    positionId: number, 
    hierarchyLevel: string, 
    entityId: number
  ): Promise<boolean> {
    try {
      const response = await api.get(`/leadership/positions/${positionId}/vacancy-check`, {
        params: { hierarchy_level: hierarchyLevel, entity_id: entityId }
      });
      return response.data.data.is_vacant;
    } catch (error: any) {
      // If endpoint doesn't exist, check via appointments
      const appointments = await this.getCurrentAppointments({
        position_id: positionId,
        hierarchy_level: hierarchyLevel,
        entity_id: entityId,
        appointment_status: 'Active'
      });
      return appointments.appointments.length === 0;
    }
  }

  /**
   * Validate member eligibility for leadership position
   */
  static async validateMemberEligibility(memberId: number): Promise<{
    is_eligible: boolean;
    eligibility_notes: string;
  }> {
    try {
      const response = await api.get(`/leadership/members/${memberId}/eligibility`);
      return response.data.data;
    } catch (error: any) {
      // Fallback validation - ALL MEMBERS ARE NOW ELIGIBLE
      return {
        is_eligible: true,
        eligibility_notes: 'All members are eligible for leadership positions'
      };
    }
  }

  /**
   * Get all members eligible for leadership positions
   */
  static async getEligibleLeadershipMembers(filters?: {
    hierarchy_level?: 'National' | 'Province' | 'District' | 'Municipality' | 'Ward';
    entity_id?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    members: any[];
    pagination: any;
  }> {
    try {
      const response = await api.get('/leadership/eligible-members', { params: filters });
      return {
        members: response.data.data || [],
        pagination: response.data.pagination || { total: 0, totalPages: 1 }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch eligible members: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== GEOGRAPHIC HIERARCHY ====================

  /**
   * Get all provinces
   */
  static async getProvinces(): Promise<GeographicEntity[]> {
    try {
      const response = await api.get('/leadership/geographic/provinces');
      return response.data.data.provinces;
    } catch (error: any) {
      throw new Error(`Failed to fetch provinces: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get municipalities by province
   */
  static async getMunicipalitiesByProvince(provinceId: number): Promise<GeographicEntity[]> {
    try {
      const response = await api.get(`/leadership/geographic/municipalities/${provinceId}`);
      const municipalities = response.data.data.municipalities;

      // Transform municipality_id to id for GeographicEntity interface
      return municipalities.map((m: any) => ({
        ...m,
        id: m.municipality_id || m.id
      }));
    } catch (error: any) {
      throw new Error(`Failed to fetch municipalities: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get municipalities by province CODE
   */
  static async getMunicipalitiesByProvinceCode(provinceCode: string): Promise<GeographicEntity[]> {
    try {
      // Use the core geographic endpoint which supports code-based filtering
      const response = await api.get(`/geographic/municipalities`, { params: { province: provinceCode } });
      const municipalities = response.data.data.municipalities ?? response.data.data;

      // Transform municipality_id to id for GeographicEntity interface
      return municipalities.map((m: any) => ({
        ...m,
        id: m.municipality_id || m.id
      }));
    } catch (error: any) {
      throw new Error(`Failed to fetch municipalities: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get wards by municipality
   */
  static async getWardsByMunicipality(municipalityId: number): Promise<GeographicEntity[]> {
    try {
      const response = await api.get(`/leadership/geographic/wards/${municipalityId}`);
      return response.data.data.wards;
    } catch (error: any) {
      throw new Error(`Failed to fetch wards: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get wards by municipality CODE
   */
  static async getWardsByMunicipalityCode(municipalityCode: string, limit: number = 100): Promise<GeographicEntity[]> {
    try {
      const safeLimit = Math.min(limit, 100);
      const response = await api.get(`/geographic/wards`, { params: { municipality: municipalityCode, limit: safeLimit, page: 1 } });
      return response.data.data.wards ?? response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch wards: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== WAR COUNCIL STRUCTURE METHODS ====================

  /**
   * Get War Council Structure with all positions and appointments
   */
  static async getWarCouncilStructure(): Promise<WarCouncilStructure> {
    try {
      const response = await api.get('/leadership/war-council/structure');
      return response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch War Council structure: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get War Council Dashboard data
   */
  static async getWarCouncilDashboard(): Promise<WarCouncilDashboard> {
    try {
      const response = await api.get('/leadership/war-council/dashboard');
      return response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch War Council dashboard: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all War Council positions
   */
  static async getWarCouncilPositions(): Promise<WarCouncilPosition[]> {
    try {
      const response = await api.get('/leadership/war-council/positions');
      return response.data.data.positions;
    } catch (error: any) {
      throw new Error(`Failed to fetch War Council positions: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get available (vacant) War Council positions
   */
  static async getAvailableWarCouncilPositions(): Promise<WarCouncilPosition[]> {
    try {
      const response = await api.get('/leadership/war-council/positions/available');
      return response.data.data.positions;
    } catch (error: any) {
      throw new Error(`Failed to fetch available War Council positions: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get eligible members for a specific War Council position
   */
  static async getEligibleMembersForWarCouncilPosition(positionId: number): Promise<any[]> {
    try {
      const response = await api.get(`/leadership/war-council/positions/${positionId}/eligible-members`);
      return response.data.data.members;
    } catch (error: any) {
      throw new Error(`Failed to fetch eligible members: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create War Council appointment
   */
  static async createWarCouncilAppointment(appointmentData: CreateAppointmentData): Promise<number> {
    try {
      const response = await api.post('/leadership/war-council/appointments', appointmentData);
      return response.data.data.appointment_id;
    } catch (error: any) {
      throw new Error(`Failed to create War Council appointment: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Validate War Council appointment before creating
   */
  static async validateWarCouncilAppointment(positionId: number, memberId: number): Promise<WarCouncilValidation> {
    try {
      const response = await api.post('/leadership/war-council/appointments/validate', {
        position_id: positionId,
        member_id: memberId
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to validate War Council appointment: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Check if War Council position is vacant
   */
  static async isWarCouncilPositionVacant(positionId: number): Promise<boolean> {
    try {
      const response = await api.get(`/leadership/war-council/positions/${positionId}/vacancy`);
      return response.data.data.is_vacant;
    } catch (error: any) {
      throw new Error(`Failed to check position vacancy: ${error.response?.data?.message || error.message}`);
    }
  }
}

export default LeadershipAPI;
