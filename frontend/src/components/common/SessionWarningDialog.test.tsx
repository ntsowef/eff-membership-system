
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionWarningDialog } from './SessionWarningDialog';
import { useSessionManagement } from '../../hooks/useSessionManagement';

// Mock the useSessionManagement hook
jest.mock('../../hooks/useSessionManagement');

const mockUseSessionManagement = useSessionManagement as jest.MockedFunction<typeof useSessionManagement>;

describe('SessionWarningDialog Auto-Extension', () => {
  const mockExtendSession = jest.fn();
  const mockDismissWarning = jest.fn();
  const mockHandleLogout = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseSessionManagement.mockReturnValue({
      sessionStatus: {
        isValid: true,
        timeRemaining: 2,
        needsWarning: true,
        canExtend: true
      },
      showWarning: true,
      isExtending: false,
      extendSession: mockExtendSession,
      dismissWarning: mockDismissWarning,
      handleLogout: mockHandleLogout,
      formatTimeRemaining: (minutes: number) => `${minutes} minutes`
    });

    mockExtendSession.mockResolvedValue(true);
  });

  it('should auto-extend session on mouse movement', async () => {
    render(<SessionWarningDialog open={true} onClose={mockOnClose} />);
    
    // Verify dialog is open
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
    
    // Simulate mouse movement
    fireEvent.mouseMove(document);
    
    // Wait for debounced activity handler
    await waitFor(() => {
      expect(mockExtendSession).toHaveBeenCalled();
    }, { timeout: 200 });
    
    // Verify dialog dismissal
    await waitFor(() => {
      expect(mockDismissWarning).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should auto-extend session on key press', async () => {
    render(<SessionWarningDialog open={true} onClose={mockOnClose} />);
    
    // Simulate key press
    fireEvent.keyDown(document, { key: 'Enter' });
    
    // Wait for debounced activity handler
    await waitFor(() => {
      expect(mockExtendSession).toHaveBeenCalled();
    }, { timeout: 200 });
    
    // Verify dialog dismissal
    await waitFor(() => {
      expect(mockDismissWarning).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should auto-extend session on click', async () => {
    render(<SessionWarningDialog open={true} onClose={mockOnClose} />);
    
    // Simulate click
    fireEvent.click(document);
    
    // Wait for debounced activity handler
    await waitFor(() => {
      expect(mockExtendSession).toHaveBeenCalled();
    }, { timeout: 200 });
    
    // Verify dialog dismissal
    await waitFor(() => {
      expect(mockDismissWarning).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should auto-extend session on touch events', async () => {
    render(<SessionWarningDialog open={true} onClose={mockOnClose} />);
    
    // Simulate touch start
    fireEvent.touchStart(document);
    
    // Wait for debounced activity handler
    await waitFor(() => {
      expect(mockExtendSession).toHaveBeenCalled();
    }, { timeout: 200 });
    
    // Verify dialog dismissal
    await waitFor(() => {
      expect(mockDismissWarning).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should debounce rapid activity events', async () => {
    render(<SessionWarningDialog open={true} onClose={mockOnClose} />);
    
    // Simulate rapid mouse movements
    fireEvent.mouseMove(document);
    fireEvent.mouseMove(document);
    fireEvent.mouseMove(document);
    
    // Wait for debounced activity handler
    await waitFor(() => {
      expect(mockExtendSession).toHaveBeenCalledTimes(1);
    }, { timeout: 200 });
  });

  it('should not detect activity when dialog is closed', async () => {
    render(<SessionWarningDialog open={false} onClose={mockOnClose} />);
    
    // Simulate activity
    fireEvent.mouseMove(document);
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.click(document);
    
    // Wait and verify no extension was called
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(mockExtendSession).not.toHaveBeenCalled();
  });

  it('should handle extension failure gracefully', async () => {
    mockExtendSession.mockResolvedValue(false);
    
    render(<SessionWarningDialog open={true} onClose={mockOnClose} />);
    
    // Simulate activity
    fireEvent.mouseMove(document);
    
    // Wait for debounced activity handler
    await waitFor(() => {
      expect(mockExtendSession).toHaveBeenCalled();
    }, { timeout: 200 });
    
    // Verify dialog is not dismissed on failure
    expect(mockDismissWarning).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should display helpful tip about auto-extension', () => {
    render(<SessionWarningDialog open={true} onClose={mockOnClose} />);
    
    expect(screen.getByText(/💡 Tip: Your session will be automatically extended/)).toBeInTheDocument();
  });

  it('should cleanup event listeners when dialog closes', () => {
    const { rerender } = render(<SessionWarningDialog open={true} onClose={mockOnClose} />);
    
    // Verify event listeners are added (we can't directly test this, but we can test the behavior)
    fireEvent.mouseMove(document);
    
    // Close dialog
    rerender(<SessionWarningDialog open={false} onClose={mockOnClose} />);
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Simulate activity after dialog is closed
    fireEvent.mouseMove(document);
    
    // Verify no extension is called
    expect(mockExtendSession).not.toHaveBeenCalled();
  });
});
