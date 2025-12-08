/**
 * Zustand Store for Membership Renewal State Management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  RenewalState,
  RenewalStep,
  MemberRenewalData,
  RenewalFormData,
  RenewalFormErrors,
  RenewalProcessResponse,
} from '../types/renewal';

interface RenewalStore extends RenewalState {
  // Actions
  setCurrentStep: (step: RenewalStep) => void;
  setMemberData: (data: MemberRenewalData | null) => void;
  updateFormData: (data: Partial<RenewalFormData>) => void;
  setErrors: (errors: RenewalFormErrors) => void;
  setIsLoading: (loading: boolean) => void;
  setRenewalResult: (result: RenewalProcessResponse | null) => void;
  resetRenewal: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const initialFormData: RenewalFormData = {
  payment_method: 'Cash',
  payment_reference: '',
  amount_paid: 10.0,
};

const initialState: RenewalState = {
  currentStep: 'id-entry',
  memberData: null,
  formData: initialFormData,
  errors: {},
  isLoading: false,
  renewalResult: null,
};

const stepOrder: RenewalStep[] = ['id-entry', 'review-info', 'payment', 'confirmation'];

export const useRenewalStore = create<RenewalStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step: RenewalStep) => {
        set({ currentStep: step });
      },

      setMemberData: (data: MemberRenewalData | null) => {
        set({ memberData: data });
      },

      updateFormData: (data: Partial<RenewalFormData>) => {
        set((state) => ({
          formData: { ...state.formData, ...data },
        }));
      },

      setErrors: (errors: RenewalFormErrors) => {
        set({ errors });
      },

      setIsLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setRenewalResult: (result: RenewalProcessResponse | null) => {
        set({ renewalResult: result });
      },

      resetRenewal: () => {
        set(initialState);
      },

      goToNextStep: () => {
        const currentIndex = stepOrder.indexOf(get().currentStep);
        if (currentIndex < stepOrder.length - 1) {
          set({ currentStep: stepOrder[currentIndex + 1] });
        }
      },

      goToPreviousStep: () => {
        const currentIndex = stepOrder.indexOf(get().currentStep);
        if (currentIndex > 0) {
          set({ currentStep: stepOrder[currentIndex - 1] });
        }
      },
    }),
    {
      name: 'renewal-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        currentStep: state.currentStep,
        memberData: state.memberData,
        formData: state.formData,
      }),
    }
  )
);

