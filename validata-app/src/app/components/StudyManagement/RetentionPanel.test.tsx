import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import RetentionPanel from './RetentionPanel';

// Every test reuses the same SWR key ('deleted-studies') - without a fresh
// cache provider per render, the second test would see the first test's
// cached (stale) response instead of its own fetch mock's data.
function renderPanel() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <RetentionPanel />
    </SWRConfig>
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('RetentionPanel', () => {
  it('renders nothing when there are no deleted studies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    const { container } = renderPanel();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('lists each deleted study, flagging a retention hold when set', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 's1', name: 'Held Study', deleted_at: '2026-01-01', retention_hold: true, created_at: '2025-01-01' },
        { id: 's2', name: 'Free Study', deleted_at: '2026-01-01', retention_hold: false, created_at: '2025-01-01' },
      ],
    }));
    renderPanel();
    expect(await screen.findByText(/Held Study/)).toBeInTheDocument();
    expect(screen.getByText('(retention hold)')).toBeInTheDocument();
    expect(screen.getByText(/Free Study/)).toBeInTheDocument();
  });

  it('prompts for a reason and POSTs a destruction request, showing the server response', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('window', Object.assign(window, { prompt: vi.fn(() => 'No longer needed') }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 's1', name: 'Free Study', deleted_at: '2026-01-01', retention_hold: false, created_at: '2025-01-01' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Destruction request submitted.' }) });
    vi.stubGlobal('fetch', fetchMock);

    renderPanel();
    await screen.findByText(/Free Study/);
    await user.click(screen.getByRole('button', { name: /request destruction/i }));

    expect(await screen.findByText('Destruction request submitted.')).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body).toEqual({ studyId: 's1', reason: 'No longer needed' });
  });

  it('does not submit a destruction request when the prompt is cancelled (empty reason)', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('window', Object.assign(window, { prompt: vi.fn(() => null) }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 's1', name: 'Free Study', deleted_at: '2026-01-01', retention_hold: false, created_at: '2025-01-01' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPanel();
    await screen.findByText(/Free Study/);
    await user.click(screen.getByRole('button', { name: /request destruction/i }));
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the initial GET, no POST
  });
});
