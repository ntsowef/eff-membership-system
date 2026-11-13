import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MemberRenewalPortal from '../MemberRenewalPortal';
import { useRenewalStore } from '../../../store/renewalStore';
import * as renewalApi from '../../../services/renewalApi';

vi.mock('../../../services/renewalApi', async () => {
  const actual = await vi.importActual<typeof import('../../../services/renewalApi')>(
    '../../../services/renewalApi'
  );
  return {
    ...actual,
    getMemberRenewalData: vi.fn(),
    processRenewal: vi.fn(),
  };
});

const mockGetMemberRenewalData = vi.mocked(renewalApi.getMemberRenewalData);

const sampleMember = {
  member_id: 101,
  id_number: '9001015009087',
  membership_number: 'EFF-2024-00101',
  firstname: 'Thabo',
  surname: 'Mokoena',
  middle_name: '',
  date_of_birth: '1990-01-01',
  age: 36,
  gender_name: 'Male',
  language_name: 'Sepedi',
  email: 'thabo@example.org',
  cell_number: '0821234567',
  landline_number: '',
  residential_address: '12 Freedom Street, Polokwane',
  postal_address: '',
  province_name: 'Limpopo',
  municipality_name: 'Polokwane',
  ward_name: 'Ward 10',
  ward_code: '93504010',
  voting_station_name: 'Polokwane Civic Hall',
  membership_status_name: 'Expired',
  expiry_date: '2025-10-01',
  date_joined: '2023-10-01',
  last_payment_date: '2023-10-01',
  membership_type: 'Regular',
  subscription_name: '24 Months Standard',
};

const renderRenewalPortal = (initialEntry = '/renew') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/renew" element={<MemberRenewalPortal />} />
          <Route path="/" element={<div data-testid="home-route">Home Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('MemberRenewalPortal (/renew) Red Outer Shell & Wizard Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useRenewalStore.getState().resetRenewal();
  });

  it('renders the standalone /apply-aligned red outer shell, EFF emblem, white card, stepper, and green footer', () => {
    // Arrange & Act
    renderRenewalPortal();

    // Assert: outer red-and-green shell & branding match /apply
    expect(screen.getByTestId('renew-outer-shell')).toBeInTheDocument();
    expect(screen.getByTestId('renew-red-section')).toBeInTheDocument();
    expect(screen.getByTestId('renew-white-card')).toBeInTheDocument();
    expect(screen.getByTestId('renew-green-footer')).toBeInTheDocument();

    expect(screen.getByAltText('EFF Logo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Membership\s*Renewal/i })).toBeInTheDocument();
    expect(screen.getByText('Economic Freedom in our Lifetime')).toBeInTheDocument();
    expect(screen.getByText('@2026 Economic Freedom Fighters. All rights reserved')).toBeInTheDocument();

    // Assert: all 4 renewal steps are rendered inside the white card without static privacy/guidance notices
    expect(screen.getByText('Enter ID Number')).toBeInTheDocument();
    expect(screen.getByText('Review & Update Information')).toBeInTheDocument();
    expect(screen.getByText('Payment Information')).toBeInTheDocument();
    expect(screen.getByText('Confirmation')).toBeInTheDocument();
    expect(screen.queryByText(/Privacy Notice:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Continue your fight for economic freedom/i)).not.toBeInTheDocument();
  });

  it('preserves the outer red-and-green shell across all renewal steps (lookup -> review -> payment -> confirmation)', async () => {
    // Arrange
    mockGetMemberRenewalData.mockResolvedValue({
      member: sampleMember as any,
      renewal_eligible: true,
      message: 'Eligible for renewal',
    });
    renderRenewalPortal();

    // Act: Step 1 -> Enter 13-digit ID and submit
    const idInput = screen.getByLabelText(/South African ID Number/i);
    fireEvent.change(idInput, { target: { value: '9001015009087' } });
    fireEvent.click(screen.getByRole('button', { name: /Retrieve My Information/i }));

    // Assert: Step 2 (Review & Update) renders inside the same outer shell
    expect(await screen.findByText(/EFF-2024-00101/i, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId('renew-red-section')).toBeInTheDocument();
    expect(screen.getByTestId('renew-green-footer')).toBeInTheDocument();

    // Act: Step 2 -> Step 3 (Payment Information)
    fireEvent.click(screen.getByRole('button', { name: /Continue to Payment/i }));

    // Assert: Step 3 renders inside the same outer shell
    expect(await screen.findByText('Renewal Payment')).toBeInTheDocument();
    expect(screen.getByTestId('renew-red-section')).toBeInTheDocument();
    expect(screen.getByTestId('renew-green-footer')).toBeInTheDocument();

    // Act: Accept terms & advance to Step 4 (Confirmation)
    fireEvent.click(screen.getByRole('checkbox', { name: /I have read and accept the terms and conditions/i }));
    fireEvent.click(screen.getByRole('button', { name: /Review & Confirm/i }));

    // Assert: Step 4 renders inside the same outer shell
    expect(await screen.findByText('Review Your Renewal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm Renewal/i })).toBeInTheDocument();
    expect(screen.getByTestId('renew-red-section')).toBeInTheDocument();
    expect(screen.getByTestId('renew-green-footer')).toBeInTheDocument();
  });

  it('keeps the outer red shell intact on lookup errors and supports returning home via Cancel', async () => {
    // Arrange
    mockGetMemberRenewalData.mockRejectedValue({
      response: { status: 404 },
    });
    renderRenewalPortal();

    // Act: trigger 404 error
    fireEvent.change(screen.getByLabelText(/South African ID Number/i), {
      target: { value: '9001015009087' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Retrieve My Information/i }));

    // Assert: error displays inside white card while outer shell stays mounted
    expect(
      await screen.findByText(/Member not found\. Please check your ID number and try again\./i)
    ).toBeInTheDocument();
    expect(screen.getByTestId('renew-red-section')).toBeInTheDocument();
    expect(screen.getByTestId('renew-green-footer')).toBeInTheDocument();

    // Act: click Cancel to return home
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByTestId('home-route')).toBeInTheDocument();
    });
  });
});

