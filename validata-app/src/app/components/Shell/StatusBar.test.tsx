import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import StatusBar from './StatusBar';

const baseProps = {
  currentUserEmail: 'mentor@demo.com',
  isDemoMode: false,
  theme: 'dark' as const,
  onToggleTheme: vi.fn(),
};

describe('StatusBar', () => {
  it('shows the friendly role name from ROLE_NAMES, falling back to the raw string for an unknown role', () => {
    render(<StatusBar {...baseProps} userRole="site_coordinator" />);
    expect(screen.getByText('Site Coordinator')).toBeInTheDocument();

    render(<StatusBar {...baseProps} userRole="some_future_role" />);
    expect(screen.getByText('some_future_role')).toBeInTheDocument();
  });

  it('shows (DEMO) only in demo mode', () => {
    const { rerender } = render(<StatusBar {...baseProps} userRole="mentor" isDemoMode studyName="Study A" />);
    expect(screen.getByText('(DEMO)')).toBeInTheDocument();
    rerender(<StatusBar {...baseProps} userRole="mentor" isDemoMode={false} studyName="Study A" />);
    expect(screen.queryByText('(DEMO)')).not.toBeInTheDocument();
  });

  it('a mentor/admin can click their role name to navigate to User Registry', async () => {
    const user = userEvent.setup();
    render(<StatusBar {...baseProps} userRole="mentor" />);
    await user.click(screen.getByTitle('User Registry'));
    expect(push).toHaveBeenCalledWith('/user-registry');
  });

  it('a non-admin role is plain text, not a clickable link to User Registry', () => {
    render(<StatusBar {...baseProps} userRole="team_member" />);
    expect(screen.queryByTitle('User Registry')).not.toBeInTheDocument();
    expect(screen.getByText('Team Member')).toBeInTheDocument();
  });

  it('shows the locked/unlocked indicator based on lockState', () => {
    render(<StatusBar {...baseProps} userRole="team_member" lockState="locked" />);
    expect(screen.getByText(/locked/i)).toBeInTheDocument();
  });

  it('calls onToggleTheme when the theme button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    render(<StatusBar {...baseProps} userRole="team_member" onToggleTheme={onToggleTheme} />);
    await user.click(screen.getByTitle(/switch to light mode/i));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('only renders the logout button when onLogout is provided', () => {
    const { rerender } = render(<StatusBar {...baseProps} userRole="team_member" />);
    expect(screen.queryByTitle('Sign Out')).not.toBeInTheDocument();
    rerender(<StatusBar {...baseProps} userRole="team_member" onLogout={vi.fn()} />);
    expect(screen.getByTitle('Sign Out')).toBeInTheDocument();
  });
});
