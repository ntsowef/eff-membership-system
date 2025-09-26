import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../store';
import { validateUrlAccess, logSecurityViolation } from '../../utils/provinceValidation';

interface ProvinceSecurityGuardProps {
  children: React.ReactNode;
  requireProvinceAccess?: boolean;
  allowedAdminLevels?: string[];
}

/**
 * Security component that validates province-based access permissions
 * and prevents unauthorized access to province-specific data
 */
const ProvinceSecurityGuard: React.FC<ProvinceSecurityGuardProps> = ({
  children,
  requireProvinceAccess = false,
  allowedAdminLevels = ['national', 'province']
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [validationState, setValidationState] = useState<{
    isValidating: boolean;
    isValid: boolean;
    error?: string;
  }>({ isValidating: true, isValid: false });

  useEffect(() => {
    const validateAccess = async () => {
      setValidationState({ isValidating: true, isValid: false });

      // Check if user is authenticated
      if (!user) {
        setValidationState({
          isValidating: false,
          isValid: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check admin level permissions
      if (!allowedAdminLevels.includes(user.admin_level)) {
        logSecurityViolation(
          user.id,
          user.email,
          `Attempted to access restricted area with insufficient permissions`,
          undefined,
          user.province_code
        );
        
        setValidationState({
          isValidating: false,
          isValid: false,
          error: 'Insufficient permissions to access this area'
        });
        return;
      }

      // Validate URL access for provincial admins
      if (user.admin_level === 'province') {
        const urlValidation = validateUrlAccess(location.pathname, searchParams, user);
        
        if (!urlValidation.isValid) {
          if (urlValidation.redirectTo) {
            navigate(urlValidation.redirectTo, { replace: true });
            return;
          }
          
          setValidationState({
            isValidating: false,
            isValid: false,
            error: urlValidation.error
          });
          return;
        }
      }

      // Additional province access validation
      if (requireProvinceAccess && user.admin_level === 'province' && !user.province_code) {
        setValidationState({
          isValidating: false,
          isValid: false,
          error: 'Province assignment required for this area'
        });
        return;
      }

      // All validations passed
      setValidationState({
        isValidating: false,
        isValid: true
      });
    };

    validateAccess();
  }, [user, location.pathname, searchParams, requireProvinceAccess, allowedAdminLevels, navigate]);

  // Show loading state during validation
  if (validationState.isValidating) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show error state if validation failed
  if (!validationState.isValid) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationState.error || 'Access denied'}
        </Alert>
      </Box>
    );
  }

  // Render children if validation passed
  return <>{children}</>;
};

export default ProvinceSecurityGuard;
