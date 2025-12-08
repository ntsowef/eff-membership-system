import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { CloudUpload, ManageAccounts } from '@mui/icons-material';
import BulkFileUploadTab from './BulkFileUploadTab';
import BulkMembersManipulationTab from './BulkMembersManipulationTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`self-data-management-tabpanel-${index}`}
      aria-labelledby={`self-data-management-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const SelfDataManagementPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Self Data Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage member data through bulk file uploads and member manipulation tools
        </Typography>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="self data management tabs"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
          }}
        >
          <Tab
            icon={<CloudUpload />}
            iconPosition="start"
            label="Bulk File Upload"
            id="self-data-management-tab-0"
            aria-controls="self-data-management-tabpanel-0"
          />
          <Tab
            icon={<ManageAccounts />}
            iconPosition="start"
            label="Bulk Members Manipulation"
            id="self-data-management-tab-1"
            aria-controls="self-data-management-tabpanel-1"
          />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <BulkFileUploadTab />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <BulkMembersManipulationTab />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default SelfDataManagementPage;

