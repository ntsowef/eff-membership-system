import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Edit,
  Download,
  Share,
  Print,
  Approval,
  History,
  Comment,
  ArrowBack,
  CheckCircle,
  Schedule,
  Person,
  LocationOn,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '../../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import PageHeader from '../../components/ui/PageHeader';
import ActionButton from '../../components/ui/ActionButton';

interface MeetingDocument {
  id: number;
  meeting_id: number;
  document_type: string;
  document_title: string;
  document_content: {
    header: {
      organization: string;
      meeting_type: string;
      date: string;
      time: string;
      venue: string;
      chairperson?: string;
      secretary?: string;
    };
    sections: Array<{
      section_id: string;
      title: string;
      items: string[];
      notes?: string;
    }>;
    footer?: {
      contact_info?: string;
      next_meeting?: string;
    };
  };
  document_status: string;
  template_id?: number;
  created_by: number;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  approver_name?: string;
}

interface ApprovalFormData {
  document_status: 'draft' | 'review' | 'approved' | 'published';
  approval_notes?: string;
}

const DocumentViewerPage: React.FC = () => {
  const { meetingId, documentId } = useParams<{ meetingId: string; documentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  // Fetch document
  const { data: documentData, isLoading, error } = useQuery({
    queryKey: ['meeting-document', documentId],
    queryFn: () => apiGet(`/meeting-documents/${documentId}`),
    enabled: !!documentId,
  });

  // Fetch meeting details
  const { data: meetingData } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => apiGet(`/meetings/${meetingId}`),
    enabled: !!meetingId,
  });

  const document: MeetingDocument | null = (documentData as any)?.data?.document || null;
  const meeting = (meetingData as any)?.data?.meeting || null;

  // Approval form
  const { control, handleSubmit } = useForm<ApprovalFormData>({
    defaultValues: {
      document_status: document?.document_status as any || 'draft',
      approval_notes: '',
    },
  });

  // Update document status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (data: ApprovalFormData) => 
      apiPut(`/meeting-documents/${documentId}`, {
        document_status: data.document_status,
        approval_notes: data.approval_notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-document', documentId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-documents', meetingId] });
      setApprovalDialogOpen(false);
    },
  });

  const handleApprovalSubmit = (data: ApprovalFormData) => {
    updateStatusMutation.mutate(data);
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    console.log('Download functionality to be implemented');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !document) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error ? 'Failed to load document' : 'Document not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <PageHeader
        title={document.document_title}
        subtitle={`${document.document_type.replace('_', ' ').toUpperCase()} • ${meeting?.title || 'Meeting Document'}`}
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Meetings', href: '/admin/meetings' },
          { label: meeting?.title || 'Meeting', href: `/admin/meetings/${meetingId}` },
          { label: 'Documents', href: `/admin/meetings/${meetingId}/documents` },
          { label: document.document_title },
        ]}
        actions={
          <Box display="flex" gap={2}>
            <ActionButton
              icon={ArrowBack}
              onClick={() => navigate(`/admin/meetings/${meetingId}/documents`)}
              variant="outlined"
            >
              Back to Documents
            </ActionButton>
            <ActionButton
              icon={Print}
              onClick={handlePrint}
              variant="outlined"
              color="info"
            >
              Print
            </ActionButton>
            <ActionButton
              icon={Download}
              onClick={handleDownload}
              variant="outlined"
              color="success"
            >
              Download PDF
            </ActionButton>
            <ActionButton
              icon={Edit}
              onClick={() => navigate(`/admin/meetings/${meetingId}/documents/${documentId}/edit`)}
              gradient={true}
              vibrant={true}
            >
              Edit Document
            </ActionButton>
          </Box>
        }
      />

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Document Content */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                {/* Document Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Typography variant="h3" fontWeight="bold" color="primary" gutterBottom>
                    {document.document_content.header.organization}
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    {document.document_content.header.meeting_type}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule color="primary" />
                      <Typography variant="h6">
                        {document.document_content.header.date}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule color="primary" />
                      <Typography variant="h6">
                        {document.document_content.header.time}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn color="primary" />
                      <Typography variant="h6">
                        {document.document_content.header.venue}
                      </Typography>
                    </Box>
                  </Box>

                  {(document.document_content.header.chairperson || document.document_content.header.secretary) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {document.document_content.header.chairperson && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person color="secondary" />
                          <Typography variant="body1">
                            <strong>Chairperson:</strong> {document.document_content.header.chairperson}
                          </Typography>
                        </Box>
                      )}
                      {document.document_content.header.secretary && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person color="secondary" />
                          <Typography variant="body1">
                            <strong>Secretary:</strong> {document.document_content.header.secretary}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* Document Sections */}
                {document.document_content.sections.map((section, index) => (
                  <Box key={index} sx={{ mb: 4 }}>
                    <Typography variant="h5" fontWeight="bold" color="primary" sx={{ mb: 2 }}>
                      {section.title}
                    </Typography>
                    
                    <List sx={{ pl: 2 }}>
                      {section.items.map((item, itemIndex) => (
                        <ListItem key={itemIndex} sx={{ py: 1, pl: 0 }}>
                          <ListItemText
                            primary={item}
                            primaryTypographyProps={{ 
                              variant: 'body1',
                              sx: { lineHeight: 1.6 }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {section.notes && (
                      <Paper variant="outlined" sx={{ p: 2, mt: 2, backgroundColor: 'grey.50' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          <strong>Note:</strong> {section.notes}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                ))}

                {/* Footer */}
                {document.document_content.footer && (
                  <>
                    <Divider sx={{ my: 4 }} />
                    <Box sx={{ textAlign: 'center' }}>
                      {document.document_content.footer.contact_info && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {document.document_content.footer.contact_info}
                        </Typography>
                      )}
                      {document.document_content.footer.next_meeting && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Next Meeting:</strong> {document.document_content.footer.next_meeting}
                        </Typography>
                      )}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Document Metadata */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              {/* Status Card */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Document Status
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Chip
                        label={document.document_status.toUpperCase()}
                        color={getStatusColor(document.document_status) as any}
                        size="medium"
                      />
                      {document.document_status === 'approved' && (
                        <CheckCircle color="success" />
                      )}
                    </Box>

                    <Button
                      startIcon={<Approval />}
                      onClick={() => setApprovalDialogOpen(true)}
                      variant="outlined"
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      Update Status
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Document Info */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Document Information
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Document Type
                      </Typography>
                      <Typography variant="body1">
                        {document.document_type.replace('_', ' ').toUpperCase()}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Created By
                      </Typography>
                      <Typography variant="body1">
                        {document.creator_name || 'Unknown'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Created Date
                      </Typography>
                      <Typography variant="body1">
                        {new Date(document.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body1">
                        {new Date(document.updated_at).toLocaleDateString()}
                      </Typography>
                    </Box>

                    {document.approved_by && document.approved_at && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Approved By
                          </Typography>
                          <Typography variant="body1">
                            {document.approver_name || 'Unknown'}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Approved Date
                          </Typography>
                          <Typography variant="body1">
                            {new Date(document.approved_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Actions Card */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Actions
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button
                        startIcon={<Share />}
                        variant="outlined"
                        fullWidth
                      >
                        Share Document
                      </Button>
                      
                      <Button
                        startIcon={<Comment />}
                        variant="outlined"
                        fullWidth
                      >
                        Add Comment
                      </Button>
                      
                      <Button
                        startIcon={<History />}
                        variant="outlined"
                        fullWidth
                      >
                        View History
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>

      {/* Status Update Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(handleApprovalSubmit)}>
          <DialogTitle>Update Document Status</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Controller
                name="document_status"
                control={control}
                rules={{ required: 'Status is required' }}
                render={({ field }) => (
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Document Status</InputLabel>
                    <Select {...field} label="Document Status">
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="review">Under Review</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="published">Published</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="approval_notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Notes (Optional)"
                    multiline
                    rows={3}
                    placeholder="Add any notes about this status change..."
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <ActionButton
              type="submit"
              loading={updateStatusMutation.isPending}
              gradient={true}
              vibrant={true}
            >
              Update Status
            </ActionButton>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default DocumentViewerPage;
