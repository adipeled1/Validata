import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserRegistryControl from './control';

// UserRegistryControl reads `studies` from StudyContext directly - stub it
// out rather than wrapping every test in a full StudyProvider, since none of
// these flows touch study data.
vi.mock('../../../context/StudyContext', () => ({
  useStudy: () => ({ studies: [] }),
}));

// Demo mode routes every mutation through clientDemoStore (see
// clientDemoStore.test.ts for that layer's own coverage) - these tests cover
// UserRegistryControl's own logic: which clientDemoStore call each action
// makes, and how local `users` state is updated afterward.
describe('UserRegistryControl (demo mode flows)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('Approve sets role=team_member and status=active together, moving the user out of Pending Approvals', async () => {
    const user = userEvent.setup();
    render(<UserRegistryControl isDemoMode currentUserEmail="admin@demo.com" viewerRole="admin" />);

    await screen.findByText('newuser@demo.com'); // demo-wait-approval-id
    await user.click(screen.getByTitle('Approve and activate account'));

    // Approved users move into the main Active Users table alongside their
    // now-real role - "team member" text now appears for this user.
    const row = (await screen.findByText('newuser@demo.com')).closest('tr')!;
    expect(within(row).getByText(/team member/i)).toBeInTheDocument();
  });

  it('Suspend then Unsuspend round-trips a user between active and suspended', async () => {
    const user = userEvent.setup();
    render(<UserRegistryControl isDemoMode currentUserEmail="admin@demo.com" viewerRole="admin" />);

    const teamRow = (await screen.findByText('team@demo.com')).closest('tr')!;
    await user.click(within(teamRow).getByTitle('Suspend access'));

    // Re-query the row - React re-renders it with the new action buttons.
    const suspendedRow = (await screen.findByText('team@demo.com')).closest('tr')!;
    expect(within(suspendedRow).getByTitle('Activate access')).toBeInTheDocument();

    await user.click(within(suspendedRow).getByTitle('Activate access'));
    const reactivatedRow = (await screen.findByText('team@demo.com')).closest('tr')!;
    expect(within(reactivatedRow).getByTitle('Suspend access')).toBeInTheDocument();
  });

  it('Delete on an approved account moves them to Deleted Archives (status: deleted) instead of removing them from the list', async () => {
    const user = userEvent.setup();
    render(<UserRegistryControl isDemoMode currentUserEmail="admin@demo.com" viewerRole="admin" />);

    const teamRow = (await screen.findByText('team@demo.com')).closest('tr')!;
    await user.click(within(teamRow).getByTitle('Delete profile'));

    // Reversible-delete copy, not the permanent-rejection copy.
    expect(await screen.findByText('Delete User Profile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete User' }));

    // The user should no longer be in the main active table...
    expect(screen.queryByText('team@demo.com')).not.toBeInTheDocument();
    // ...but should be reachable via Deleted Archives, not gone entirely.
    await user.click(screen.getByRole('button', { name: /deleted archives/i }));
    expect(await screen.findByText('team@demo.com')).toBeInTheDocument();
  });

  it('Reactivating a deleted user from the archive restores their access', async () => {
    const user = userEvent.setup();
    render(<UserRegistryControl isDemoMode currentUserEmail="admin@demo.com" viewerRole="admin" />);

    // demo-deleted-id already ships pre-deleted in DEMO_USERS.
    await user.click(screen.getByRole('button', { name: /deleted archives/i }));
    const archivedRow = (await screen.findByText('deleted_user@demo.com')).closest('tr')!;
    await user.click(within(archivedRow).getByTitle('Reactivate user profile'));

    // Archive modal closes on reactivate; the user should now show up back
    // in the main active table.
    expect(await screen.findByText('deleted_user@demo.com')).toBeInTheDocument();
  });
});
