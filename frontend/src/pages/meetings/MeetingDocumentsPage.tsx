import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  Container,
  useTheme,
  Divider,
} from '@mui/material';
import {
  Description,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Download,
  Assignment,
  Gavel,
  AttachFile,
  History,
  FilterList,
  Refresh,
  Article,
  Task,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import StatsCard from '../../components/ui/StatsCard';
import ActionButton from '../../components/ui/ActionButton';
import PageHeader from '../../components/ui/PageHeader';

// Interface definitions
interface MeetingDocument {
  id: number;
  meeting_id: number;
  document_type: 'agenda' | 'minutes' | 'action_items' | 'attendance' | 'other';
  document_title: string;
  document_content: any;
  document_status: 'draft' | 'review' | 'approved' | 'published';
  template_id?: number;
  created_by: number;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  approver_name?: string;
}

interface ActionItem {
  id: number;
  meeting_id: number;
  document_id?: number;
  action_title: string;
  action_description?: string;
  assigned_to?: number;
  assigned_role?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_by: number;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
}

interface MeetingDecision {
  id: number;
  meeting_id: number;
  document_id?: number;
  decision_title: string;
  decision_description: string;
  decision_type: 'resolution' | 'motion' | 'policy' | 'appointment' | 'other';
  voting_result?: any;
  decision_status: 'proposed' | 'approved' | 'rejected' | 'deferred';
  proposed_by?: number;
  seconded_by?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  proposer_name?: string;
  seconder_name?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`documents-tabpanel-${index}`}
      aria-labelledby={`documents-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const MeetingDocumentsPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const queryClient = useQueryClient();
  
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<MeetingDocument | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<MeetingDocument | null>(null);

  // Fetch meeting documents
  const { data: documentsData, isLoading: documentsLoading, refetch: refetchDocuments } = useQuery({
    queryKey: ['meeting-documents', meetingId],
    queryFn: () => apiGet(`/meeting-documents/meeting/${meetingId}`),
    enabled: !!meetingId,
  });

  // Fetch action items
  const { data: actionItemsData, isLoading: actionItemsLoading, refetch: refetchActionItems } = useQuery({
    queryKey: ['meeting-action-items', meetingId],
    queryFn: () => apiGet(`/meeting-documents/action-items/meeting/${meetingId}`),
    enabled: !!meetingId,
  });

  // Fetch decisions
  const { data: decisionsData, isLoading: decisionsLoading, refetch: refetchDecisions } = useQuery({
    queryKey: ['meeting-decisions', meetingId],
    queryFn: () => apiGet(`/meeting-documents/decisions/meeting/${meetingId}`),
    enabled: !!meetingId,
  });

  // Fetch meeting details
  const { data: meetingData } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => apiGet(`/meetings/${meetingId}`),
    enabled: !!meetingId,
  });

  const documents = documentsData?.data?.documents || [];
  const actionItems = actionItemsData?.data?.action_items || [];
  const decisions = decisionsData?.data?.decisions || [];
  const meeting = meetingData?.meeting || null;

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: number) => apiDelete(`/meeting-documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-documents', meetingId] });
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, document: MeetingDocument) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDocument(null);
  };

  const handleDeleteClick = (document: MeetingDocument) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (documentToDelete) {
      deleteDocumentMutation.mutate(documentToDelete.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'review': return 'warning';
      case 'approved': return 'success';
      case 'published': return 'primary';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'urgent': return 'error';
      default: return 'default';
    }
  };

  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getDecisionStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'default';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'deferred': return 'warning';
      default: return 'default';
    }
  };

  if (!meetingId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Meeting ID is required</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <PageHeader
        title={`Meeting Documents${meeting ? ` - ${meeting.title}` : ''}`}
        subtitle="Manage agendas, minutes, action items, and decisions for this meeting"
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Meetings', href: '/admin/meetings' },
          { label: meeting?.title || 'Meeting', href: `/admin/meetings/${meetingId}` },
          { label: 'Documents' },
        ]}
        badge={{
          label: `${documents.length + actionItems.length + decisions.length} Items`,
          color: 'primary',
        }}
        actions={
          <Box display="flex" gap={2}>
            <ActionButton
              icon={Refresh}
              onClick={() => {
                refetchDocuments();
                refetchActionItems();
                refetchDecisions();
              }}
              variant="outlined"
              color="info"
            >
              Refresh
            </ActionButton>
            <ActionButton
              icon={Add}
              onClick={() => navigate(`/admin/meetings/${meetingId}/documents/new`)}
              gradient={true}
              vibrant={true}
            >
              Create Document
            </ActionButton>
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Documents"
              value={documents.length}
              icon={Description}
              color="primary"
              subtitle={`${documents.filter(d => d.document_status === 'published').length} published`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Action Items"
              value={actionItems.length}
              icon={Assignment}
              color="warning"
              subtitle={`${actionItems.filter(a => a.status === 'completed').length} completed`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Decisions"
              value={decisions.length}
              icon={Gavel}
              color="success"
              subtitle={`${decisions.filter(d => d.decision_status === 'approved').length} approved`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Pending Items"
              value={
                documents.filter(d => d.document_status === 'draft').length +
                actionItems.filter(a => a.status === 'pending').length +
                decisions.filter(d => d.decision_status === 'proposed').length
              }
              icon={Schedule}
              color="error"
              subtitle="Require attention"
            />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="meeting documents tabs">
              <Tab
                label={
                  <Badge badgeContent={documents.length} color="primary">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Article />
                      Documents
                    </Box>
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge badgeContent={actionItems.length} color="warning">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Task />
                      Action Items
                    </Box>
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge badgeContent={decisions.length} color="success">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Gavel />
                      Decisions
                    </Box>
                  </Badge>
                }
              />
            </Tabs>
          </Box>

          {/* Documents Tab */}
          <TabPanel value={tabValue} index={0}>
            {documentsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : documents.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No documents found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create your first meeting document to get started.
                </Typography>
                <ActionButton
                  icon={Add}
                  onClick={() => navigate(`/admin/meetings/${meetingId}/documents/new`)}
                  gradient={true}
                  vibrant={true}
                >
                  Create Document
                </ActionButton>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Document</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Last Updated</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.map((document: MeetingDocument) => (
                      <TableRow key={document.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {document.document_title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Created by {document.creator_name || 'Unknown'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={document.document_type.replace('_', ' ').toUpperCase()}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={document.document_status.toUpperCase()}
                            size="small"
                            color={getStatusColor(document.document_status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(document.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(document.updated_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={(e) => handleMenuClick(e, document)}
                            size="small"
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Card>
      </Container>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedDocument) {
            navigate(`/admin/meetings/${meetingId}/documents/${selectedDocument.id}`);
          }
          handleMenuClose();
        }}>
          <Visibility sx={{ mr: 1 }} />
          View
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedDocument) {
            navigate(`/admin/meetings/${meetingId}/documents/${selectedDocument.id}/edit`);
          }
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => selectedDocument && handleDeleteClick(selectedDocument)}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{documentToDelete?.document_title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteDocumentMutation.isPending}
          >
            {deleteDocumentMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MeetingDocumentsPage;
