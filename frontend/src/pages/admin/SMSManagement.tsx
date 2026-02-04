import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Campaign as CampaignIcon,
  Message as MessageIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
  CakeOutlined as BirthdayIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  Webhook as WebhookIcon,
  MonitorHeart as MonitorIcon,
  CalendarMonth as CalendarMonthIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { api } from '../../lib/api';
import StatsCard from '../../components/ui/StatsCard';
import ActionButton from '../../components/ui/ActionButton';
import PageHeader from '../../components/ui/PageHeader';

interface SMSTemplate {
  id: number;
  name: string;
  description?: string;
  content: string;
  variables: string[];
  category: 'campaign' | 'notification' | 'reminder' | 'announcement' | 'custom';
  is_active: boolean;
  created_at: string;
}

interface SMSCampaign {
  id: number;
  name: string;
  description?: string;
  template_id?: number;
  template_name?: string;
  message_content: string;
  target_type: 'all' | 'province' | 'district' | 'municipality' | 'ward' | 'custom' | 'list';
  target_criteria: any;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  created_at: string;
}

interface DashboardStats {
  campaign_statistics: {
    total_campaigns: number;
    draft_campaigns: number;
    scheduled_campaigns: number;
    sending_campaigns: number;
    sent_campaigns: number;
    total_messages_sent: number;
    total_messages_delivered: number;
    total_messages_failed: number;
  };
  template_statistics: {
    total_templates: number;
    active_templates: number;
  };
  recent_campaigns: SMSCampaign[];
}

const SMSManagement: React.FC = () => {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);

  // Campaigns state
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<SMSCampaign | null>(null);
  const [campaignPage, setCampaignPage] = useState(0);
  const [campaignRowsPerPage, setCampaignRowsPerPage] = useState(10);
  const [totalCampaigns, setTotalCampaigns] = useState(0);

  // Birthday SMS state
  const [birthdayStats, setBirthdayStats] = useState<any>(null);
  const [todaysBirthdays, setTodaysBirthdays] = useState<any[]>([]);
  const [_upcomingBirthdays, _setUpcomingBirthdays] = useState<any[]>([]);
  const [birthdayHistory, setBirthdayHistory] = useState<any[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);

  // Monthly Birthday Statistics state
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [monthlyStatsTotals, setMonthlyStatsTotals] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedMonthMembers, setSelectedMonthMembers] = useState<any[]>([]);
  const [selectedMonthStats, setSelectedMonthStats] = useState<any>(null);
  const [monthlyStatsPage, setMonthlyStatsPage] = useState(0);
  const [monthlyStatsRowsPerPage, setMonthlyStatsRowsPerPage] = useState(25);
  const [monthlyStatsTotalMembers, setMonthlyStatsTotalMembers] = useState(0);

  // Provider monitoring state
  const [_providerHealth, _setProviderHealth] = useState<any>(null);
  const [deliveryStats, setDeliveryStats] = useState<any>(null);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);

  // Delivery Tracking state
  const [deliveryReport, setDeliveryReport] = useState<any[]>([]);
  const [deliveryReportStats, setDeliveryReportStats] = useState<any>(null);
  const [deliveryReportPage, setDeliveryReportPage] = useState(0);
  const [deliveryReportRowsPerPage, setDeliveryReportRowsPerPage] = useState(10);
  const [deliveryReportTotal, setDeliveryReportTotal] = useState(0);
  const [deliveryReportFilter, setDeliveryReportFilter] = useState({
    status: 'all',
    month: '',
    year: new Date().getFullYear().toString(),
    startDate: '',
    endDate: ''
  });
  const [showDeliveryReport, setShowDeliveryReport] = useState(false);

  // Form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    content: '',
    variables: [] as string[],
    category: 'custom' as SMSTemplate['category'],
    is_active: true
  });

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    template_id: '',
    message_content: '',
    target_type: 'custom' as SMSCampaign['target_type'],
    target_criteria: {},
    priority: 'normal' as SMSCampaign['priority']
  });

  useEffect(() => {
    loadDashboardStats();
    loadTemplates();
    loadCampaigns();
    loadBirthdayData();
    loadProviderHealth();
    loadWebhookLogs();
    loadMonthlyStats();
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [campaignPage, campaignRowsPerPage]);

  useEffect(() => {
    if (selectedMonth !== null) {
      loadSelectedMonthData(selectedMonth);
    }
  }, [selectedMonth, monthlyStatsPage, monthlyStatsRowsPerPage]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sms/dashboard/stats');
      setDashboardStats(response.data.data);
    } catch (err: any) {
      setError('Failed to load dashboard statistics');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sms/templates');
      setTemplates(response.data.data.templates);
    } catch (err: any) {
      setError('Failed to load SMS templates');
      console.error('Templates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sms/campaigns', {
        params: {
          page: campaignPage + 1,
          limit: campaignRowsPerPage
        }
      });
      setCampaigns(response.data.data.campaigns);
      setTotalCampaigns(response.data.data.total);
    } catch (err: any) {
      setError('Failed to load SMS campaigns');
      console.error('Campaigns error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setLoading(true);
      await api.post('/sms/templates', templateForm);
      setSuccess('SMS template created successfully');
      setTemplateDialog(false);
      resetTemplateForm();
      loadTemplates();
    } catch (err: any) {
      setError('Failed to create SMS template');
      console.error('Create template error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      setLoading(true);
      await api.put(`/sms/templates/${editingTemplate.id}`, templateForm);
      setSuccess('SMS template updated successfully');
      setTemplateDialog(false);
      resetTemplateForm();
      loadTemplates();
    } catch (err: any) {
      setError('Failed to update SMS template');
      console.error('Update template error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Provider monitoring functions
  const loadProviderHealth = async () => {
    try {
      const response = await api.get('/sms-webhooks/stats?timeframe=day');
      setDeliveryStats(response.data.data.statistics);
    } catch (err: any) {
      console.error('Failed to load delivery stats:', err);
    }
  };

  const loadWebhookLogs = async () => {
    try {
      const response = await api.get('/sms-webhooks/logs?limit=20');
      setWebhookLogs(response.data.data.logs);
    } catch (err: any) {
      console.error('Failed to load webhook logs:', err);
    }
  };

  const testProviderHealth = async () => {
    try {
      setLoading(true);
      await api.post('/sms-webhooks/test/json-applink', {
        test_message: 'Health check test from EFF Membership System'
      });
      setSuccess('Provider health test completed successfully');
      loadProviderHealth();
    } catch (err: any) {
      setError('Provider health test failed');
      console.error('Health test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      setLoading(true);
      await api.delete(`/sms/templates/${id}`);
      setSuccess('SMS template deleted successfully');
      loadTemplates();
    } catch (err: any) {
      setError('Failed to delete SMS template');
      console.error('Delete template error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      setLoading(true);
      await api.post('/sms/campaigns', campaignForm);
      setSuccess('SMS campaign created successfully');
      setCampaignDialog(false);
      resetCampaignForm();
      loadCampaigns();
      loadDashboardStats();
    } catch (err: any) {
      setError('Failed to create SMS campaign');
      console.error('Create campaign error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      content: '',
      variables: [],
      category: 'custom',
      is_active: true
    });
    setEditingTemplate(null);
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: '',
      description: '',
      template_id: '',
      message_content: '',
      target_type: 'custom',
      target_criteria: {},
      priority: 'normal'
    });
    setEditingCampaign(null);
  };

  const openTemplateDialog = (template?: SMSTemplate) => {
    if (template) {
      setEditingTemplate(template);
      // Ensure variables is always an array
      let variables: string[] = [];
      const templateVars = template.variables as string[] | string;
      if (Array.isArray(templateVars)) {
        variables = templateVars;
      } else if (typeof templateVars === 'string') {
        variables = templateVars.split(',').map((v: string) => v.trim()).filter((v: string) => v);
      }
      setTemplateForm({
        name: template.name,
        description: template.description || '',
        content: template.content,
        variables,
        category: template.category,
        is_active: template.is_active
      });
    } else {
      resetTemplateForm();
    }
    setTemplateDialog(true);
  };

  const openCampaignDialog = (campaign?: SMSCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setCampaignForm({
        name: campaign.name,
        description: campaign.description || '',
        template_id: campaign.template_id?.toString() || '',
        message_content: campaign.message_content,
        target_type: campaign.target_type,
        target_criteria: campaign.target_criteria,
        priority: campaign.priority
      });
    } else {
      resetCampaignForm();
    }
    setCampaignDialog(true);
  };

  // Birthday SMS functions
  const loadBirthdayData = async () => {
    try {
      setLoading(true);
      const [statsRes, todaysRes, upcomingRes, historyRes, schedulerRes] = await Promise.all([
        api.get('/birthday-sms/statistics'),
        api.get('/birthday-sms/todays-birthdays'),
        api.get('/birthday-sms/upcoming-birthdays?days=7'),
        api.get('/birthday-sms/history?page=1&limit=10'),
        api.get('/birthday-sms/scheduler/status')
      ]);

      setBirthdayStats(statsRes.data.data.statistics);
      setTodaysBirthdays(todaysRes.data.data.birthdays);
      _setUpcomingBirthdays(upcomingRes.data.data.birthdays);
      setBirthdayHistory(historyRes.data.data.history);
      setSchedulerStatus(schedulerRes.data.data.scheduler_status);
    } catch (err: any) {
      setError('Failed to load birthday SMS data');
      console.error('Birthday SMS data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Monthly Birthday Statistics functions
  const loadMonthlyStats = async () => {
    try {
      console.log('Loading monthly stats...');
      const response = await api.get('/birthday-sms/monthly-stats');
      console.log('Monthly stats response:', response.data);
      if (response.data.success) {
        setMonthlyStats(response.data.data.monthly_stats || []);
        setMonthlyStatsTotals(response.data.data.totals || null);
      } else {
        console.error('API returned error:', response.data.error);
        setError(response.data.error?.message || 'Failed to load monthly stats');
      }
    } catch (err: any) {
      console.error('Failed to load monthly stats:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error?.message || 'Failed to load monthly stats');
    }
  };

  const loadSelectedMonthData = async (month: number) => {
    try {
      setLoading(true);
      const response = await api.get(`/birthday-sms/monthly-stats/${month}`, {
        params: {
          page: monthlyStatsPage + 1,
          limit: monthlyStatsRowsPerPage
        }
      });
      setSelectedMonthStats(response.data.data.stats);
      setSelectedMonthMembers(response.data.data.members);
      setMonthlyStatsTotalMembers(response.data.data.pagination.total);
    } catch (err: any) {
      console.error('Failed to load month data:', err);
      setError('Failed to load month details');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthClick = (month: number) => {
    setSelectedMonth(month);
    setMonthlyStatsPage(0);
  };

  const handleCloseMonthDetails = () => {
    setSelectedMonth(null);
    setSelectedMonthMembers([]);
    setSelectedMonthStats(null);
  };

  const handleExportMonthlyBirthdays = async () => {
    if (!selectedMonth || !selectedMonthStats) return;

    try {
      setLoading(true);
      // Fetch all members for the selected month (using a high limit to get all)
      const response = await api.get(`/birthday-sms/monthly-stats/${selectedMonth}`, {
        params: {
          page: 1,
          limit: 100000 // Get all records
        }
      });

      const allMembers = response.data.data.members;

      if (!allMembers || allMembers.length === 0) {
        setError('No members to export');
        return;
      }

      // Prepare data for Excel
      const exportData = allMembers.map((member: any) => ({
        'Name': member.full_name || `${member.firstname} ${member.surname}`,
        'Membership #': member.membership_number || '',
        'Phone': member.cell_number || '',
        'Birth Day': member.birth_day || '',
        'Age': member.current_age || '',
        'Province': member.province_name || member.province_code || '',
        'Ward': member.ward_code || '',
        'Status': member.membership_status || ''
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 30 }, // Name
        { wch: 15 }, // Membership #
        { wch: 15 }, // Phone
        { wch: 10 }, // Birth Day
        { wch: 6 },  // Age
        { wch: 15 }, // Province
        { wch: 12 }, // Ward
        { wch: 12 }, // Status
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Birthday Members');

      // Generate filename with month name
      const monthName = selectedMonthStats.month_name || `Month_${selectedMonth}`;
      const filename = `${monthName}_Birthday_Members.xlsx`;

      // Download the file
      XLSX.writeFile(wb, filename);

      setSuccess(`Successfully exported ${allMembers.length} members to ${filename}`);
    } catch (err: any) {
      console.error('Failed to export monthly birthdays:', err);
      setError('Failed to export data to Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleQueueBirthdayMessages = async () => {
    try {
      setLoading(true);
      const response = await api.post('/birthday-sms/queue-todays-messages');
      setSuccess(`Birthday messages queued: ${response.data.data.queued} queued, ${response.data.data.skipped} skipped`);
      loadBirthdayData();
    } catch (err: any) {
      setError('Failed to queue birthday messages');
      console.error('Queue birthday messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessBirthdayQueue = async () => {
    try {
      setLoading(true);
      const response = await api.post('/birthday-sms/process-queue', { limit: 20 });
      setSuccess(`Messages processed: ${response.data.data.sent} sent, ${response.data.data.failed} failed`);
      loadBirthdayData();
    } catch (err: any) {
      setError('Failed to process birthday queue');
      console.error('Process birthday queue error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBirthdayWorkflow = async () => {
    try {
      setLoading(true);
      const response = await api.post('/birthday-sms/scheduler/run-now');
      setSuccess(`Birthday workflow completed: ${response.data.data.process.sent} messages sent`);
      loadBirthdayData();
    } catch (err: any) {
      setError('Failed to run birthday workflow');
      console.error('Birthday workflow error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleScheduler = async () => {
    try {
      setLoading(true);
      const endpoint = schedulerStatus?.isRunning ? '/birthday-sms/scheduler/stop' : '/birthday-sms/scheduler/start';
      const response = await api.post(endpoint);
      setSuccess(response.data.data.message);
      loadBirthdayData();
    } catch (err: any) {
      setError('Failed to toggle scheduler');
      console.error('Toggle scheduler error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delivery Tracking functions
  const loadDeliveryReport = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: deliveryReportPage + 1,
        limit: deliveryReportRowsPerPage
      };

      if (deliveryReportFilter.status && deliveryReportFilter.status !== 'all') {
        params.status = deliveryReportFilter.status;
      }
      if (deliveryReportFilter.month) {
        params.month = deliveryReportFilter.month;
      }
      if (deliveryReportFilter.year) {
        params.year = deliveryReportFilter.year;
      }
      if (deliveryReportFilter.startDate) {
        params.startDate = deliveryReportFilter.startDate;
      }
      if (deliveryReportFilter.endDate) {
        params.endDate = deliveryReportFilter.endDate;
      }

      const [reportRes, statsRes] = await Promise.all([
        api.get('/birthday-sms/delivery-report', { params }),
        api.get('/birthday-sms/delivery-stats', { params: {
          timeframe: 'all',
          month: deliveryReportFilter.month || undefined,
          year: deliveryReportFilter.year || undefined
        }})
      ]);

      if (reportRes.data.success) {
        setDeliveryReport(reportRes.data.data.records || []);
        setDeliveryReportTotal(reportRes.data.data.pagination?.total || 0);
      }

      if (statsRes.data.success) {
        setDeliveryReportStats(statsRes.data.data.summary || null);
      }
    } catch (err: any) {
      setError('Failed to load delivery report');
      console.error('Delivery report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportDeliveryReport = async () => {
    try {
      setLoading(true);
      const params: any = { format: 'json' };

      if (deliveryReportFilter.status && deliveryReportFilter.status !== 'all') {
        params.status = deliveryReportFilter.status;
      }
      if (deliveryReportFilter.month) {
        params.month = deliveryReportFilter.month;
      }
      if (deliveryReportFilter.year) {
        params.year = deliveryReportFilter.year;
      }
      if (deliveryReportFilter.startDate) {
        params.startDate = deliveryReportFilter.startDate;
      }
      if (deliveryReportFilter.endDate) {
        params.endDate = deliveryReportFilter.endDate;
      }

      const response = await api.get('/birthday-sms/delivery-report/export', { params });

      if (response.data.success && response.data.data.records.length > 0) {
        const exportData = response.data.data.records;
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();

        // Set column widths
        ws['!cols'] = [
          { wch: 25 }, // Member Name
          { wch: 15 }, // Membership Number
          { wch: 15 }, // Phone Number
          { wch: 50 }, // Message Content
          { wch: 20 }, // Message ID
          { wch: 12 }, // Delivery Status
          { wch: 20 }, // Sent At
          { wch: 20 }, // Delivered At
          { wch: 30 }, // Error Message
          { wch: 12 }, // Birthday Year
          { wch: 10 }, // Member Age
          { wch: 15 }, // Provider
          { wch: 10 }, // Retry Count
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Delivery Report');

        const timestamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Birthday_SMS_Delivery_Report_${timestamp}.xlsx`);

        setSuccess(`Successfully exported ${exportData.length} records to Excel`);
      } else {
        setError('No data to export');
      }
    } catch (err: any) {
      console.error('Failed to export delivery report:', err);
      setError('Failed to export delivery report');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryReportPageChange = (_event: unknown, newPage: number) => {
    setDeliveryReportPage(newPage);
  };

  const handleDeliveryReportRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDeliveryReportRowsPerPage(parseInt(event.target.value, 10));
    setDeliveryReportPage(0);
  };

  const getDeliveryStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'success';
      case 'failed': return 'error';
      case 'pending':
      case 'queued':
      case 'sending': return 'warning';
      case 'sent': return 'info';
      default: return 'default';
    }
  };

  const getDeliveryStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return <CheckCircleIcon fontSize="small" />;
      case 'failed': return <ErrorIcon fontSize="small" />;
      case 'pending':
      case 'queued':
      case 'sending': return <PendingIcon fontSize="small" />;
      case 'sent': return <SendIcon fontSize="small" />;
      default: return null;
    }
  };

  // Load delivery report when filters or pagination change
  useEffect(() => {
    if (showDeliveryReport) {
      loadDeliveryReport();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryReportPage, deliveryReportRowsPerPage, showDeliveryReport]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'scheduled': return 'info';
      case 'sending': return 'warning';
      case 'sent': return 'success';
      case 'paused': return 'secondary';
      case 'cancelled': return 'error';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'campaign': return 'primary';
      case 'notification': return 'info';
      case 'reminder': return 'warning';
      case 'announcement': return 'success';
      case 'custom': return 'default';
      default: return 'default';
    }
  };

  const renderDashboard = () => (
    <Grid container spacing={3}>
      {/* Enhanced Statistics Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Total Campaigns"
          value={dashboardStats?.campaign_statistics.total_campaigns || 0}
          subtitle="Active SMS campaigns"
          icon={CampaignIcon}
          color="primary"
          trend={{
            value: 12,
            isPositive: true,
          }}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Messages Sent"
          value={dashboardStats?.campaign_statistics.total_messages_sent || 0}
          subtitle="Total messages delivered"
          icon={MessageIcon}
          color="success"
          trend={{
            value: 8,
            isPositive: true,
          }}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Delivery Rate"
          value={`${Math.round(((dashboardStats?.campaign_statistics.total_messages_delivered || 0) / Math.max(dashboardStats?.campaign_statistics.total_messages_sent || 1, 1)) * 100)}%`}
          subtitle="Successfully delivered"
          icon={AnalyticsIcon}
          color="info"
          trend={{
            value: 5,
            isPositive: true,
          }}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Failed Messages"
          value={dashboardStats?.campaign_statistics.total_messages_failed || 0}
          subtitle="Delivery failures"
          icon={MessageIcon}
          color="error"
          trend={{
            value: 3,
            isPositive: false,
          }}
        />
      </Grid>

      {/* Recent Campaigns */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Campaigns</Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={loadDashboardStats}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Messages Sent</TableCell>
                    <TableCell>Delivered</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardStats?.recent_campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>{campaign.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={campaign.status}
                          color={getStatusColor(campaign.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{campaign.messages_sent}</TableCell>
                      <TableCell>{campaign.messages_delivered}</TableCell>
                      <TableCell>
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTemplates = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">SMS Templates</Typography>
        <ActionButton
          icon={AddIcon}
          onClick={() => openTemplateDialog()}
          gradient={true}
        >
          New Template
        </ActionButton>
      </Box>

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6" noWrap>
                    {template.name}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => openTemplateDialog(template)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body2" color="textSecondary" mb={2}>
                  {template.description}
                </Typography>

                <Typography variant="body2" mb={2} sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {template.content}
                </Typography>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Chip
                    label={template.category}
                    color={getCategoryColor(template.category) as any}
                    size="small"
                  />
                  <Chip
                    label={template.is_active ? 'Active' : 'Inactive'}
                    color={template.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                {Array.isArray(template.variables) && template.variables.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="caption" color="textSecondary">
                      Variables: {template.variables.join(', ')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderCampaigns = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">SMS Campaigns</Typography>
        <ActionButton
          icon={AddIcon}
          onClick={() => openCampaignDialog()}
          gradient={true}
        >
          New Campaign
        </ActionButton>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Template</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Messages</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>{campaign.name}</TableCell>
                <TableCell>{campaign.template_name || 'Custom'}</TableCell>
                <TableCell>
                  <Chip
                    label={campaign.status}
                    color={getStatusColor(campaign.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{campaign.target_type}</TableCell>
                <TableCell>
                  <Chip
                    label={campaign.priority}
                    color={campaign.priority === 'high' ? 'error' : campaign.priority === 'urgent' ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {campaign.messages_sent} / {campaign.messages_delivered} / {campaign.messages_failed}
                </TableCell>
                <TableCell>
                  {new Date(campaign.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => openCampaignDialog(campaign)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small">
                    <SendIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCampaigns}
          rowsPerPage={campaignRowsPerPage}
          page={campaignPage}
          onPageChange={(_, newPage) => setCampaignPage(newPage)}
          onRowsPerPageChange={(event) => {
            setCampaignRowsPerPage(parseInt(event.target.value, 10));
            setCampaignPage(0);
          }}
        />
      </TableContainer>
    </Box>
  );

  const renderBirthdaySMS = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Birthday SMS Management</Typography>
        <Box display="flex" gap={2}>
          <ActionButton
            variant="outlined"
            onClick={handleToggleScheduler}
            loading={loading}
            icon={ScheduleIcon}
            color={schedulerStatus?.isRunning ? 'error' : 'success'}
          >
            {schedulerStatus?.isRunning ? 'Stop Scheduler' : 'Start Scheduler'}
          </ActionButton>
          <ActionButton
            onClick={handleRunBirthdayWorkflow}
            loading={loading}
            icon={SendIcon}
            gradient={true}
            vibrant={true}
          >
            Run Now
          </ActionButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Enhanced Birthday Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Today's Birthdays"
            value={birthdayStats?.todays_birthdays || 0}
            subtitle="Members celebrating today"
            icon={BirthdayIcon}
            color="primary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Upcoming Birthdays"
            value={birthdayStats?.upcoming_birthdays || 0}
            subtitle="Next 7 days"
            icon={ScheduleIcon}
            color="info"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Queued Messages"
            value={birthdayStats?.queued_messages || 0}
            subtitle="Pending delivery"
            icon={AnalyticsIcon}
            color="warning"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Sent Today"
            value={birthdayStats?.sent_today || 0}
            subtitle="Birthday messages sent"
            icon={SendIcon}
            color="success"
          />
        </Grid>

        {/* Scheduler Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Scheduler Status</Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Chip
                  label={schedulerStatus?.isRunning ? 'Running' : 'Stopped'}
                  color={schedulerStatus?.isRunning ? 'success' : 'default'}
                />
                <Typography variant="body2">
                  Queue Interval: {schedulerStatus?.queueInterval ? 'Active' : 'Inactive'}
                </Typography>
                <Typography variant="body2">
                  Process Interval: {schedulerStatus?.processInterval ? 'Active' : 'Inactive'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Manual Actions</Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <ActionButton
                  variant="outlined"
                  onClick={handleQueueBirthdayMessages}
                  loading={loading}
                  icon={AddIcon}
                  color="primary"
                >
                  Queue Today's Messages
                </ActionButton>
                <ActionButton
                  variant="outlined"
                  onClick={handleProcessBirthdayQueue}
                  loading={loading}
                  icon={SendIcon}
                  color="success"
                >
                  Process Queue
                </ActionButton>
                <ActionButton
                  variant="outlined"
                  onClick={loadBirthdayData}
                  loading={loading}
                  icon={RefreshIcon}
                  color="info"
                >
                  Refresh Data
                </ActionButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Birthdays */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Today's Birthdays</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell>Phone</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {todaysBirthdays.slice(0, 5).map((member, index) => (
                      <TableRow key={index}>
                        <TableCell>{member.full_name}</TableCell>
                        <TableCell>{member.current_age}</TableCell>
                        <TableCell>{member.cell_number}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {todaysBirthdays.length > 5 && (
                <Typography variant="caption" color="textSecondary" mt={1}>
                  And {todaysBirthdays.length - 5} more...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Birthday Messages */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Recent Messages</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {birthdayHistory.slice(0, 5).map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{record.member_name}</TableCell>
                        <TableCell>
                          <Chip
                            icon={getDeliveryStatusIcon(record.delivery_status)}
                            label={record.delivery_status}
                            color={getDeliveryStatusColor(record.delivery_status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(record.scheduled_date).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Delivery Report Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  <ReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Delivery Status Report
                </Typography>
                <Box display="flex" gap={2}>
                  <ActionButton
                    variant={showDeliveryReport ? 'contained' : 'outlined'}
                    onClick={() => {
                      setShowDeliveryReport(!showDeliveryReport);
                      if (!showDeliveryReport) {
                        loadDeliveryReport();
                      }
                    }}
                    loading={loading}
                    icon={FilterIcon}
                    color="primary"
                  >
                    {showDeliveryReport ? 'Hide Report' : 'View Delivery Report'}
                  </ActionButton>
                </Box>
              </Box>

              {showDeliveryReport && (
                <>
                  {/* Delivery Statistics Summary */}
                  {deliveryReportStats && (
                    <Grid container spacing={2} mb={3}>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#2196f3', 0.1) }}>
                          <Typography variant="h4" color="primary">
                            {deliveryReportStats.total_messages?.toLocaleString() || 0}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">Total Sent</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#4caf50', 0.1) }}>
                          <Typography variant="h4" color="success.main">
                            {deliveryReportStats.delivered?.toLocaleString() || 0}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">Delivered</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#f44336', 0.1) }}>
                          <Typography variant="h4" color="error.main">
                            {deliveryReportStats.failed?.toLocaleString() || 0}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">Failed</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha('#ff9800', 0.1) }}>
                          <Typography variant="h4" color="warning.main">
                            {deliveryReportStats.pending?.toLocaleString() || 0}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">Pending</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  )}

                  {/* Filters */}
                  <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={deliveryReportFilter.status}
                        label="Status"
                        onChange={(e) => setDeliveryReportFilter(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="delivered">Delivered</MenuItem>
                        <MenuItem value="sent">Sent</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="failed">Failed</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Month</InputLabel>
                      <Select
                        value={deliveryReportFilter.month}
                        label="Month"
                        onChange={(e) => setDeliveryReportFilter(prev => ({ ...prev, month: e.target.value }))}
                      >
                        <MenuItem value="">All Months</MenuItem>
                        {['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                          <MenuItem key={i} value={(i + 1).toString()}>{m}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      type="date"
                      label="Start Date"
                      InputLabelProps={{ shrink: true }}
                      value={deliveryReportFilter.startDate}
                      onChange={(e) => setDeliveryReportFilter(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                    <TextField
                      size="small"
                      type="date"
                      label="End Date"
                      InputLabelProps={{ shrink: true }}
                      value={deliveryReportFilter.endDate}
                      onChange={(e) => setDeliveryReportFilter(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                    <ActionButton
                      variant="outlined"
                      onClick={loadDeliveryReport}
                      loading={loading}
                      icon={RefreshIcon}
                      color="primary"
                    >
                      Apply Filters
                    </ActionButton>
                    <ActionButton
                      variant="contained"
                      onClick={handleExportDeliveryReport}
                      loading={loading}
                      icon={DownloadIcon}
                      color="success"
                    >
                      Export to Excel
                    </ActionButton>
                  </Box>

                  {/* Delivery Report Table */}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Name</strong></TableCell>
                          <TableCell><strong>Membership #</strong></TableCell>
                          <TableCell><strong>Phone</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                          <TableCell><strong>Sent At</strong></TableCell>
                          <TableCell><strong>Message ID</strong></TableCell>
                          <TableCell><strong>Error</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deliveryReport.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography color="textSecondary">
                                {loading ? 'Loading...' : 'No delivery records found'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          deliveryReport.map((record: any, index: number) => (
                            <TableRow key={record.id || index} hover>
                              <TableCell>{record.member_name}</TableCell>
                              <TableCell>{record.membership_number}</TableCell>
                              <TableCell>{record.phone_number}</TableCell>
                              <TableCell>
                                <Chip
                                  icon={getDeliveryStatusIcon(record.delivery_status)}
                                  label={record.delivery_status || 'unknown'}
                                  color={getDeliveryStatusColor(record.delivery_status)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                {record.sent_at ? new Date(record.sent_at).toLocaleString() : '-'}
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                  {record.sms_message_id ? record.sms_message_id.substring(0, 15) + '...' : '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {record.error_message && (
                                  <Typography variant="caption" color="error">
                                    {record.error_message.substring(0, 50)}{record.error_message.length > 50 ? '...' : ''}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={deliveryReportTotal}
                    rowsPerPage={deliveryReportRowsPerPage}
                    page={deliveryReportPage}
                    onPageChange={handleDeliveryReportPageChange}
                    onRowsPerPageChange={handleDeliveryReportRowsPerPageChange}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderMonthlyStats = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Monthly Birthday Statistics (Active Members)</Typography>
        <ActionButton
          variant="outlined"
          onClick={loadMonthlyStats}
          loading={loading}
          icon={RefreshIcon}
          color="info"
        >
          Refresh Stats
        </ActionButton>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Members"
            value={monthlyStatsTotals?.total_birthdays?.toLocaleString() || 0}
            subtitle="With birthdays"
            icon={BirthdayIcon}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Good Standing"
            value={monthlyStatsTotals?.good_standing_count?.toLocaleString() || 0}
            subtitle={`${monthlyStatsTotals?.good_standing_percentage || 0}%`}
            icon={CheckCircleIcon}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="SMS Eligible"
            value={monthlyStatsTotals?.sms_eligible_count?.toLocaleString() || 0}
            subtitle={`${monthlyStatsTotals?.sms_eligible_percentage || 0}%`}
            icon={SendIcon}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Not Good Standing"
            value={monthlyStatsTotals?.not_good_standing_count?.toLocaleString() || 0}
            subtitle="Expired/Inactive"
            icon={ErrorIcon}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Monthly Statistics Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>Monthly Breakdown (Click row for details)</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Month</strong></TableCell>
                  <TableCell align="right"><strong>Total Birthdays</strong></TableCell>
                  <TableCell align="right"><strong>Good Standing</strong></TableCell>
                  <TableCell align="right"><strong>SMS Eligible</strong></TableCell>
                  <TableCell align="right"><strong>Not Good Standing</strong></TableCell>
                  <TableCell align="right"><strong>No Phone</strong></TableCell>
                  <TableCell align="right"><strong>Good Standing %</strong></TableCell>
                  <TableCell align="right"><strong>SMS Eligible %</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlyStats.map((stat: any) => (
                  <TableRow
                    key={stat.birth_month}
                    hover
                    onClick={() => handleMonthClick(stat.birth_month)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) } }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CalendarMonthIcon fontSize="small" color="primary" />
                        {stat.month_name}
                      </Box>
                    </TableCell>
                    <TableCell align="right">{parseInt(stat.total_birthdays).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={parseInt(stat.good_standing_count).toLocaleString()}
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={parseInt(stat.sms_eligible_count).toLocaleString()}
                        color="info"
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={parseInt(stat.not_good_standing_count).toLocaleString()}
                        color="error"
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{parseInt(stat.no_phone_count).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <Typography color="success.main" fontWeight="bold">
                        {stat.good_standing_percentage}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography color="info.main" fontWeight="bold">
                        {stat.sms_eligible_percentage}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Month Details Dialog */}
      <Dialog
        open={selectedMonth !== null}
        onClose={handleCloseMonthDetails}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedMonthStats?.month_name} - Active Members with Birthdays
            </Typography>
            <Chip
              label={`${monthlyStatsTotalMembers.toLocaleString()} SMS Eligible Members`}
              color="info"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedMonthStats && (
            <Box mb={2}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">Total</Typography>
                  <Typography variant="h6">{parseInt(selectedMonthStats.total_birthdays).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">Good Standing</Typography>
                  <Typography variant="h6" color="success.main">{parseInt(selectedMonthStats.good_standing_count).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">SMS Eligible</Typography>
                  <Typography variant="h6" color="info.main">{parseInt(selectedMonthStats.sms_eligible_count).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">SMS Eligible %</Typography>
                  <Typography variant="h6" color="primary.main">{selectedMonthStats.sms_eligible_percentage}%</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Membership #</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Birth Day</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Province</TableCell>
                  <TableCell>Ward</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedMonthMembers.map((member: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{member.full_name}</TableCell>
                    <TableCell>{member.membership_number}</TableCell>
                    <TableCell>{member.cell_number}</TableCell>
                    <TableCell>{member.birth_day}</TableCell>
                    <TableCell>{member.current_age}</TableCell>
                    <TableCell>{member.province_name}</TableCell>
                    <TableCell>{member.ward_code}</TableCell>
                    <TableCell>
                      <Chip label={member.membership_status} color="success" size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={monthlyStatsTotalMembers}
            rowsPerPage={monthlyStatsRowsPerPage}
            page={monthlyStatsPage}
            onPageChange={(_e, newPage) => setMonthlyStatsPage(newPage)}
            onRowsPerPageChange={(e) => {
              setMonthlyStatsRowsPerPage(parseInt(e.target.value, 10));
              setMonthlyStatsPage(0);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleExportMonthlyBirthdays}
            startIcon={<DownloadIcon />}
            variant="contained"
            color="success"
            disabled={loading || !selectedMonthMembers.length}
          >
            Download Excel
          </Button>
          <Button onClick={handleCloseMonthDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderProviderStatus = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">SMS Provider Status & Monitoring</Typography>
        <Box display="flex" gap={2}>
          <ActionButton
            variant="outlined"
            onClick={testProviderHealth}
            loading={loading}
            icon={SpeedIcon}
          >
            Test Provider
          </ActionButton>
          <ActionButton
            onClick={() => {
              loadProviderHealth();
              loadWebhookLogs();
            }}
            loading={loading}
            icon={RefreshIcon}
            gradient={true}
          >
            Refresh Status
          </ActionButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Delivery Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Messages"
            value={deliveryStats?.total_messages || 0}
            subtitle="Last 24 hours"
            icon={MessageIcon}
            color="primary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Delivered"
            value={deliveryStats?.delivered || 0}
            subtitle={`${deliveryStats?.delivery_rate || 0}% success rate`}
            icon={CheckCircleIcon}
            color="success"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Failed"
            value={deliveryStats?.failed || 0}
            subtitle="Delivery failures"
            icon={ErrorIcon}
            color="error"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Average Cost"
            value={`R${deliveryStats?.average_cost || 0}`}
            subtitle="Per message"
            icon={TrendingUpIcon}
            color="info"
          />
        </Grid>

        {/* Provider Health Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WebhookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="h6">Provider Health Status</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" p={2}
                       sx={{ backgroundColor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                    <CheckCircleIcon sx={{ color: theme.palette.success.main, mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        JSON Applink Provider
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Status: Healthy • Response Time: ~150ms
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" p={2}
                       sx={{ backgroundColor: alpha(theme.palette.info.main, 0.1), borderRadius: 2 }}>
                    <SpeedIcon sx={{ color: theme.palette.info.main, mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Rate Limiting
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        100 msgs/min • 1000 msgs/hour
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Webhook Logs */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WebhookIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="h6">Recent Webhook Activity</Typography>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Message ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Response</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {webhookLogs.length > 0 ? (
                      webhookLogs.slice(0, 10).map((log, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(log.received_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.provider_name || 'Unknown'}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {log.message_id || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.processed_successfully ? 'Success' : 'Failed'}
                              size="small"
                              color={log.processed_successfully ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {log.response_message || log.processing_error || 'No response'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">
                            No webhook activity recorded
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <PageHeader
        title="SMS Management"
        subtitle="Manage SMS campaigns, templates, and automated birthday messages for your organization"
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/admin' },
          { label: 'SMS Management' },
        ]}
        actions={
          <ActionButton
            icon={AddIcon}
            onClick={() => openCampaignDialog()}
            gradient={true}
            vibrant={true}
          >
            New Campaign
          </ActionButton>
        }
      />

      <Container maxWidth="xl" sx={{ pb: 4 }}>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

        <Paper
          sx={{
            width: '100%',
            mb: 2,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            sx={{
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
              '& .MuiTab-root': {
                minHeight: 64,
                fontSize: '1rem',
                fontWeight: 500,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                },
              },
            }}
          >
            <Tab
              label="Dashboard"
              icon={<AnalyticsIcon />}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              label="Templates"
              icon={<MessageIcon />}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              label="Campaigns"
              icon={<CampaignIcon />}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              label="Birthday SMS"
              icon={<BirthdayIcon />}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              label="Monthly Statistics"
              icon={<CalendarMonthIcon />}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              label="Provider Status"
              icon={<MonitorIcon />}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
          </Tabs>

          <Box sx={{ p: 4 }}>
            {loading && (
              <Box display="flex" justifyContent="center" p={6}>
                <CircularProgress size={48} />
              </Box>
            )}

            {!loading && currentTab === 0 && renderDashboard()}
            {!loading && currentTab === 1 && renderTemplates()}
            {!loading && currentTab === 2 && renderCampaigns()}
            {!loading && currentTab === 3 && renderBirthdaySMS()}
            {!loading && currentTab === 4 && renderMonthlyStats()}
            {!loading && currentTab === 5 && renderProviderStatus()}
          </Box>
        </Paper>
      </Container>

      {/* Template Dialog */}
      <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Edit SMS Template' : 'Create SMS Template'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Template Name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as SMSTemplate['category'] })}
                  >
                    <MenuItem value="campaign">Campaign</MenuItem>
                    <MenuItem value="notification">Notification</MenuItem>
                    <MenuItem value="reminder">Reminder</MenuItem>
                    <MenuItem value="announcement">Announcement</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  margin="normal"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message Content"
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  margin="normal"
                  multiline
                  rows={4}
                  helperText="Use {variable_name} for dynamic content"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Variables (comma-separated)"
                  value={Array.isArray(templateForm.variables) ? templateForm.variables.join(', ') : ''}
                  onChange={(e) => setTemplateForm({
                    ...templateForm,
                    variables: e.target.value.split(',').map(v => v.trim()).filter(v => v)
                  })}
                  margin="normal"
                  helperText="e.g., name, ward, municipality"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>Cancel</Button>
          <Button
            onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
            variant="contained"
            disabled={loading || !templateForm.name || !templateForm.content}
          >
            {editingTemplate ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={campaignDialog} onClose={() => setCampaignDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCampaign ? 'Edit SMS Campaign' : 'Create SMS Campaign'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Campaign Name"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Template</InputLabel>
                  <Select
                    value={campaignForm.template_id}
                    onChange={(e) => setCampaignForm({ ...campaignForm, template_id: e.target.value })}
                  >
                    <MenuItem value="">Custom Message</MenuItem>
                    {templates.filter(t => t.is_active).map((template) => (
                      <MenuItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  margin="normal"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message Content"
                  value={campaignForm.message_content}
                  onChange={(e) => setCampaignForm({ ...campaignForm, message_content: e.target.value })}
                  margin="normal"
                  multiline
                  rows={4}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Target Type</InputLabel>
                  <Select
                    value={campaignForm.target_type}
                    onChange={(e) => setCampaignForm({ ...campaignForm, target_type: e.target.value as SMSCampaign['target_type'] })}
                  >
                    <MenuItem value="all">All Members</MenuItem>
                    <MenuItem value="province">By Province</MenuItem>
                    <MenuItem value="district">By District</MenuItem>
                    <MenuItem value="municipality">By Municipality</MenuItem>
                    <MenuItem value="ward">By Ward</MenuItem>
                    <MenuItem value="custom">Custom Criteria</MenuItem>
                    <MenuItem value="list">Contact List</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={campaignForm.priority}
                    onChange={(e) => setCampaignForm({ ...campaignForm, priority: e.target.value as SMSCampaign['priority'] })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateCampaign}
            variant="contained"
            disabled={loading || !campaignForm.name || !campaignForm.message_content}
          >
            {editingCampaign ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SMSManagement;
