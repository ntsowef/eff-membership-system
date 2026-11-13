import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import IdVerificationStep from '../../../components/application/IdVerificationStep';
import { useApplication } from '../../../store';
import { api } from '../../../lib/api';

vi.mock('../../../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockedApiPost = vi.mocked(api.post);

describe('IdVerificationStep — Plain Layout & Live Feedback Preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useApplication.getState().resetApplication();
  });

  it('omits static "Why do we verify your ID?" and introductory guidance text in the idle state', () => {
    // Arrange & Act
    render(<IdVerificationStep errors={{}} onVerificationComplete={vi.fn()} />);

    // Assert: core title, input, and button exist
    expect(screen.getByText('ID Number Verification')).toBeInTheDocument();
    expect(screen.getByLabelText(/South African ID Number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify ID/i })).toBeInTheDocument();

    // Assert: static guidance sections are removed
    expect(screen.queryByText(/Why do we verify your ID\?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Independent Electoral Commission \(IEC\) helps us/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Enter your South African ID number to verify your voter registration status/i)).not.toBeInTheDocument();
  });

  it('preserves live ID validation error feedback when an invalid 13-digit ID number is entered', () => {
    // Arrange
    render(<IdVerificationStep errors={{}} onVerificationComplete={vi.fn()} />);

    // Act: enter a 13-digit ID with an invalid checksum
    fireEvent.change(screen.getByLabelText(/South African ID Number/i), {
      target: { value: '9001015009087' },
    });

    // Assert: live validation error renders
    expect(screen.getByText(/Invalid ID number checksum/i)).toBeInTheDocument();
  });

  it('preserves live IEC verification result and service-unavailable alerts on lookup', async () => {
    // Arrange
    const onComplete = vi.fn();
    mockedApiPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          is_registered: true,
          province_name: 'Gauteng',
          municipality_name: 'City of Johannesburg',
          ward_code: '79800058',
          voting_station_name: 'Johannesburg City Hall',
        },
      },
    } as any);

    render(<IdVerificationStep errors={{}} onVerificationComplete={onComplete} />);

    // Act: enter valid SA ID (9001015009086) and click Verify ID
    fireEvent.change(screen.getByLabelText(/South African ID Number/i), {
      target: { value: '9001015009086' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Verify ID/i }));

    // Assert: live verified_registered alert displays
    expect(await screen.findByText('Voter Registration Verified!')).toBeInTheDocument();
    expect(screen.getByText(/Johannesburg City Hall/i)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ is_registered: true }), true);

    // Arrange & Act: simulate IEC service error on re-verify
    mockedApiPost.mockRejectedValueOnce(new Error('Network down'));
    fireEvent.click(screen.getByRole('button', { name: /Verify ID/i }));

    // Assert: live service-unavailable feedback alert displays
    await waitFor(() => {
      expect(screen.getByText('Verification Service Unavailable')).toBeInTheDocument();
    });
  });
});

