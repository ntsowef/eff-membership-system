import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import PublicLayout from '../../../components/layout/PublicLayout';
import HomePage from '../HomePage';

const renderPublicHome = (initialEntry = '/') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="application-status" element={<div data-testid="route-status">Status Page</div>} />
        </Route>
        <Route path="/apply" element={<div data-testid="route-apply">Apply Page</div>} />
        <Route path="/renew" element={<div data-testid="route-renew">Renew Page</div>} />
        <Route path="/my-card" element={<div data-testid="route-my-card">My Card Page</div>} />
        <Route path="/login" element={<div data-testid="route-login">Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('HomePage & PublicLayout — Compact EFF Portal Hub & Redesigned Top Navbar', () => {
  it('renders a single redesigned top navbar, the compact portal hub with all 5 entry points, and the green footer', () => {
    // Arrange & Act
    renderPublicHome();

    // Assert: single unified top navbar (eliminates the previous double-header bug)
    const navbars = screen.getAllByTestId('eff-top-navbar');
    expect(navbars).toHaveLength(1);

    // Assert: compact hub & footer
    expect(screen.getByTestId('eff-portal-hub')).toBeInTheDocument();
    expect(screen.getByTestId('public-green-footer')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /EFF Membership Portal Hub/i })).toBeInTheDocument();
    expect(screen.getByText('Economic Freedom in our Lifetime')).toBeInTheDocument();

    // Assert: all 5 Full Portal Set cards are rendered plainly without verbose guidance blurbs
    expect(screen.getByTestId('portal-card-apply')).toBeInTheDocument();
    expect(screen.getByTestId('portal-card-renew')).toBeInTheDocument();
    expect(screen.getByTestId('portal-card-status')).toBeInTheDocument();
    expect(screen.getByTestId('portal-card-my-card')).toBeInTheDocument();
    expect(screen.getByTestId('portal-card-login')).toBeInTheDocument();
    expect(screen.queryByText(/Select an action below to register as a new member/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Joining for the first time\?/i)).not.toBeInTheDocument();
  });

  it('navigates to each of the 5 portal routes (/apply, /renew, /application-status, /my-card, /login) from the hub cards', () => {
    // 1. /apply
    const { unmount: unmountApply } = renderPublicHome();
    fireEvent.click(screen.getByRole('button', { name: /Start New Application/i }));
    expect(screen.getByTestId('route-apply')).toBeInTheDocument();
    unmountApply();

    // 2. /renew
    const { unmount: unmountRenew } = renderPublicHome();
    fireEvent.click(screen.getByRole('button', { name: /Renew My Membership/i }));
    expect(screen.getByTestId('route-renew')).toBeInTheDocument();
    unmountRenew();

    // 3. /application-status
    const { unmount: unmountStatus } = renderPublicHome();
    fireEvent.click(screen.getByTestId('portal-card-status'));
    expect(screen.getByTestId('route-status')).toBeInTheDocument();
    unmountStatus();

    // 4. /my-card
    const { unmount: unmountCard } = renderPublicHome();
    fireEvent.click(screen.getByTestId('portal-card-my-card'));
    expect(screen.getByTestId('route-my-card')).toBeInTheDocument();
    unmountCard();

    // 5. /login
    const { unmount: unmountLogin } = renderPublicHome();
    fireEvent.click(screen.getByTestId('portal-card-login'));
    expect(screen.getByTestId('route-login')).toBeInTheDocument();
    unmountLogin();
  });

  it('exposes the Full Portal Set navigation items inside the redesigned top navbar on desktop viewports', () => {
    // Match desktop media query so desktop nav renders
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: false, // useMediaQuery(theme.breakpoints.down('md')) === false -> desktop
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    try {
      renderPublicHome();
      const navbar = screen.getByTestId('eff-top-navbar');

      expect(within(navbar).getByRole('button', { name: 'Home' })).toBeInTheDocument();
      expect(within(navbar).getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      expect(within(navbar).getByRole('button', { name: 'Renew' })).toBeInTheDocument();
      expect(within(navbar).getByRole('button', { name: 'Status' })).toBeInTheDocument();
      expect(within(navbar).getByRole('button', { name: 'My Card' })).toBeInTheDocument();
      expect(within(navbar).getByRole('button', { name: 'Staff Login' })).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

