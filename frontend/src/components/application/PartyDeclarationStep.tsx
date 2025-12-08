import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  Alert,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Edit,
  Gesture,
  Clear,
} from '@mui/icons-material';
import { useApplication } from '../../store';

interface PartyDeclarationStepProps {
  errors: Record<string, string>;
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
      id={`signature-tabpanel-${index}`}
      aria-labelledby={`signature-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PartyDeclarationStep: React.FC<PartyDeclarationStepProps> = ({ errors }) => {
  const { applicationData, updateApplicationData } = useApplication();
  const [tabValue, setTabValue] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const declarationText = `I, Fighter ${applicationData.first_name || '...'} ${applicationData.last_name || '...'}, solemnly declare that I will abide by the aims, objectives and radical policies of Economic Freedom Fighters as set out in the Constitution of the EFF. I voluntarily join the EFF without any motive of personal gain or material benefit, and understand that I am not entitled to any positions or deployments. I will participate in the life of the Economic Freedom Fighters to strive towards total emancipation of South Africa, Africa and the oppressed of the world and will do so as a loyal, active and disciplined Economic Freedom Fighter.

I further declare that I have never been a member of any other political party, and if I have been, I have formally resigned from such party. I understand that dual membership is not allowed in the EFF.

I commit to:
• Uphold the revolutionary principles of the EFF
• Participate actively in the struggle for economic freedom
• Respect the leadership and structures of the organization
• Contribute to the advancement of the African people
• Fight against all forms of oppression and exploitation

I understand that membership in the EFF requires dedication, discipline, and unwavering commitment to the cause of economic freedom and social justice.`;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTypedSignatureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateApplicationData({
      signature_type: 'typed',
      signature_data: event.target.value,
    });
  };

  const handleDeclarationAcceptance = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateApplicationData({
      declaration_accepted: event.target.checked,
    });
  };

  const handleConstitutionAcceptance = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateApplicationData({
      constitution_accepted: event.target.checked,
    });
  };

  // Canvas drawing functions
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL();
      updateApplicationData({
        signature_type: 'drawn',
        signature_data: signatureData,
      });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateApplicationData({
          signature_type: undefined,
          signature_data: '',
        });
      }
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Party Declaration and Signature
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please read the party declaration carefully and provide your signature to confirm your commitment to the Economic Freedom Fighters.
      </Typography>

      {/* Party Declaration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            EFF Party Declaration
          </Typography>
          <Paper sx={{ p: 3, backgroundColor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {declarationText}
            </Typography>
          </Paper>
        </CardContent>
      </Card>

      {/* Signature Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Digital Signature
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose how you would like to provide your signature:
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Type Signature" icon={<Edit />} />
              <Tab label="Draw Signature" icon={<Gesture />} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <TextField
              fullWidth
              label="Type your full name as signature"
              placeholder="Enter your full name"
              value={applicationData.signature_type === 'typed' ? applicationData.signature_data || '' : ''}
              onChange={handleTypedSignatureChange}
              error={!!errors.signature_data}
              helperText={errors.signature_data || 'Type your full name exactly as it appears on your ID document'}
              sx={{ mb: 2 }}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Draw your signature in the box below:
              </Typography>
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: 'crosshair',
                  backgroundColor: 'white',
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={clearCanvas}
                  size="small"
                >
                  Clear Signature
                </Button>
              </Box>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Confirmation Checkboxes */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Confirmation
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={applicationData.declaration_accepted || false}
                onChange={handleDeclarationAcceptance}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I have read and understood the party declaration above, and I solemnly declare my commitment to the Economic Freedom Fighters and its principles.
              </Typography>
            }
            sx={{ mb: 2, alignItems: 'flex-start' }}
          />
          {errors.declaration_accepted && (
            <Typography variant="caption" color="error" display="block" sx={{ ml: 4, mt: -1, mb: 2 }}>
              {errors.declaration_accepted}
            </Typography>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={applicationData.constitution_accepted || false}
                onChange={handleConstitutionAcceptance}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I agree to abide by the Constitution of the Economic Freedom Fighters and accept the aims, objectives, and policies of the organization.
              </Typography>
            }
            sx={{ mb: 2, alignItems: 'flex-start' }}
          />
          {errors.constitution_accepted && (
            <Typography variant="caption" color="error" display="block" sx={{ ml: 4, mt: -1, mb: 2 }}>
              {errors.constitution_accepted}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert severity="info">
        <Typography variant="body2">
          <strong>Important:</strong> By providing your signature and checking the confirmation boxes above, 
          you are making a solemn commitment to the Economic Freedom Fighters. This declaration is legally binding 
          and represents your formal application for membership in the EFF.
        </Typography>
      </Alert>
    </Box>
  );
};

export default PartyDeclarationStep;
