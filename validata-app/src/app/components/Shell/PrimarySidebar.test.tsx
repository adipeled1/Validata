import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

const openTab = vi.fn();
vi.mock('../../../context/TabContext', () => ({
  useTabs: () => ({ openTab }),
}));

import PrimarySidebar from './PrimarySidebar';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});
afterEach(() => vi.unstubAllGlobals());

describe('PrimarySidebar', () => {
  it('a suspended mentor sees the same reduced nav as a suspended team_member (isActive gate applies regardless of role)', () => {
    render(<PrimarySidebar userRole="mentor" userStatus="suspended" currentPath="/study-overview" />);
    expect(screen.queryByText('Participant Registry')).not.toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliance')).not.toBeInTheDocument();
    // Study Overview always shows - it's the landing page with no RLS-gated data.
    expect(screen.getByText('Study Overview')).toBeInTheDocument();
  });

  it('an active team_member (no operational role yet) sees only Study Overview, no data sections', () => {
    render(<PrimarySidebar userRole="team_member" userStatus="active" currentPath="/study-overview" />);
    expect(screen.getByText('Study Overview')).toBeInTheDocument();
    expect(screen.queryByText('Participant Registry')).not.toBeInTheDocument();
    expect(screen.queryByText('Analysis & Reporting')).not.toBeInTheDocument();
  });

  it('an active investigator sees Participants/Data/Compliance sections', () => {
    render(<PrimarySidebar userRole="investigator" userStatus="active" currentPath="/participants" />);
    expect(screen.getByText('Participant Registry')).toBeInTheDocument();
    expect(screen.getByText('Data Collection')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument(); // not admin/mentor
  });

  it('an active mentor sees Administration, including System Inventory (merged in, no separate System section)', () => {
    render(<PrimarySidebar userRole="mentor" userStatus="active" currentPath="/study-overview" />);
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.queryByText('System')).not.toBeInTheDocument();
    const adminSection = screen.getByText('Administration').closest('div')!.parentElement!;
    expect(within(adminSection).getByText('Study Management')).toBeInTheDocument();
    expect(within(adminSection).getByText('User Registry')).toBeInTheDocument();
    expect(within(adminSection).getByText('System Inventory')).toBeInTheDocument();
  });

  it('a non-mentor/admin does not see Administration', () => {
    render(<PrimarySidebar userRole="investigator" userStatus="active" currentPath="/study-overview" />);
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  it('Audit-viewer-only sub-items (Study Log/Audit Trail/System Log) require AUDIT_VIEWER_ROLES, not just READABLE_ROLES', () => {
    // site_coordinator is READABLE_ROLES but not AUDIT_VIEWER_ROLES.
    render(<PrimarySidebar userRole="site_coordinator" userStatus="active" currentPath="/study-overview" />);
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.queryByText('Audit Trail')).not.toBeInTheDocument();
    expect(screen.getByText('Consent Records')).toBeInTheDocument(); // always shown within Compliance
  });

  it('fetches pending-approval count only for admin-gated roles (mentor/admin), and shows it as a badge on User Registry', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [{ status: 'wait_approval' }, { status: 'wait_approval' }, { status: 'wait_email_confirm' }],
    } as any);

    render(<PrimarySidebar userRole="mentor" userStatus="active" currentPath="/study-overview" />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/profiles'));
    expect(await screen.findByText('2')).toBeInTheDocument(); // badge count excludes wait_email_confirm
  });

  it('does not fetch the pending count for non-admin roles', () => {
    render(<PrimarySidebar userRole="team_member" userStatus="active" currentPath="/study-overview" />);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Results Table, Analysis & Reporting, and Queries live under "Overview & Analysis"; Study Overview is pinned above it, not inside it', () => {
    render(<PrimarySidebar userRole="investigator" userStatus="active" currentPath="/study-overview" />);

    expect(screen.getByText('Overview & Analysis')).toBeInTheDocument();
    expect(screen.queryByText('Analysis & Results')).not.toBeInTheDocument(); // old section name is gone
    expect(screen.queryByText('Query Management')).not.toBeInTheDocument(); // folded into Overview & Analysis

    // SectionHeader renders its own <div> just for the label text; the
    // wrapping <div> that also holds the NavGroup is one level up.
    const section = screen.getByText('Overview & Analysis').closest('div')!.parentElement!;
    expect(within(section).getByText('Results Table')).toBeInTheDocument();
    expect(within(section).getByText('Analysis & Reporting')).toBeInTheDocument();
    expect(within(section).getByText('Queries')).toBeInTheDocument();
    expect(within(section).queryByText('Study Overview')).not.toBeInTheDocument();
  });

  it('does not offer Results Table in the "Participants & Data" section', () => {
    render(<PrimarySidebar userRole="investigator" userStatus="active" currentPath="/participants" />);
    const dataSection = screen.getByText('Participants & Data').closest('div')!.parentElement!;
    expect(within(dataSection).getByText('Participant Registry')).toBeInTheDocument();
    expect(within(dataSection).getByText('Data Collection')).toBeInTheDocument();
    expect(within(dataSection).queryByText('Results Table')).not.toBeInTheDocument();
  });

  it('clicking a nav item calls openTab with its path and label', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<PrimarySidebar userRole="investigator" userStatus="active" currentPath="/study-overview" />);
    await user.click(screen.getByText('Participant Registry'));
    expect(openTab).toHaveBeenCalledWith('/participants', 'Participant Registry');
  });
});
