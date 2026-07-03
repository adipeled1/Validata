import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultsControl from './control';

const measurements = [
  {
    id: 1,
    participant: 'P-1001',
    goniometer: '45.0°',
    aiModel: '44.9°',
    notes: 'ok',
    timestamp: '12/05/2026 14:30',
    testDate: '2026-05-12',
    isValid: true,
  },
];
const participants = [{ id: 'P-1001', status: 'Active' }];

describe('ResultsControl (view results golden path)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders measurements for the participant', () => {
    render(<ResultsControl participants={participants} measurements={measurements} onMarkInvalid={vi.fn()} />);
    expect(screen.getAllByText('P-1001').length).toBeGreaterThan(0);
  });

  it('marks a valid measurement invalid after confirmation', async () => {
    const user = userEvent.setup();
    const onMarkInvalid = vi.fn();
    render(<ResultsControl participants={participants} measurements={measurements} onMarkInvalid={onMarkInvalid} />);

    const [validButton] = screen.getAllByRole('button', { name: /valid/i });
    await user.click(validButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(onMarkInvalid).toHaveBeenCalledWith(1);
  });
});
