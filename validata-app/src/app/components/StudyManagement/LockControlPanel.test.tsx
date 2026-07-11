import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let sessionValue = { isDemoMode: true };
vi.mock('../../../context/SessionContext', () => ({ useSession: () => sessionValue }));
vi.mock('../../../lib/clientDemoStore', () => ({ getStudyLockOverride: vi.fn(() => null) }));

import LockControlPanel from './LockControlPanel';
import * as clientDemoStore from '../../../lib/clientDemoStore';

beforeEach(() => {
  vi.clearAllMocks();
  sessionValue = { isDemoMode: true };
  vi.mocked(clientDemoStore.getStudyLockOverride).mockReturnValue(null);
});
afterEach(() => vi.unstubAllGlobals());

describe('LockControlPanel', () => {
  it('renders nothing for an unknown studyId', async () => {
    const { container } = render(<LockControlPanel studyId="no-such-study" onManage={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.firstChild).toBeNull();
  });

  it('demo mode: shows "open" state with no lock override', async () => {
    render(<LockControlPanel studyId="demo-study-1" onManage={vi.fn()} />);
    expect(await screen.findByText(/data entry is open/i)).toBeInTheDocument();
  });

  it('demo mode: merges a lock override, showing the locked sentence with reason', async () => {
    vi.mocked(clientDemoStore.getStudyLockOverride).mockReturnValue({
      lock_state: 'locked', lock_reason: 'Audit in progress', locked_by: 'mentor@demo.com', locked_at: '2026-07-11T00:00:00Z',
    } as any);
    render(<LockControlPanel studyId="demo-study-1" onManage={vi.fn()} />);
    expect(await screen.findByText(/audit in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/mentor@demo.com/)).toBeInTheDocument();
  });

  it('live mode: fetches /api/studies and finds the matching study', async () => {
    sessionValue = { isDemoMode: false };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => [{ id: 'study-x', lock_state: 'locked', lock_reason: 'r', locked_by: null }],
    }));
    render(<LockControlPanel studyId="study-x" onManage={vi.fn()} />);
    expect(await screen.findByText(/data entry is locked/i)).toBeInTheDocument();
  });

  it('clicking "Manage data lock" calls onManage', async () => {
    const user = userEvent.setup();
    const onManage = vi.fn();
    render(<LockControlPanel studyId="demo-study-1" onManage={onManage} />);
    await screen.findByText(/data entry is open/i);
    await user.click(screen.getByRole('button', { name: /manage data lock/i }));
    expect(onManage).toHaveBeenCalledTimes(1);
  });
});
