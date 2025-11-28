import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Paper } from '@mui/material';
import { CloudUpload, History, Assessment } from '@mui/icons-material';
import BulkUploadTab from '../../components/members/bulk-upload/BulkUploadTab';
import UploadHistoryTab from '../../components/members/bulk-upload/UploadHistoryTab';
import UploadStatisticsTab from '../../components/members/bulk-upload/UploadStatisticsTab';

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
      id={`bulk-upload-tabpanel-${index}`}
      aria-labelledby={`bulk-upload-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `bulk-upload-tab-${index}`,
    'aria-controls': `bulk-upload-tabpanel-${index}`,
  };
}

const MemberBulkUploadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bulk Member Application Upload
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Upload spreadsheets to register multiple member applications at once
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="bulk upload tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<CloudUpload />}
            label="Upload"
            {...a11yProps(0)}
            iconPosition="start"
          />
          <Tab
            icon={<History />}
            label="Upload History"
            {...a11yProps(1)}
            iconPosition="start"
          />
          <Tab
            icon={<Assessment />}
            label="Statistics"
            {...a11yProps(2)}
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <BulkUploadTab />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <UploadHistoryTab />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <UploadStatisticsTab />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default MemberBulkUploadPage;

