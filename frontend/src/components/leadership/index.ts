// Leadership Components Index
// Exports all leadership-related components

export { default as LeadershipManagement } from './LeadershipManagement';
export { default as LeadershipAssignment } from './LeadershipAssignment';
export { default as MemberSelector } from './MemberSelector';
export { default as LeadershipDemo } from './LeadershipDemo';
export { default as LeadershipTest } from './LeadershipTest';
export { default as ImportTest } from './ImportTest';
export { default as QuickTest } from './QuickTest';
export { default as SimpleTest } from './SimpleTest';
export { default as FinalTest } from './FinalTest';
export { default as IconTest } from './IconTest';
export { default as ApiTest } from './ApiTest';
export { default as DatabaseTest } from './DatabaseTest';
export { default as GeographicFilterTest } from './GeographicFilterTest';
export { default as MemberSelectorTest } from './MemberSelectorTest';
export { default as MemberSelectorDebug } from './MemberSelectorDebug';
export { default as EligibleMembersView } from './EligibleMembersView';
export { default as GeographicSelector } from './GeographicSelector';

// War Council Structure components
export { default as WarCouncilStructure } from './WarCouncilStructure';
export { default as WarCouncilDashboard } from './WarCouncilDashboard';
export { default as WarCouncilAppointmentDialog } from './WarCouncilAppointmentDialog';

// Re-export API service
export { LeadershipAPI } from '../../services/leadershipApi';

// Re-export types
export type {
  LeadershipPosition,
  LeadershipAppointment,
  LeadershipAppointmentDetails,
  CreateAppointmentData,
  MemberFilters,
  PositionFilters,
  AppointmentFilters,
  WarCouncilPosition,
  WarCouncilStructureView,
  WarCouncilStructure as WarCouncilStructureData,
  WarCouncilDashboard as WarCouncilDashboardData,
  WarCouncilValidation
} from '../../services/leadershipApi';
