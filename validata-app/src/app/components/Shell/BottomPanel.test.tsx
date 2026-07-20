import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

let sessionValue = { isDemoMode: true, userRole: 'mentor', userStatus: 'active' };
vi.mock('../../../context/SessionContext', () => ({
  useSession: () => sessionValue,
}));

vi.mock('../../../lib/clientDemoStore', () => ({
  getAuditLog: vi.fn(() => []),
  getQueries: vi.fn(() => []),
}));

import BottomPanel from './BottomPanel';
import * as clientDemoStore from '../../../lib/clientDemoStore';

const baseProps = { studyId: 'demo-study-1', studies: [], isOpen: true, onClose: vi.fn(), height: 200, onResize: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  sessionValue = { isDemoMode: true, userRole: 'mentor', userStatus: 'active' };
  vi.mocked(clientDemoStore.getAuditLog).mockReturnValue([]);
  vi.mocked(clientDemoStore.getQueries).mockReturnValue([]);
});
afterEach(() => vi.unstubAllGlobals());

describe('BottomPanel', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<BottomPanel {...baseProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('AUDIT_VIEWER_ROLES (mentor) see Study Log/System Log tabs', () => {
    render(<BottomPanel {...baseProps} />);
    expect(screen.getByText('STUDY LOG')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM LOG')).toBeInTheDocument();
  });

  it('a role outside AUDIT_VIEWER_ROLES only sees Open Queries, defaulting to that tab', () => {
    sessionValue = { isDemoMode: true, userRole: 'site_coordinator', userStatus: 'active' };
    render(<BottomPanel {...baseProps} />);
    expect(screen.queryByText('STUDY LOG')).not.toBeInTheDocument();
    expect(screen.queryByText('SYSTEM LOG')).not.toBeInTheDocument();
    expect(screen.getByText('OPEN QUERIES')).toBeInTheDocument();
    expect(screen.getByText(/no open queries/i)).toBeInTheDocument();
  });

  it('defaults to the Story tab for an audit-viewer role, showing the empty-state message', () => {
    render(<BottomPanel {...baseProps} />);
    expect(screen.getByText(/nothing has happened in this study yet/i)).toBeInTheDocument();
  });

  it('demo mode: reads audit rows from clientDemoStore, not fetch', async () => {
    vi.mocked(clientDemoStore.getAuditLog).mockReturnValue([
      { id: 'AUD-1', occurred_at: '2026-07-11T00:00:00Z', actor_email: 'mentor@demo.com', action: 'INSERT', table_name: 'participants', reason: null },
    ] as any);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<BottomPanel {...baseProps} />);
    expect(await screen.findByText(/created/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows "No study selected." on the Story tab when studyId is null', () => {
    render(<BottomPanel {...baseProps} studyId={null} />);
    expect(screen.getByText('No study selected.')).toBeInTheDocument();
  });

  it('Open Queries: clicking a query row navigates to /queries', async () => {
    const user = userEvent.setup();
    vi.mocked(clientDemoStore.getQueries).mockReturnValue([
      { id: 1, status: 'open', severity: 'major', record_table: 'participants', record_id: 'P-1001', field_name: 'age' },
    ] as any);
    sessionValue = { isDemoMode: true, userRole: 'site_coordinator', userStatus: 'active' };
    render(<BottomPanel {...baseProps} />);
    await user.click(screen.getByText('OPEN QUERIES'));
    await user.click(screen.getByText(/Q-001/));
    expect(push).toHaveBeenCalledWith('/queries');
  });

  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BottomPanel {...baseProps} onClose={onClose} />);
    await user.click(screen.getByTitle('Close panel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dragging the resize handle up (smaller clientY) calls onResize with a larger height', () => {
    const onResize = vi.fn();
    const { container } = render(<BottomPanel {...baseProps} height={200} onResize={onResize} />);
    const handle = container.querySelector('[title="Drag to resize"]') as HTMLElement;

    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 500 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 400 })); // moved up 100px
    expect(onResize).toHaveBeenCalledWith(300); // 200 + 100

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });

  it('clamps the dragged height to MIN/MAX bounds', () => {
    const onResize = vi.fn();
    const { container } = render(<BottomPanel {...baseProps} height={200} onResize={onResize} />);
    const handle = container.querySelector('[title="Drag to resize"]') as HTMLElement;

    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 0 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 5000 })); // way down - shrink past MIN
    expect(onResize).toHaveBeenCalledWith(100); // MIN_PANEL_HEIGHT
  });
});
