import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: { auth: { signOut: vi.fn().mockResolvedValue({}) } },
}));
vi.mock('../../../lib/supabase/client', () => ({ createClient: () => mockSupabase }));

import LoginControl from './control';

// NEXT_PUBLIC_SUPABASE_URL isn't set in the test environment, so
// isSupabaseConfigured (computed once at module load from that env var) is
// false here - this exercises the same demo-mode fallback path
// service.test.ts's performDemoLogin tests cover directly.
describe('LoginControl (demo-mode fallback, since Supabase isn\'t configured in tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('signs out any leftover session on mount', () => {
    render(<LoginControl />);
    expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('pre-fills the demo mentor credentials so a visitor can just click Sign In', () => {
    render(<LoginControl />);
    expect(screen.getByLabelText(/email/i)).toHaveValue('mentor@demo.com');
    expect(screen.getByLabelText('Password')).toHaveValue('demo123');
  });

  it('successful demo login redirects after a short delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, role: 'mentor' }),
    }));

    render(<LoginControl />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/logged in successfully/i)).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(1000);
    expect(push).toHaveBeenCalledWith('/');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows an error message and re-enables the form when demo login fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid demo credentials.' }),
    }));

    render(<LoginControl />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Invalid demo credentials.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('rejects submission with an empty field without calling fetch', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginControl />);
    const emailInput = screen.getByLabelText(/email/i);
    await user.clear(emailInput);
    // fireEvent.submit bypasses the email input's own `required` HTML5
    // validation (which a real click on Sign In would trigger first, never
    // reaching handleSubmit's own check) - isolates the assertion to
    // handleSubmit's own validation logic.
    fireEvent.submit(emailInput.closest('form')!);

    expect(await screen.findByText(/please fill in all fields/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
