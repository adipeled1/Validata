import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../lib/clientDemoStore', () => ({
  addSignature: vi.fn(),
}));

import EndorseDataModal from './EndorseDataModal';
import * as clientDemoStore from '../../../lib/clientDemoStore';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('EndorseDataModal', () => {
  it('Sign is disabled until a password is entered', () => {
    render(<EndorseDataModal studyId="s1" signerEmail="mentor@demo.com" isDemoMode onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^sign$/i })).toBeDisabled();
  });

  it('demo mode: records the signature via clientDemoStore, no network calls, then calls onSuccess', async () => {
    const user = userEvent.setup();
    vi.mocked(clientDemoStore.addSignature).mockReturnValue({ signed_at: '2026-07-11T00:00:00Z' } as any);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const onSuccess = vi.fn();

    render(<EndorseDataModal studyId="s1" signerEmail="mentor@demo.com" isDemoMode onClose={vi.fn()} onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText(/password/i), 'anything');
    await user.click(screen.getByRole('button', { name: /^sign$/i }));

    expect(clientDemoStore.addSignature).toHaveBeenCalledWith(expect.objectContaining({ studyId: 's1', signerEmail: 'mentor@demo.com', milestone: 'data_lock' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith('2026-07-11T00:00:00Z');
  });

  it('live mode: verifies credentials then records the signature using the returned signing token', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ signingToken: 'tok-1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ signed_at: '2026-07-11T00:00:00Z' }) });
    vi.stubGlobal('fetch', fetchMock);
    const onSuccess = vi.fn();

    render(<EndorseDataModal studyId="s1" signerEmail="mentor@live.com" onClose={vi.fn()} onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /^sign$/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/verify-credentials', expect.objectContaining({ method: 'POST' }));
    const sigCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(sigCallBody.signingToken).toBe('tok-1');
    expect(onSuccess).toHaveBeenCalledWith('2026-07-11T00:00:00Z');
  });

  it('live mode: shows the server error and does not call onSuccess when credential verification fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Invalid password.' }) }));
    const onSuccess = vi.fn();

    render(<EndorseDataModal studyId="s1" signerEmail="mentor@live.com" onClose={vi.fn()} onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /^sign$/i }));

    expect(await screen.findByText('Invalid password.')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EndorseDataModal studyId="s1" signerEmail="mentor@demo.com" isDemoMode onClose={onClose} onSuccess={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
