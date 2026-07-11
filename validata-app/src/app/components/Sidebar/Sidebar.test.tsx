import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/study-overview' }));
vi.mock('../Shell/PrimarySidebar', () => ({
  default: ({ userRole, userStatus, currentPath }: any) => (
    <div data-testid="primary-sidebar">{userRole}/{userStatus}/{currentPath}</div>
  ),
}));

import Sidebar from './Sidebar';

describe('Sidebar', () => {
  it('passes userRole/userStatus through, and currentPath from usePathname()', () => {
    render(<Sidebar userRole="mentor" userStatus="active" currentUserEmail="a@b.com" />);
    expect(screen.getByTestId('primary-sidebar')).toHaveTextContent('mentor/active//study-overview');
  });
});
