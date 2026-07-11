import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import CommandPalette from './CommandPalette';

describe('CommandPalette', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<CommandPalette isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('lists every nav command when open with an empty query', () => {
    render(<CommandPalette isOpen onClose={vi.fn()} />);
    expect(screen.getByText('Participant Registry')).toBeInTheDocument();
    expect(screen.getByText('User Registry')).toBeInTheDocument();
  });

  it('filters commands by label as you type', async () => {
    const user = userEvent.setup();
    render(<CommandPalette isOpen onClose={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/navigate to/i), 'consent');
    expect(screen.getByText('Consent Records')).toBeInTheDocument();
    expect(screen.queryByText('User Registry')).not.toBeInTheDocument();
  });

  it('filters commands by description too', async () => {
    const user = userEvent.setup();
    render(<CommandPalette isOpen onClose={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/navigate to/i), 'compliance');
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    expect(screen.queryByText('Participant Registry')).not.toBeInTheDocument();
  });

  it('shows "No results." for a query matching nothing', async () => {
    const user = userEvent.setup();
    render(<CommandPalette isOpen onClose={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/navigate to/i), 'zzzzzz');
    expect(screen.getByText('No results.')).toBeInTheDocument();
  });

  it('clicking a nav command navigates via router.push and closes the palette', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommandPalette isOpen onClose={onClose} />);
    await user.click(screen.getByText('Consent Records'));
    expect(push).toHaveBeenCalledWith('/consent-records');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lists studies as "Switch to: <name>" and clicking one calls onSwitchStudy', async () => {
    const user = userEvent.setup();
    const onSwitchStudy = vi.fn();
    render(<CommandPalette isOpen onClose={vi.fn()} studies={[{ id: 's1', name: 'Study One' }]} onSwitchStudy={onSwitchStudy} />);
    await user.click(screen.getByText('Switch to: Study One'));
    expect(onSwitchStudy).toHaveBeenCalledWith('s1');
  });

  it('Escape calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommandPalette isOpen onClose={onClose} />);
    await user.type(screen.getByPlaceholderText(/navigate to/i), '{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Enter activates the currently-selected (first) command', async () => {
    const user = userEvent.setup();
    render(<CommandPalette isOpen onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText(/navigate to/i);
    await user.type(input, 'consent');
    await user.type(input, '{Enter}');
    expect(push).toHaveBeenCalledWith('/consent-records');
  });

  it('clicking the backdrop calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<CommandPalette isOpen onClose={onClose} />);
    await user.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
