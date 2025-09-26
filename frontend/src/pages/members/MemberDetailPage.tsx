import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
  Paper,
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
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Badge,
  Group,
  History,
  Send,
  Save,
  Cancel,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiPost } from '../../lib/api';
import type { Member } from '../../store';

interface Activity {
  id: number;
  type: string;
  description: string;
  date: string;
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
      id={`member-tabpanel-${index}`}
      aria-labelledby={`member-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [sendMessageDialog, setSendMessageDialog] = useState(false);
  const [messageType, setMessageType] = useState<'email' | 'sms'>('email');
  const [editedMember, setEditedMember] = useState<Member | null>(null);

  // Real API queries
  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () => apiGet<Member>(`/members/${id}`),
    enabled: !!id,
  });

  const { data: activities, isError: activitiesError } = useQuery({
    queryKey: ['member-activities', id],
    queryFn: () => apiGet<Activity[]>(`/members/${id}/activities`),
    enabled: !!id,
    retry: false, // Don't retry on 404
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: (updatedMember: Partial<Member>) =>
      apiPut(`/members/${id}`, updatedMember),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setEditMode(false);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { type: 'email' | 'sms'; subject?: string; message: string }) =>
      apiPost(`/members/${id}/send-message`, messageData),
    onSuccess: () => {
      setSendMessageDialog(false);
    },
  });

  // Initialize edited member when member data loads
  useEffect(() => {
    if (member && !editedMember) {
      setEditedMember(member);
    }
  }, [member, editedMember]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Typography>Loading member details...</Typography>
      </Box>
    );
  }

  if (error || !member) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load member details. Please try again.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/admin/members')}>
          Back to Members
        </Button>
      </Box>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Inactive': return 'error';
      case 'Suspended': return 'warning';
      default: return 'default';
    }
  };

  const handleSave = () => {
    if (editedMember) {
      updateMemberMutation.mutate(editedMember);
    }
  };

  const handleCancel = () => {
    setEditedMember(member);
    setEditMode(false);
  };

  const handleSendMessage = (messageData: { subject?: string; message: string }) => {
    sendMessageMutation.mutate({
      type: messageType,
      ...messageData,
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/members')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            {member.firstname || 'Unknown'} {member.surname || 'Member'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Member ID: {member.member_id || 'N/A'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Email />}
            onClick={() => {
              setMessageType('email');
              setSendMessageDialog(true);
            }}
          >
            Email
          </Button>
          <Button
            variant="outlined"
            startIcon={<Send />}
            onClick={() => {
              setMessageType('sms');
              setSendMessageDialog(true);
            }}
          >
            SMS
          </Button>
          {editMode ? (
            <>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setEditMode(true)}
            >
              Edit
            </Button>
          )}
        </Box>
      </Box>

      {/* Member Profile Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{ width: 80, height: 80, mr: 3, fontSize: '2rem' }}
            >
              {(member.firstname || 'U')[0]}{(member.surname || 'U')[0]}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" gutterBottom>
                {member.firstname || 'Unknown'} {member.surname || 'Member'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Chip
                  label={member.membership_status_calculated || member.status_name || 'Unknown'}
                  color={getStatusColor(member.membership_status_calculated || member.status_name || 'Unknown') as any}
                  size="small"
                />
                <Chip
                  label={member.subscription_name || 'N/A'}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={member.ward_name || 'N/A'}
                  variant="outlined"
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Member since {(member.membership_date_joined || member.created_at) ? new Date(member.membership_date_joined || member.created_at).toLocaleDateString() : 'N/A'}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Email />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={member.email || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Phone />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phone"
                    secondary={member.cell_number || member.landline_number || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocationOn />
                  </ListItemIcon>
                  <ListItemText
                    primary="Address"
                    secondary={`${member.residential_address || 'N/A'}, ${member.municipality_name || 'N/A'}, ${member.province_name || 'N/A'}`}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Badge />
                  </ListItemIcon>
                  <ListItemText
                    primary="ID Number"
                    secondary={member.id_number || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday />
                  </ListItemIcon>
                  <ListItemText
                    primary="Date of Birth"
                    secondary={member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Group />
                  </ListItemIcon>
                  <ListItemText
                    primary="Gender"
                    secondary={member.gender_name || 'N/A'}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_: React.SyntheticEvent, newValue: number) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Details" />
          <Tab label="Activity" />
          <Tab label="Documents" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {editMode && editedMember ? (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={editedMember.firstname || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditedMember(prev => prev ? {...prev, firstname: e.target.value} : null)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Surname"
                  value={editedMember.surname || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditedMember(prev => prev ? {...prev, surname: e.target.value} : null)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={editedMember.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditedMember(prev => prev ? {...prev, email: e.target.value} : null)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={editedMember.cell_number || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditedMember(prev => prev ? {...prev, cell_number: e.target.value} : null)
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={editedMember.residential_address || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditedMember(prev => prev ? {...prev, residential_address: e.target.value} : null)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Membership Status</InputLabel>
                  <Select
                    value={editedMember.membership_status_calculated || editedMember.status_name || ''}
                    onChange={(e: any) =>
                      setEditedMember(prev => prev ? {...prev, status_name: e.target.value} : null)
                    }
                    label="Membership Status"
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                    <MenuItem value="Suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Membership Type</InputLabel>
                  <Select
                    value={editedMember.subscription_name || ''}
                    onChange={(e: any) =>
                      setEditedMember(prev => prev ? {...prev, subscription_name: e.target.value} : null)
                    }
                    label="Membership Type"
                  >
                    <MenuItem value="Regular">Regular</MenuItem>
                    <MenuItem value="Student">Student</MenuItem>
                    <MenuItem value="Senior">Senior</MenuItem>
                    <MenuItem value="Associate">Associate</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Personal Information</Typography>
                <Typography variant="body2" paragraph>
                  <strong>Full Name:</strong> {member.firstname || 'Unknown'} {member.surname || 'Member'}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>ID Number:</strong> {member.id_number || 'N/A'}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Date of Birth:</strong> {member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : 'N/A'}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Gender:</strong> {member.gender_name || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Membership Information</Typography>
                <Typography variant="body2" paragraph>
                  <strong>Member ID:</strong> {member.member_id || 'N/A'}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Membership Type:</strong> {member.subscription_name || 'N/A'}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Ward:</strong> {member.ward_name || 'N/A'}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Join Date:</strong> {member.date_joined ? new Date(member.date_joined).toLocaleDateString() : 'N/A'}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Expiry Date:</strong> {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          {activitiesError ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Activity tracking is not yet available for individual members.
              This feature will be implemented in a future update.
            </Alert>
          ) : (
            <List>
              {activities && activities.length > 0 ? (
                activities.map((activity: Activity) => (
                  <ListItem key={activity.id} divider>
                    <ListItemIcon>
                      <History />
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.description}
                      secondary={new Date(activity.date).toLocaleString()}
                    />
                  </ListItem>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent activity found.
                </Typography>
              )}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Documents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No documents uploaded yet.
          </Typography>
        </TabPanel>
      </Paper>

      {/* Send Message Dialog */}
      <Dialog open={sendMessageDialog} onClose={() => setSendMessageDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSendMessage({
            subject: formData.get('subject') as string,
            message: formData.get('message') as string,
          });
        }}>
          <DialogTitle>
            Send {messageType === 'email' ? 'Email' : 'SMS'} to {member.firstname || 'Unknown'} {member.surname || 'Member'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Subject"
              name="subject"
              margin="normal"
              defaultValue={messageType === 'email' ? 'Message from GEOMAPS' : ''}
              disabled={messageType === 'sms'}
              required={messageType === 'email'}
            />
            <TextField
              fullWidth
              label="Message"
              name="message"
              multiline
              rows={4}
              margin="normal"
              placeholder={`Enter your ${messageType} message here...`}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSendMessageDialog(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? 'Sending...' : `Send ${messageType === 'email' ? 'Email' : 'SMS'}`}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default MemberDetailPage;
