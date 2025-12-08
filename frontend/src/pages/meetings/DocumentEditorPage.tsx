import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Divider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Save,
  Cancel,
  Preview,
  Description,
  Add,
  Remove,
  DragIndicator,
  Schedule,
  Person,
  LocationOn,
  Article,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '../../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import PageHeader from '../../components/ui/PageHeader';
import ActionButton from '../../components/ui/ActionButton';

interface DocumentTemplate {
  id: number;
  template_name: string;
  template_type: string;
  hierarchy_level: string;
  template_content: any;
  is_default: boolean;
  is_active: boolean;
}

interface DocumentFormData {
  document_title: string;
  document_type: 'agenda' | 'minutes' | 'action_items' | 'attendance' | 'other';
  template_id?: number;
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
  document_status: 'draft' | 'review' | 'approved' | 'published';
}

const DocumentEditorPage: React.FC = () => {
  const { meetingId, documentId } = useParams<{ meetingId: string; documentId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const isEditing = !!documentId;

  // Form setup
  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<DocumentFormData>({
    defaultValues: {
      document_title: '',
      document_type: 'agenda',
      document_content: {
        header: {
          organization: 'Economic Freedom Fighters',
          meeting_type: '',
          date: '',
          time: '',
          venue: '',
        },
        sections: [
          {
            section_id: 'opening',
            title: '1. OPENING AND WELCOME',
            items: ['Call to order', 'Welcome and introductions'],
          },
        ],
      },
      document_status: 'draft',
    },
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control,
    name: 'document_content.sections',
  });

  // Fetch document templates
  const { data: templatesData } = useQuery({
    queryKey: ['document-templates'],
    queryFn: () => apiGet('/meeting-documents/templates'),
  });

  // Fetch existing document if editing
  const { data: documentData, isLoading: documentLoading } = useQuery({
    queryKey: ['meeting-document', documentId],
    queryFn: () => apiGet(`/meeting-documents/${documentId}`),
    enabled: isEditing,
  });

  // Fetch meeting details
  const { data: meetingData } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => apiGet(`/meetings/${meetingId}`),
    enabled: !!meetingId,
  });

  const templates = (templatesData as any)?.data?.templates || [];
  const meeting = (meetingData as any)?.data?.meeting || null;

  // Create/Update document mutation
  const saveDocumentMutation = useMutation({
    mutationFn: (data: DocumentFormData) => {
      if (isEditing) {
        return apiPut(`/meeting-documents/${documentId}`, data);
      } else {
        return apiPost('/meeting-documents', { ...data, meeting_id: parseInt(meetingId!) });
      }
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-documents', meetingId] });
      const docId = isEditing ? documentId : response.data?.document_id;
      navigate(`/admin/meetings/${meetingId}/documents/${docId}`);
    },
  });

  // Load document data when editing
  useEffect(() => {
    if ((documentData as any)?.data?.document) {
      const doc = (documentData as any).data.document;
      reset({
        document_title: doc.document_title,
        document_type: doc.document_type,
        template_id: doc.template_id,
        document_content: doc.document_content,
        document_status: doc.document_status,
      });
    }
  }, [documentData, reset]);

  // Auto-populate meeting details
  useEffect(() => {
    if (meeting && !isEditing) {
      setValue('document_content.header.meeting_type', meeting.title);
      setValue('document_content.header.date', new Date(meeting.start_datetime).toLocaleDateString());
      setValue('document_content.header.time', new Date(meeting.start_datetime).toLocaleTimeString());
      setValue('document_content.header.venue', meeting.location || '');
    }
  }, [meeting, setValue, isEditing]);

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    
    // Apply template content
    setValue('document_title', template.template_name);
    setValue('document_type', template.template_type as any);
    setValue('template_id', template.id);
    
    if (template.template_content) {
      // Merge template content with current form data
      const currentContent = watch('document_content');
      setValue('document_content', {
        ...currentContent,
        ...template.template_content,
        header: {
          ...template.template_content.header,
          ...currentContent.header, // Keep meeting-specific data
        },
      });
    }
    
    setTemplateDialogOpen(false);
  };

  const addSection = () => {
    const newSectionNumber = sectionFields.length + 1;
    appendSection({
      section_id: `section_${newSectionNumber}`,
      title: `${newSectionNumber}. NEW SECTION`,
      items: ['Item 1'],
    });
  };

  const addItemToSection = (sectionIndex: number) => {
    const currentSection = watch(`document_content.sections.${sectionIndex}`);
    const newItems = [...currentSection.items, 'New item'];
    setValue(`document_content.sections.${sectionIndex}.items`, newItems);
  };

  const removeItemFromSection = (sectionIndex: number, itemIndex: number) => {
    const currentSection = watch(`document_content.sections.${sectionIndex}`);
    const newItems = currentSection.items.filter((_, index) => index !== itemIndex);
    setValue(`document_content.sections.${sectionIndex}.items`, newItems);
  };

  const onSubmit = (data: DocumentFormData) => {
    saveDocumentMutation.mutate(data);
  };

  if (documentLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const watchedContent = watch('document_content');

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <PageHeader
        title={isEditing ? 'Edit Document' : 'Create Document'}
        subtitle={`${isEditing ? 'Modify' : 'Create'} meeting document for ${meeting?.title || 'this meeting'}`}
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Meetings', href: '/admin/meetings' },
          { label: meeting?.title || 'Meeting', href: `/admin/meetings/${meetingId}` },
          { label: 'Documents', href: `/admin/meetings/${meetingId}/documents` },
          { label: isEditing ? 'Edit' : 'Create' },
        ]}
        actions={
          <Box display="flex" gap={2}>
            <ActionButton
              icon={Description}
              onClick={() => setTemplateDialogOpen(true)}
              variant="outlined"
              color="info"
            >
              Use Template
            </ActionButton>
            <ActionButton
              icon={Preview}
              onClick={() => setPreviewMode(!previewMode)}
              variant="outlined"
              color={previewMode ? 'primary' : 'secondary'}
            >
              {previewMode ? 'Edit Mode' : 'Preview'}
            </ActionButton>
          </Box>
        }
      />

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Editor Panel */}
          <Grid item xs={12} lg={previewMode ? 6 : 12}>
            <Card>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                  {/* Document Basic Info */}
                  <Typography variant="h6" gutterBottom>
                    Document Information
                  </Typography>
                  
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="document_title"
                        control={control}
                        rules={{ required: 'Document title is required' }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Document Title"
                            error={!!errors.document_title}
                            helperText={errors.document_title?.message}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <Controller
                        name="document_type"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Document Type</InputLabel>
                            <Select {...field} label="Document Type">
                              <MenuItem value="agenda">Agenda</MenuItem>
                              <MenuItem value="minutes">Minutes</MenuItem>
                              <MenuItem value="action_items">Action Items</MenuItem>
                              <MenuItem value="attendance">Attendance</MenuItem>
                              <MenuItem value="other">Other</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <Controller
                        name="document_status"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select {...field} label="Status">
                              <MenuItem value="draft">Draft</MenuItem>
                              <MenuItem value="review">Review</MenuItem>
                              <MenuItem value="approved">Approved</MenuItem>
                              <MenuItem value="published">Published</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  {/* Document Header */}
                  <Typography variant="h6" gutterBottom>
                    Meeting Information
                  </Typography>
                  
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="document_content.header.meeting_type"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Meeting Type"
                            InputProps={{
                              startAdornment: <Article sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <Controller
                        name="document_content.header.date"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Date"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                              startAdornment: <Schedule sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <Controller
                        name="document_content.header.time"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Time"
                            type="time"
                            InputLabelProps={{ shrink: true }}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="document_content.header.venue"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Venue"
                            InputProps={{
                              startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <Controller
                        name="document_content.header.chairperson"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Chairperson"
                            InputProps={{
                              startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <Controller
                        name="document_content.header.secretary"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Secretary"
                            InputProps={{
                              startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  {/* Document Sections */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Document Sections
                    </Typography>
                    <Button
                      startIcon={<Add />}
                      onClick={addSection}
                      variant="outlined"
                      size="small"
                    >
                      Add Section
                    </Button>
                  </Box>

                  {sectionFields.map((section, sectionIndex) => (
                    <Card key={section.id} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <DragIndicator sx={{ mr: 1, color: 'text.secondary' }} />
                          <Controller
                            name={`document_content.sections.${sectionIndex}.title`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Section Title"
                                variant="outlined"
                                size="small"
                              />
                            )}
                          />
                          <IconButton
                            onClick={() => removeSection(sectionIndex)}
                            color="error"
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            <Remove />
                          </IconButton>
                        </Box>

                        {/* Section Items */}
                        {watch(`document_content.sections.${sectionIndex}.items`)?.map((_item, itemIndex) => (
                          <Box key={itemIndex} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Controller
                              name={`document_content.sections.${sectionIndex}.items.${itemIndex}`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  fullWidth
                                  placeholder="Section item"
                                  variant="outlined"
                                  size="small"
                                  multiline
                                  maxRows={3}
                                />
                              )}
                            />
                            <IconButton
                              onClick={() => removeItemFromSection(sectionIndex, itemIndex)}
                              color="error"
                              size="small"
                              sx={{ ml: 1 }}
                            >
                              <Remove />
                            </IconButton>
                          </Box>
                        ))}

                        <Button
                          startIcon={<Add />}
                          onClick={() => addItemToSection(sectionIndex)}
                          variant="text"
                          size="small"
                          sx={{ mt: 1 }}
                        >
                          Add Item
                        </Button>

                        {/* Section Notes */}
                        <Controller
                          name={`document_content.sections.${sectionIndex}.notes`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Section Notes (Optional)"
                              multiline
                              rows={2}
                              variant="outlined"
                              size="small"
                              sx={{ mt: 2 }}
                            />
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
                    <Button
                      startIcon={<Cancel />}
                      onClick={() => navigate(`/admin/meetings/${meetingId}/documents`)}
                      variant="outlined"
                    >
                      Cancel
                    </Button>
                    <ActionButton
                      icon={Save}
                      type="submit"
                      loading={saveDocumentMutation.isPending}
                      gradient={true}
                      vibrant={true}
                    >
                      {isEditing ? 'Update Document' : 'Create Document'}
                    </ActionButton>
                  </Box>
                </form>
              </CardContent>
            </Card>
          </Grid>

          {/* Preview Panel */}
          {previewMode && (
            <Grid item xs={12} lg={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Document Preview
                  </Typography>
                  
                  <Paper variant="outlined" sx={{ p: 3, backgroundColor: 'background.paper' }}>
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                      <Typography variant="h4" fontWeight="bold" color="primary">
                        {watchedContent.header.organization}
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {watchedContent.header.meeting_type}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
                        <Typography variant="body1">
                          <strong>Date:</strong> {watchedContent.header.date}
                        </Typography>
                        <Typography variant="body1">
                          <strong>Time:</strong> {watchedContent.header.time}
                        </Typography>
                        <Typography variant="body1">
                          <strong>Venue:</strong> {watchedContent.header.venue}
                        </Typography>
                      </Box>
                      {(watchedContent.header.chairperson || watchedContent.header.secretary) && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
                          {watchedContent.header.chairperson && (
                            <Typography variant="body2">
                              <strong>Chairperson:</strong> {watchedContent.header.chairperson}
                            </Typography>
                          )}
                          {watchedContent.header.secretary && (
                            <Typography variant="body2">
                              <strong>Secretary:</strong> {watchedContent.header.secretary}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Sections */}
                    {watchedContent.sections.map((section, index) => (
                      <Box key={index} sx={{ mb: 3 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                          {section.title}
                        </Typography>
                        <List dense>
                          {section.items.map((item, itemIndex) => (
                            <ListItem key={itemIndex} sx={{ py: 0.5 }}>
                              <ListItemText
                                primary={item}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                        {section.notes && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                            Note: {section.notes}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Select Document Template</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose a template to start with. You can customize it after selection.
          </Typography>
          
          <Grid container spacing={2}>
            {templates.map((template: DocumentTemplate) => (
              <Grid item xs={12} sm={6} key={template.id}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 2 },
                    border: selectedTemplate?.id === template.id ? 2 : 1,
                    borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'divider',
                  }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="div">
                        {template.template_name}
                      </Typography>
                      {template.is_default && (
                        <Chip label="Default" size="small" color="primary" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {template.template_type.replace('_', ' ').toUpperCase()} • {template.hierarchy_level}
                    </Typography>
                    <Typography variant="body2">
                      Professional template for {template.hierarchy_level.toLowerCase()} level meetings
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentEditorPage;
