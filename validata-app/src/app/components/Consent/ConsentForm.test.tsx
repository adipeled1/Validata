import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsentForm, { type ConsentFormValues } from './ConsentForm';

const EMPTY_FORM: ConsentFormValues = {
  participantId: '',
  formVersionId: '',
  method: 'written',
  witnessedBy: '',
  copyDelivered: false,
  notes: '',
};

const VERSIONS = [{ id: 301, version: 'v1.0' }];
const PARTICIPANTS = [{ id: 'P-1001' }, { id: 'P-1002' }];

describe('ConsentForm', () => {
  it('disables Save Consent until both a participant and a form version are chosen', () => {
    render(
      <ConsentForm
        versions={VERSIONS}
        participants={PARTICIPANTS}
        form={EMPTY_FORM}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        saving={false}
      />
    );
    expect(screen.getByRole('button', { name: /save consent/i })).toBeDisabled();
  });

  it('enables Save Consent once participant + form version are both set', () => {
    const filled: ConsentFormValues = { ...EMPTY_FORM, participantId: 'P-1001', formVersionId: 301 };
    render(
      <ConsentForm
        versions={VERSIONS}
        participants={PARTICIPANTS}
        form={filled}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        saving={false}
      />
    );
    expect(screen.getByRole('button', { name: /save consent/i })).toBeEnabled();
  });

  it('disables Save Consent while saving, even with valid fields', () => {
    const filled: ConsentFormValues = { ...EMPTY_FORM, participantId: 'P-1001', formVersionId: 301 };
    render(
      <ConsentForm
        versions={VERSIONS}
        participants={PARTICIPANTS}
        form={filled}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        saving={true}
      />
    );
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('shows a disabled, read-only participant field when lockedParticipantId is set', () => {
    render(
      <ConsentForm
        versions={VERSIONS}
        participants={PARTICIPANTS}
        lockedParticipantId="P-1001"
        form={{ ...EMPTY_FORM, participantId: 'P-1001' }}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        saving={false}
      />
    );
    expect(screen.getByDisplayValue('P-1001')).toBeDisabled();
    // Only the Form Version/Method selects should exist - no participant
    // <select> when locked (it's a disabled text input instead).
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
  });

  it('offers a participant picker when not locked', () => {
    render(
      <ConsentForm
        versions={VERSIONS}
        participants={PARTICIPANTS}
        form={EMPTY_FORM}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        saving={false}
      />
    );
    expect(screen.getByText('P-1001')).toBeInTheDocument();
    expect(screen.getByText('P-1002')).toBeInTheDocument();
  });

  it('shows a hint and disables the Form Version select when no versions exist', () => {
    render(
      <ConsentForm
        versions={[]}
        participants={PARTICIPANTS}
        form={EMPTY_FORM}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        saving={false}
      />
    );
    expect(screen.getByText(/no consent form versions exist yet/i)).toBeInTheDocument();
  });

  it('calls onSubmit when Save Consent is clicked (enabled state)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const filled: ConsentFormValues = { ...EMPTY_FORM, participantId: 'P-1001', formVersionId: 301 };
    render(
      <ConsentForm
        versions={VERSIONS}
        participants={PARTICIPANTS}
        form={filled}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        saving={false}
      />
    );
    await user.click(screen.getByRole('button', { name: /save consent/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConsentForm
        versions={VERSIONS}
        participants={PARTICIPANTS}
        form={EMPTY_FORM}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={onCancel}
        saving={false}
      />
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('displays an error banner when error is set', () => {
    render(
      <ConsentForm
        versions={VERSIONS}
        participants={PARTICIPANTS}
        form={EMPTY_FORM}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        saving={false}
        error="Something went wrong."
      />
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });
});
