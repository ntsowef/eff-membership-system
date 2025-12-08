// War Council Structure Validation Utilities
// Provides comprehensive validation for War Council appointments and structure management

import type { WarCouncilStructureView } from '../services/leadershipApi';
// import type { WarCouncilValidation } from '../services/leadershipApi';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AppointmentValidationData {
  positionId: number;
  memberId: number;
  appointmentType: 'Elected' | 'Appointed' | 'Acting' | 'Interim';
  startDate: Date;
  endDate?: Date;
  memberProvince?: string;
  memberName?: string;
}

/**
 * War Council Structure Validation Class
 * Provides client-side validation for War Council appointments and structure management
 */
export class WarCouncilValidator {
  
  /**
   * Validate appointment form data before submission
   */
  static validateAppointmentForm(data: AppointmentValidationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!data.positionId) {
      errors.push('Position is required');
    }

    if (!data.memberId) {
      errors.push('Member is required');
    }

    if (!data.appointmentType) {
      errors.push('Appointment type is required');
    }

    if (!data.startDate) {
      errors.push('Start date is required');
    }

    // Date validation
    if (data.startDate && data.endDate) {
      if (data.endDate <= data.startDate) {
        errors.push('End date must be after start date');
      }
    }

    // Start date validation (cannot be in the past for new appointments)
    if (data.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(data.startDate);
      startDate.setHours(0, 0, 0, 0);

      if (startDate < today) {
        warnings.push('Start date is in the past');
      }
    }

    // Appointment type specific validation
    if (data.appointmentType === 'Acting' || data.appointmentType === 'Interim') {
      if (!data.endDate) {
        warnings.push(`${data.appointmentType} appointments typically have an end date`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate War Council structure completeness
   */
  static validateStructureCompleteness(structure: WarCouncilStructureView[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Core positions that must be filled
    const corePositions = ['PRES', 'DPRES', 'SG', 'DSG', 'NCHAIR', 'TG'];
    const corePositionsInStructure = structure.filter(pos => 
      corePositions.includes(pos.position_code)
    );

    // Check if all core positions exist
    const missingCorePositions = corePositions.filter(code => 
      !corePositionsInStructure.some(pos => pos.position_code === code)
    );

    if (missingCorePositions.length > 0) {
      errors.push(`Missing core positions: ${missingCorePositions.join(', ')}`);
    }

    // Check core position fill rate
    const filledCorePositions = corePositionsInStructure.filter(pos => 
      pos.position_status === 'Filled'
    );

    const corePositionFillRate = corePositionsInStructure.length > 0 
      ? (filledCorePositions.length / corePositionsInStructure.length) * 100 
      : 0;

    if (corePositionFillRate < 50) {
      errors.push('Less than 50% of core positions are filled');
    } else if (corePositionFillRate < 80) {
      warnings.push('Less than 80% of core positions are filled');
    }

    // Check CCT Deployees (should have 9 for all provinces)
    const cctDeployees = structure.filter(pos => 
      pos.position_code.startsWith('CCT-')
    );

    const expectedProvinces = ['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NC', 'NW', 'WC'];
    const deployeeProvinces = cctDeployees.map(pos => pos.province_code).filter(Boolean);
    const missingProvinces = expectedProvinces.filter(code => 
      !deployeeProvinces.includes(code)
    );

    if (missingProvinces.length > 0) {
      warnings.push(`Missing CCT Deployees for provinces: ${missingProvinces.join(', ')}`);
    }

    // Check for duplicate appointments (should not happen with proper validation)
    const filledPositions = structure.filter(pos => pos.position_status === 'Filled');
    const memberIds = filledPositions.map(pos => pos.member_id).filter(Boolean);
    const duplicateMembers = memberIds.filter((id, index) => 
      memberIds.indexOf(id) !== index
    );

    if (duplicateMembers.length > 0) {
      errors.push('Duplicate member appointments detected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate position-specific requirements
   */
  static validatePositionRequirements(
    positionCode: string, 
    memberData: any
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Province-specific validation for CCT Deployees
    if (positionCode.startsWith('CCT-')) {
      const requiredProvince = positionCode.split('-')[1];
      
      if (memberData.province_code && memberData.province_code !== requiredProvince) {
        errors.push(
          `Member must be from ${requiredProvince} province for this CCT Deployee position`
        );
      }
    }

    // Leadership experience validation (warnings only)
    if (['PRES', 'DPRES'].includes(positionCode)) {
      if (!memberData.leadership_experience) {
        warnings.push('President and Deputy President positions typically require leadership experience');
      }
    }

    // Membership duration validation
    if (memberData.membership_duration_months) {
      const minMonths = positionCode.startsWith('CCT-') ? 12 : 24; // CCT: 1 year, Core: 2 years
      
      if (memberData.membership_duration_months < minMonths) {
        warnings.push(
          `Member has only ${memberData.membership_duration_months} months of membership. ` +
          `Recommended minimum: ${minMonths} months`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate appointment conflicts
   */
  static validateAppointmentConflicts(
    memberId: number,
    positionCode: string,
    currentStructure: WarCouncilStructureView[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if member already has a War Council appointment
    const existingAppointment = currentStructure.find(pos => 
      pos.member_id === memberId && pos.position_status === 'Filled'
    );

    if (existingAppointment) {
      errors.push(
        `Member is already appointed as ${existingAppointment.position_name} in War Council`
      );
    }

    // Check if position is already filled
    const positionAlreadyFilled = currentStructure.find(pos => 
      pos.position_code === positionCode && pos.position_status === 'Filled'
    );

    if (positionAlreadyFilled) {
      errors.push(`Position is already filled by ${positionAlreadyFilled.member_name}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get position priority for validation ordering
   */
  static getPositionPriority(positionCode: string): number {
    const priorities: { [key: string]: number } = {
      'PRES': 1,      // President - highest priority
      'DPRES': 2,     // Deputy President
      'SG': 3,        // Secretary General
      'DSG': 4,       // Deputy Secretary General
      'NCHAIR': 5,    // National Chairperson
      'TG': 6,        // Treasurer General
    };

    // CCT Deployees have lower priority
    if (positionCode.startsWith('CCT-')) {
      return 10;
    }

    return priorities[positionCode] || 99;
  }

  /**
   * Validate complete War Council appointment workflow
   */
  static validateCompleteAppointment(
    appointmentData: AppointmentValidationData,
    position: WarCouncilStructureView,
    currentStructure: WarCouncilStructureView[]
  ): ValidationResult {
    const results: ValidationResult[] = [];

    // Form validation
    results.push(this.validateAppointmentForm(appointmentData));

    // Position requirements validation
    results.push(this.validatePositionRequirements(position.position_code, {
      province_code: appointmentData.memberProvince,
      membership_duration_months: 24 // Default assumption
    }));

    // Conflict validation
    results.push(this.validateAppointmentConflicts(
      appointmentData.memberId,
      position.position_code,
      currentStructure
    ));

    // Combine all results
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Format validation messages for display
   */
  static formatValidationMessages(validation: ValidationResult): {
    errorMessage?: string;
    warningMessage?: string;
  } {
    const result: { errorMessage?: string; warningMessage?: string } = {};

    if (validation.errors.length > 0) {
      result.errorMessage = validation.errors.length === 1 
        ? validation.errors[0]
        : `Multiple validation errors:\n• ${validation.errors.join('\n• ')}`;
    }

    if (validation.warnings.length > 0) {
      result.warningMessage = validation.warnings.length === 1
        ? validation.warnings[0]
        : `Validation warnings:\n• ${validation.warnings.join('\n• ')}`;
    }

    return result;
  }
}

/**
 * War Council position configuration
 */
export const WAR_COUNCIL_POSITIONS = {
  CORE_POSITIONS: [
    { code: 'PRES', name: 'President', priority: 1 },
    { code: 'DPRES', name: 'Deputy President', priority: 2 },
    { code: 'SG', name: 'Secretary General', priority: 3 },
    { code: 'DSG', name: 'Deputy Secretary General', priority: 4 },
    { code: 'NCHAIR', name: 'National Chairperson', priority: 5 },
    { code: 'TG', name: 'Treasurer General', priority: 6 }
  ],
  CCT_DEPLOYEES: [
    { code: 'CCT-EC', name: 'CCT Deployee - Eastern Cape', province: 'EC' },
    { code: 'CCT-FS', name: 'CCT Deployee - Free State', province: 'FS' },
    { code: 'CCT-GP', name: 'CCT Deployee - Gauteng', province: 'GP' },
    { code: 'CCT-KZN', name: 'CCT Deployee - KwaZulu-Natal', province: 'KZN' },
    { code: 'CCT-LP', name: 'CCT Deployee - Limpopo', province: 'LP' },
    { code: 'CCT-MP', name: 'CCT Deployee - Mpumalanga', province: 'MP' },
    { code: 'CCT-NC', name: 'CCT Deployee - Northern Cape', province: 'NC' },
    { code: 'CCT-NW', name: 'CCT Deployee - North West', province: 'NW' },
    { code: 'CCT-WC', name: 'CCT Deployee - Western Cape', province: 'WC' }
  ]
};

export default WarCouncilValidator;
