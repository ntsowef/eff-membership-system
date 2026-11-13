import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import LoginPage from '../LoginPage';
import ForgotPasswordPage from '../ForgotPasswordPage';
import { useAuth } from '../../../store';

describe('LoginPage (/login) — Top Navbar Hidden & Card Preserved', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuth.setState({ isAuthenticated: false, user: null, token: null } as any);
  });

  it('renders the login card as-is without the top navbar on /login', () => {
    // Arrange & Act
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert: top navbar is not rendered
    expect(screen.queryByTestId('eff-top-navbar')).not.toBeInTheDocument();

    // Assert: login card remains intact as-is
    expect(screen.getByRole('heading', { level: 1, name: /EFF Membership Portal/i })).toBeInTheDocument();
    expect(screen.getByText('Secure Administrative Access')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('omits the top navbar on /forgot-password as well', () => {
    // Arrange & Act
    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert
    expect(screen.queryByTestId('eff-top-navbar')).not.toBeInTheDocument();
  });
});

