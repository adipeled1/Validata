import { describe, it, expect, vi } from 'vitest';
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
    timestamp: '12/05/2026 14:30 UTC',
    testDate: '2026-05-12',
    isValid: true,
  },
];
const participants = [{ id: 'P-1001', status: 'Active' }];

describe('ResultsControl (view results golden path)', () => {
  it('renders measurements for the participant', () => {
    render(<ResultsControl participants={participants} measurements={measurements} onMarkInvalid={vi.fn()} />);
    expect(screen.getAllByText('P-1001').length).toBeGreaterThan(0);
  });

  it('opens a reason-capture modal when marking a measurement invalid (ICH E6(R3) COR-01)', async () => {
    const user = userEvent.setup();
    const onMarkInvalid = vi.fn();
    render(<ResultsControl participants={participants} measurements={measurements} onMarkInvalid={onMarkInvalid} />);

    // Click the valid/invalid toggle — now opens ConfirmWithReasonModal (no window.confirm)
    const [validButton] = screen.getAllByRole('button', { name: /valid/i });
    await user.click(validButton);

    // Modal is displayed — textarea has placeholder "Required"
    const reasonTextarea = screen.getByPlaceholderText('Required');
    await user.type(reasonTextarea, 'outlier data point');

    // Click the confirm button (confirmLabel is "Mark Invalid")
    const confirmBtn = screen.getByRole('button', { name: /mark invalid/i });
    await user.click(confirmBtn);

    // onMarkInvalid called with (id, reason) — 2 arguments per ICH E6(R3) COR-01
    expect(onMarkInvalid).toHaveBeenCalledTimes(1);
    expect(onMarkInvalid.mock.calls[0][0]).toBe(1);
    expect(onMarkInvalid.mock.calls[0][1]).toBe('outlier data point');
  });
});
