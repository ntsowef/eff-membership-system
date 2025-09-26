import React from 'react';
import { Backdrop, CircularProgress } from '@mui/material';
import { useUI } from '../../store';

interface LoadingProviderProps {
  children: React.ReactNode;
}

const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const { loading } = useUI();

  return (
    <>
      {children}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
};

export default LoadingProvider;
