import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmWithReasonModal from './ConfirmWithReasonModal';

describe('ConfirmWithReasonModal', () => {
  it('renders title, body, and reasonLabel', () => {
    render(<ConfirmWithReasonModal title="Delete User" body="This can be undone." reasonLabel="Reason" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Delete User')).toBeInTheDocument();
    expect(screen.getByText('This can be undone.')).toBeInTheDocument();
    expect(screen.getByText('Reason')).toBeInTheDocument();
  });

  it('Confirm is enabled by default (reasonRequired defaults to false)', () => {
    render(<ConfirmWithReasonModal title="t" body="b" reasonLabel="r" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('when reasonRequired, Confirm is disabled until text is typed', async () => {
    const user = userEvent.setup();
    render(<ConfirmWithReasonModal title="t" body="b" reasonLabel="r" reasonRequired onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Required'), 'because reasons');
    expect(confirmBtn).toBeEnabled();
  });

  it('calls onConfirm with the trimmed reason text', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmWithReasonModal title="t" body="b" reasonLabel="r" onConfirm={onConfirm} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Optional'), '  trimmed reason  ');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledWith('trimmed reason');
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmWithReasonModal title="t" body="b" reasonLabel="r" onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses the custom confirmLabel when given', () => {
    render(<ConfirmWithReasonModal title="t" body="b" reasonLabel="r" confirmLabel="Reject Applicant" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Reject Applicant' })).toBeInTheDocument();
  });
});
