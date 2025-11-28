import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../store';

// Layout Components
import MainLayout from '../components/layout/MainLayout';
import PublicLayout from '../components/layout/PublicLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';

// Public Pages
import HomePage from '../pages/public/HomePage';
import MembershipApplicationPage from '../pages/public/MembershipApplicationPage';
import ApplicationStatusPage from '../pages/public/ApplicationStatusPage';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';

// Error Pages
import {
  AccessDenied,
  NotFound,
  ServerError,
  BadRequest,
  ServiceUnavailable,
  GenericError,
  ErrorBoundary,
  ErrorPageDemo,
} from '../pages/errors';

// Dashboard Pages
import DashboardPage from '../pages/dashboard/DashboardPage';
import HierarchicalDashboard from '../pages/dashboard/HierarchicalDashboard';

// Member Management Pages
import MembersListPage from '../pages/members/MembersListPage';
import MemberDetailPage from '../pages/members/MemberDetailPage';
import MemberCreatePage from '../pages/members/MemberCreatePage';
import MemberBulkUploadPage from '../pages/members/MemberBulkUploadPage';
import ExpirationManagementPage from '../pages/membership/ExpirationManagementPage';
import RenewalManagementPage from '../pages/admin/RenewalManagement';
import MyMembershipCardPage from '../pages/public/MyMembershipCard';
import WardMembershipAuditPage from '../pages/audit/WardMembershipAuditPage';
import MemberRenewalPortal from '../pages/public/MemberRenewalPortal';

// Profile & Settings Pages
import ProfileSettingsPage from '../pages/profile/ProfileSettingsPage';

// Application Management Pages
import ApplicationsListPage from '../pages/applications/ApplicationsListPage';
import ApplicationDetailPage from '../pages/applications/ApplicationDetailPage';

// Leadership Pages
import LeadershipPage from '../pages/leadership/LeadershipPage';
import ElectionsPage from '../pages/elections/ElectionsPage';
import ElectionDetailPage from '../pages/elections/ElectionDetailPage';

// Meeting Pages
import MeetingsPage from '../pages/meetings/MeetingsPage';
import MeetingDetailPage from '../pages/meetings/MeetingDetailPage';
import MeetingCreatePage from '../pages/meetings/MeetingCreatePage';
import MeetingEditPage from '../pages/meetings/MeetingEditPage';
import MeetingAttendancePage from '../pages/meetings/MeetingAttendancePage';
import HierarchicalMeetingCreatePage from '../pages/meetings/HierarchicalMeetingCreatePage';
import HierarchicalMeetingsDashboard from '../pages/meetings/HierarchicalMeetingsDashboard';
import MeetingDocumentsPage from '../pages/meetings/MeetingDocumentsPage';
import DocumentEditorPage from '../pages/meetings/DocumentEditorPage';
import DocumentViewerPage from '../pages/meetings/DocumentViewerPage';

// SMS Pages
import SMSPage from '../pages/sms/SMSPage';

// Demo Components
import PermissionDemo from '../components/demo/PermissionDemo';

// System Pages
import SystemPage from '../pages/system/SystemPage';

// User Management Pages
import UserManagementPage from '../pages/users/UserManagementPage';
import AdminManagementDashboard from '../pages/admin/AdminManagementDashboard';

// import CommunicationDashboard from '../pages/communication/CommunicationDashboard'; // Removed communication module

// Financial Pages
import FinancialDashboardPage from '../pages/financial/FinancialDashboardPage';
import FinancialTransactionHistoryPage from '../pages/financial/FinancialTransactionHistoryPage';

// Analytics Pages
import AnalyticsPage from '../pages/analytics/AnalyticsPage';
import BusinessIntelligenceDashboard from '../components/analytics/BusinessIntelligenceDashboard';
import ReportsPage from '../pages/reports/ReportsPage';

// Audit Pages
import MemberAuditDashboard from '../pages/audit/MemberAuditDashboard';
import MemberAuditReport from '../pages/audit/MemberAuditReport';
import WardAuditReport from '../pages/audit/WardAuditReport';
import MunicipalityAuditReport from '../pages/audit/MunicipalityAuditReport';
import WardDetailAudit from '../pages/audit/WardDetailAudit';

// Ward Audit System Pages
import WardComplianceDashboard from '../pages/wardAudit/WardAuditDashboard';
import WardComplianceDetail from '../pages/wardAudit/WardComplianceDetail';
import MunicipalityDelegateReport from '../pages/wardAudit/MunicipalityDelegateReport';

// Search Pages
import MemberSearchPage from '../pages/search/MemberSearchPage';
import GeographicSearchPage from '../pages/search/GeographicSearchPage';
import VotingDistrictsSearchPage from '../pages/search/VotingDistrictsSearchPage';
import VotingStationsSearchPage from '../pages/search/VotingStationsSearchPage';

// Legacy Error Pages (keeping for backward compatibility)
import NotFoundPage from '../pages/error/NotFoundPage';

// Maintenance Pages
import MaintenancePage from '../pages/maintenance/MaintenancePage';

// Test Components
import VotingDistrictsTest from '../components/test/VotingDistrictsTest';
import GeographicSelectorTest from '../components/test/GeographicSelectorTest';
import VotingDistrictsVisualization from '../components/test/VotingDistrictsVisualization';
import APIDebugTest from '../components/test/APIDebugTest';
import PDFExportTest from '../components/test/PDFExportTest';

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Maintenance Route */}
      <Route path="/maintenance" element={<MaintenancePage />} />

      {/* Public Routes */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <HomePage />} />
        <Route path="apply" element={<MembershipApplicationPage />} />
        <Route path="application-status" element={<ApplicationStatusPage />} />
        <Route path="renew" element={<MemberRenewalPortal />} />
        <Route path="my-card" element={<MyMembershipCardPage />} />
      </Route>

      {/* Admin/Dashboard Routes */}
      <Route path="/admin" element={
        <ProtectedRoute requireAuth={true}>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Hierarchical Dashboard Routes */}
        <Route path="dashboard/hierarchical" element={<HierarchicalDashboard />} />
        <Route path="dashboard/hierarchical/:level/:code?" element={<HierarchicalDashboard />} />
        
        {/* Member Management */}
        <Route path="members">
          <Route index element={<MembersListPage />} />
          <Route path="new" element={<MemberCreatePage />} />
          <Route path="bulk-upload" element={<MemberBulkUploadPage />} />
          <Route path=":id" element={<MemberDetailPage />} />
        </Route>

        {/* Membership Expiration Management */}
        <Route path="membership-expiration" element={<ExpirationManagementPage />} />

        {/* Membership Renewal Management */}
        <Route path="renewal-management" element={<RenewalManagementPage />} />

        {/* Application Management */}
        <Route path="applications">
          <Route index element={<ApplicationsListPage />} />
          <Route path=":id" element={<ApplicationDetailPage />} />
        </Route>

        {/* Renewal Detail Routes - Uses ApplicationDetailPage with renewal context */}
        <Route path="renewals">
          <Route path=":id/renewal" element={<ApplicationDetailPage />} />
        </Route>

        {/* Search & Lookup */}
        <Route path="search">
          <Route path="members" element={<MemberSearchPage />} />
          <Route path="geographic" element={<GeographicSearchPage />} />
          <Route path="voting-districts" element={<VotingDistrictsSearchPage />} />
          <Route path="voting-stations" element={<VotingStationsSearchPage />} />
        </Route>

        {/* Leadership Management - National and Provincial Admin only */}
        <Route path="leadership" element={
          <ProtectedRoute requireAdminLevel="province">
            <LeadershipPage />
          </ProtectedRoute>
        } />

        {/* Elections - National and Provincial Admin only */}
        <Route path="elections">
          <Route index element={
            <ProtectedRoute requireAdminLevel="province">
              <ElectionsPage />
            </ProtectedRoute>
          } />
          <Route path=":id" element={
            <ProtectedRoute requireAdminLevel="province">
              <ElectionDetailPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* Meetings - Available to all admin levels */}
        <Route path="meetings">
          <Route index element={<MeetingsPage />} />
          <Route path="new" element={<MeetingCreatePage />} />
          <Route path=":id" element={<MeetingDetailPage />} />
          <Route path=":id/edit" element={<MeetingEditPage />} />
          <Route path=":id/attendance" element={<MeetingAttendancePage />} />
          <Route path=":meetingId/documents" element={<MeetingDocumentsPage />} />
          <Route path=":meetingId/documents/new" element={<DocumentEditorPage />} />
          <Route path=":meetingId/documents/:documentId" element={<DocumentViewerPage />} />
          <Route path=":meetingId/documents/:documentId/edit" element={<DocumentEditorPage />} />
          <Route path="hierarchical" element={<HierarchicalMeetingsDashboard />} />
          <Route path="hierarchical/new" element={<HierarchicalMeetingCreatePage />} />
          <Route path="hierarchical/:id" element={<MeetingDetailPage />} />
          <Route path="hierarchical/:id/edit" element={<HierarchicalMeetingCreatePage />} />
          <Route path="hierarchical/:id/attendance" element={<MeetingAttendancePage />} />
        </Route>

        {/* SMS - National Admin only */}
        <Route path="sms" element={
          <ProtectedRoute requireAdminLevel="national">
            <SMSPage />
          </ProtectedRoute>
        } />

        {/* Financial Dashboard - Financial Reviewers and Admins */}
        <Route path="financial-dashboard" element={<FinancialDashboardPage />} />

        {/* Financial Transaction History - Financial Reviewers and Admins */}
        <Route path="financial-transactions" element={<FinancialTransactionHistoryPage />} />

        {/* Analytics & Reports */}
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="business-intelligence" element={<BusinessIntelligenceDashboard />} />
        <Route path="reports" element={<ReportsPage />} />

        {/* Member Audit System */}
        <Route path="audit">
          <Route index element={<MemberAuditDashboard />} />
          <Route path="members" element={<MemberAuditReport />} />
          <Route path="wards" element={<WardAuditReport />} />
          <Route path="municipalities" element={<MunicipalityAuditReport />} />
          <Route path="ward/:wardCode" element={<WardDetailAudit />} />
          <Route path="ward-membership" element={<WardMembershipAuditPage />} />
        </Route>

        {/* Ward Audit System */}
        <Route path="ward-audit">
          <Route index element={<WardComplianceDashboard />} />
          <Route path="ward/:wardCode" element={<WardComplianceDetail />} />
          <Route path="municipality/:municipalityCode" element={<MunicipalityDelegateReport />} />
        </Route>

        {/* User Management - National and Provincial Admin only */}
        <Route path="users" element={
          <ProtectedRoute requireUserManagement={true}>
            <UserManagementPage />
          </ProtectedRoute>
        } />

        {/* Profile & Settings - All authenticated users */}
        <Route path="profile" element={<ProfileSettingsPage />} />

        {/* Communication Management - Removed */}
        {/* <Route path="communication" element={<CommunicationDashboard />} /> */}

        {/* Admin Management Dashboard - National Admin only */}
        <Route path="admin-management" element={
          <ProtectedRoute requireAdminLevel="national">
            <AdminManagementDashboard />
          </ProtectedRoute>
        } />

        {/* System Administration - National Admin only */}
        <Route path="system" element={
          <ProtectedRoute requireAdminLevel="national">
            <SystemPage />
          </ProtectedRoute>
        } />

        {/* Demo Routes */}
        <Route path="demo/permissions" element={<PermissionDemo />} />
        <Route path="demo/error-pages" element={<ErrorPageDemo />} />

        {/* Test Routes */}
        <Route path="test/voting-districts" element={<VotingDistrictsTest />} />
        <Route path="test/geographic-selector" element={<GeographicSelectorTest />} />
        <Route path="test/voting-districts-viz" element={<VotingDistrictsVisualization />} />
        <Route path="test/api-debug" element={<APIDebugTest />} />
        <Route path="test/pdf-export" element={<PDFExportTest />} />
      </Route>

      {/* Error Pages Routes */}
      <Route path="/error/access-denied" element={<AccessDenied />} />
      <Route path="/error/not-found" element={<NotFound />} />
      <Route path="/error/server-error" element={<ServerError />} />
      <Route path="/error/bad-request" element={<BadRequest />} />
      <Route path="/error/service-unavailable" element={<ServiceUnavailable />} />
      <Route path="/error/generic" element={<GenericError />} />

      {/* Catch all route - Use new NotFound component */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
