import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MeetingsPage from '../MeetingsPage';
import { apiGet, apiDelete } from '../../../lib/api';

vi.mock('../../../lib/api', () => ({
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);
const mockApiDelete = vi.mocked(apiDelete);

const renderMeetingsPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MeetingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('MeetingsPage Delete Meeting Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({
      data: {
        meetings: [
          {
            meeting_id: 42,
            meeting_title: 'BGA Meeting',
            hierarchy_level: 'Ward',
            entity_id: 1,
            meeting_type: 'Regular',
            start_datetime: '2026-11-30T17:31:00.000Z',
            end_datetime: '2026-11-30T21:31:00.000Z',
            location: 'Johannesburg',
            meeting_status: 'Scheduled',
            created_by: 1,
            created_at: '2026-11-01T10:00:00.000Z',
            updated_at: '2026-11-01T10:00:00.000Z',
          },
        ],
      },
    } as any);
  });

  it('preserves the meeting title after closing the row menu and calls apiDelete on confirmation', async () => {
    // Arrange
    mockApiDelete.mockResolvedValue({ success: true } as any);
    renderMeetingsPage();

    const actionButton = await screen.findByRole(
      'button',
      { name: 'Actions for BGA Meeting' },
      { timeout: 5000 }
    );

    // Act: open row menu and click Delete Meeting
    fireEvent.click(actionButton);
    const deleteMenuItem = await screen.findByRole('menuitem', { name: /Delete Meeting/i });
    fireEvent.click(deleteMenuItem);

    // Assert: confirmation modal displays the actual meeting title instead of ""
    expect(
      await screen.findByText(/Are you sure you want to delete "BGA Meeting"\?/i)
    ).toBeInTheDocument();

    // Act: confirm deletion
    const confirmDeleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmDeleteButton);

    // Assert: DELETE endpoint is called with resolved meeting_id
    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('/meetings/42');
    });
  });

  it('displays an error alert and keeps the dialog open if deletion fails', async () => {
    // Arrange
    mockApiDelete.mockRejectedValue({
      response: { data: { error: { message: 'Database delete failed' } } },
    });
    renderMeetingsPage();

    const actionButton = await screen.findByRole(
      'button',
      { name: 'Actions for BGA Meeting' },
      { timeout: 5000 }
    );

    // Act
    fireEvent.click(actionButton);
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete Meeting/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    // Assert
    expect(await screen.findByText('Database delete failed')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "BGA Meeting"\?/i)).toBeInTheDocument();
  });
});

