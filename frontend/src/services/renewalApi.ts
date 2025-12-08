/**
 * API Service for Membership Renewal
 */

import { api } from '../lib/api';
import type {
  GetMemberRenewalDataResponse,
  RenewalProcessRequest,
  RenewalProcessResponse,
} from '../types/renewal';

/**
 * Get member data for renewal by ID number
 * PUBLIC ENDPOINT - No authentication required
 */
export const getMemberRenewalData = async (
  idNumber: string
): Promise<GetMemberRenewalDataResponse> => {
  const response = await api.get(`/renewals/member/${idNumber}`);
  return response.data.data;
};

/**
 * Process membership renewal with payment
 * REQUIRES AUTHENTICATION - User must be logged in
 */
export const processRenewal = async (
  renewalData: RenewalProcessRequest
): Promise<RenewalProcessResponse> => {
  const response = await api.post('/renewals/process', renewalData);
  return response.data.data;
};

/**
 * Validate South African ID number format
 */
export const validateIdNumber = (idNumber: string): boolean => {
  // Remove any spaces or dashes
  const cleaned = idNumber.replace(/[\s-]/g, '');

  // Must be exactly 13 digits
  if (!/^\d{13}$/.test(cleaned)) {
    return false;
  }

  return true;
};

/**
 * Format ID number for display (XX XXXX XXXX XXX)
 */
export const formatIdNumber = (idNumber: string): string => {
  const cleaned = idNumber.replace(/[\s-]/g, '');
  if (cleaned.length !== 13) return idNumber;

  return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6, 10)} ${cleaned.slice(10, 13)}`;
};

/**
 * Calculate days until expiry
 */
export const calculateDaysUntilExpiry = (expiryDate: string): number => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Check if membership is expired
 */
export const isMembershipExpired = (expiryDate: string): boolean => {
  return calculateDaysUntilExpiry(expiryDate) < 0;
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format currency (ZAR)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
};

