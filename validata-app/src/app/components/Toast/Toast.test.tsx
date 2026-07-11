import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  it('renders the message text', () => {
    render(<Toast message="Saved!" show onHide={vi.fn()} />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('auto-hides after 3 seconds by calling onHide', () => {
    vi.useFakeTimers();
    const onHide = vi.fn();
    render(<Toast message="Saved!" show onHide={onHide} />);

    vi.advanceTimersByTime(2999);
    expect(onHide).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onHide).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does not schedule a hide timer when show is false', () => {
    vi.useFakeTimers();
    const onHide = vi.fn();
    render(<Toast message="Saved!" show={false} onHide={onHide} />);
    vi.advanceTimersByTime(5000);
    expect(onHide).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
