import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let sessionValue = { isDemoMode: true, currentUserEmail: 'mentor@demo.com' };
vi.mock('../../../context/SessionContext', () => ({ useSession: () => sessionValue }));
vi.mock('../../../lib/clientDemoStore', () => ({
  getStudyLockOverride: vi.fn(() => null),
  setStudyLock: vi.fn(),
}));
vi.mock('swr', async (importOriginal) => {
  const actual = await importOriginal<typeof import('swr')>();
  return { ...actual, mutate: vi.fn() };
});

import StudyLockModal from './StudyLockModal';
import * as clientDemoStore from '../../../lib/clientDemoStore';
import { mutate } from 'swr';

beforeEach(() => {
  vi.clearAllMocks();
  sessionValue = { isDemoMode: true, currentUserEmail: 'mentor@demo.com' };
  vi.mocked(clientDemoStore.getStudyLockOverride).mockReturnValue(null);
});
afterEach(() => vi.unstubAllGlobals());

describe('StudyLockModal', () => {
  it('shows "Lock status unavailable" for an unknown studyId', async () => {
    render(<StudyLockModal studyId="no-such-study" onClose={vi.fn()} />);
    expect(await screen.findByText(/lock status unavailable/i)).toBeInTheDocument();
  });

  it('demo mode: shows Open state with a "Lock…" button when not locked', async () => {
    render(<StudyLockModal studyId="demo-study-1" onClose={vi.fn()} />);
    expect(await screen.findByText('Open')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lock…' })).toBeInTheDocument();
  });

  it('Confirm Lock is disabled until a reason is typed', async () => {
    const user = userEvent.setup();
    render(<StudyLockModal studyId="demo-study-1" onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Lock…' }));
    expect(screen.getByRole('button', { name: /confirm lock/i })).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/enter mandatory reason/i), 'Data review');
    expect(screen.getByRole('button', { name: /confirm lock/i })).toBeEnabled();
  });

  it('demo mode: confirming lock calls clientDemoStore.setStudyLock and revalidates the shared "studies" SWR key', async () => {
    const user = userEvent.setup();
    render(<StudyLockModal studyId="demo-study-1" onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Lock…' }));
    await user.type(screen.getByPlaceholderText(/enter mandatory reason/i), 'Data review');
    await user.click(screen.getByRole('button', { name: /confirm lock/i }));

    expect(clientDemoStore.setStudyLock).toHaveBeenCalledWith(expect.objectContaining({
      studyId: 'demo-study-1', locked: true, reason: 'Data review', actorEmail: 'mentor@demo.com',
    }));
    expect(mutate).toHaveBeenCalledWith('studies');
  });

  it('live mode: confirming lock POSTs to /api/admin/lock (or /unlock when already locked)', async () => {
    sessionValue = { isDemoMode: false, currentUserEmail: 'mentor@live.com' };
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce({ json: async () => [{ id: 'study-x', name: 'X', lock_state: 'open' }] });

    const user = userEvent.setup();
    render(<StudyLockModal studyId="study-x" onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Lock…' }));
    await user.type(screen.getByPlaceholderText(/enter mandatory reason/i), 'Locking for audit');
    await user.click(screen.getByRole('button', { name: /confirm lock/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/lock', expect.objectContaining({ method: 'POST' }));
  });

  it('Cancel dismisses the reason input without saving', async () => {
    const user = userEvent.setup();
    render(<StudyLockModal studyId="demo-study-1" onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Lock…' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText(/enter mandatory reason/i)).not.toBeInTheDocument();
    expect(clientDemoStore.setStudyLock).not.toHaveBeenCalled();
  });

  it('the × button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StudyLockModal studyId="demo-study-1" onClose={onClose} />);
    await screen.findByText('Open');
    await user.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
