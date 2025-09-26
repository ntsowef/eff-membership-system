import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import App from './App.tsx'

// Disable all axios redirects globally for development
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on any errors in development mode
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
