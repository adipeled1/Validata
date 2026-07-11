import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DelegationForm, { type DelegationFormValues } from './DelegationForm';

const EMPTY_FORM: DelegationFormValues = { delegatedTo: '', taskDescription: '', effectiveFrom: '', effectiveTo: '' };
const ROSTER = [{ id: 'u1', email: 'investigator@demo.com', role: 'investigator' }];

describe('DelegationForm', () => {
  it('disables Save Delegation until delegatedTo, taskDescription, and effectiveFrom are all set', () => {
    render(<DelegationForm roster={ROSTER} form={EMPTY_FORM} onChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} saving={false} />);
    expect(screen.getByRole('button', { name: /save delegation/i })).toBeDisabled();
  });

  it('effectiveTo is optional - Save enables without it', () => {
    const filled: DelegationFormValues = { delegatedTo: 'u1', taskDescription: 'Review data', effectiveFrom: '2026-07-11', effectiveTo: '' };
    render(<DelegationForm roster={ROSTER} form={filled} onChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} saving={false} />);
    expect(screen.getByRole('button', { name: /save delegation/i })).toBeEnabled();
  });

  it('disables Save while saving', () => {
    const filled: DelegationFormValues = { delegatedTo: 'u1', taskDescription: 'Review data', effectiveFrom: '2026-07-11', effectiveTo: '' };
    render(<DelegationForm roster={ROSTER} form={filled} onChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} saving={true} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('calls onSubmit / onCancel on their respective buttons', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const filled: DelegationFormValues = { delegatedTo: 'u1', taskDescription: 'Review data', effectiveFrom: '2026-07-11', effectiveTo: '' };
    render(<DelegationForm roster={ROSTER} form={filled} onChange={vi.fn()} onSubmit={onSubmit} onCancel={onCancel} saving={false} />);

    await user.click(screen.getByRole('button', { name: /save delegation/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('displays an error banner when set', () => {
    render(<DelegationForm roster={ROSTER} form={EMPTY_FORM} onChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} saving={false} error="Something failed." />);
    expect(screen.getByText('Something failed.')).toBeInTheDocument();
  });

  it('formats each roster entry as "email (role)" with underscores replaced by spaces', () => {
    render(<DelegationForm roster={[{ id: 'u2', email: 'site@demo.com', role: 'site_coordinator' }]} form={EMPTY_FORM} onChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} saving={false} />);
    expect(screen.getByText('site@demo.com (site coordinator)')).toBeInTheDocument();
  });
});
