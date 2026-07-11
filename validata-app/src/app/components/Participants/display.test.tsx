import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParticipantsDisplay from './display';

const participants = [
  { id: 'P-1001', status: 'active', age: 30, gender: 'Female', healthStatus: 'Healthy', enrollmentDateDisplay: '01/01/2026' },
  { id: 'P-1002', status: 'completed', age: 40, gender: 'Male', healthStatus: 'Ankle Injured', enrollmentDateDisplay: '02/01/2026' },
  { id: 'P-1003', status: 'dropped', age: 50, gender: 'Female', healthStatus: 'Healthy', enrollmentDateDisplay: '03/01/2026' },
];

const baseProps = {
  participants,
  age: '',
  onAgeChange: vi.fn(),
  gender: 'Male',
  onGenderChange: vi.fn(),
  healthStatus: 'Healthy',
  onHealthStatusChange: vi.fn(),
  onSubmit: vi.fn(async () => undefined),
  onDrop: vi.fn(),
  onToggleCompleted: vi.fn(),
  recruitedCount: 2,
  recruitmentGoal: 10,
  isMentor: false,
  goalInput: '',
  onGoalInputChange: vi.fn(),
  onGoalSubmit: vi.fn(),
  consentVersions: [{ id: 301, version: 'v1.0' }],
  consentRecords: [],
  canRecordConsent: true,
  onRecordConsent: vi.fn(async () => undefined),
};

describe('ParticipantsDisplay', () => {
  it('renders every participant by default', () => {
    render(<ParticipantsDisplay {...baseProps} />);
    expect(screen.getByText('P-1001')).toBeInTheDocument();
    expect(screen.getByText('P-1002')).toBeInTheDocument();
    expect(screen.getByText('P-1003')).toBeInTheDocument();
  });

  it('search filters by id', async () => {
    const user = userEvent.setup();
    render(<ParticipantsDisplay {...baseProps} />);
    await user.type(screen.getByPlaceholderText(/search by id/i), '1002');
    expect(screen.queryByText('P-1001')).not.toBeInTheDocument();
    expect(screen.getByText('P-1002')).toBeInTheDocument();
  });

  it('status filter narrows to the selected status', async () => {
    const user = userEvent.setup();
    render(<ParticipantsDisplay {...baseProps} />);
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects.find((s) => within(s).queryByText('All statuses'))!;
    await user.selectOptions(statusSelect, 'dropped');
    expect(screen.getByText('P-1003')).toBeInTheDocument();
    expect(screen.queryByText('P-1001')).not.toBeInTheDocument();
  });

  it('shows "Clear filters" only once a filter is active', async () => {
    const user = userEvent.setup();
    render(<ParticipantsDisplay {...baseProps} />);
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/search by id/i), 'P-1001');
    expect(screen.getByText('Clear filters')).toBeInTheDocument();
    await user.click(screen.getByText('Clear filters'));
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });

  it('dropped participants show "Dropped" instead of action buttons', () => {
    render(<ParticipantsDisplay {...baseProps} />);
    const row = screen.getByText('P-1003').closest('tr')!;
    expect(within(row).getByText('Dropped')).toBeInTheDocument();
    expect(within(row).queryByText('Drop')).not.toBeInTheDocument();
  });

  it('Mark Complete calls onToggleCompleted with the row id', async () => {
    const user = userEvent.setup();
    const onToggleCompleted = vi.fn();
    render(<ParticipantsDisplay {...baseProps} onToggleCompleted={onToggleCompleted} />);
    const row = screen.getByText('P-1001').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /mark complete/i }));
    expect(onToggleCompleted).toHaveBeenCalledWith('P-1001');
  });

  it('Drop calls onDrop with the row id', async () => {
    const user = userEvent.setup();
    const onDrop = vi.fn();
    render(<ParticipantsDisplay {...baseProps} onDrop={onDrop} />);
    const row = screen.getByText('P-1001').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Drop' }));
    expect(onDrop).toHaveBeenCalledWith('P-1001');
  });

  it('shows "Consent on file" indicator only for participants with a record', () => {
    render(
      <ParticipantsDisplay
        {...baseProps}
        consentRecords={[{ id: 'CR-1', participant_id: 'P-1001', form_version_id: 301, method: 'written', copy_delivered: true, witnessed_by: null, notes: null, created_at: '2026-07-01T00:00:00Z' }]}
      />
    );
    const consentedRow = screen.getByText('P-1001').closest('tr')!;
    const unconsentedRow = screen.getByText('P-1002').closest('tr')!;
    expect(within(consentedRow).getByText(/on file/)).toBeInTheDocument();
    expect(within(unconsentedRow).getByText('—')).toBeInTheDocument();
  });

  it('does not show a "Record Consent" button when canRecordConsent is false', () => {
    render(<ParticipantsDisplay {...baseProps} canRecordConsent={false} />);
    expect(screen.queryByText('Record Consent')).not.toBeInTheDocument();
  });

  it('opens the Record Consent panel locked to the clicked row\'s participant, and submits through onRecordConsent', async () => {
    const user = userEvent.setup();
    const onRecordConsent = vi.fn(async () => undefined);
    render(<ParticipantsDisplay {...baseProps} onRecordConsent={onRecordConsent} />);

    const row = screen.getByText('P-1001').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /record consent/i }));

    const panelTitle = screen.getByText('Record Consent', { selector: 'span' }); // panel title
    expect(panelTitle).toBeInTheDocument();
    expect(screen.getByDisplayValue('P-1001')).toBeDisabled(); // locked participant field

    // Scope to the panel: since Participant is locked (a disabled input, not
    // a select), the first <select> inside the panel is Form Version.
    const panel = panelTitle.closest('div')!.parentElement!;
    await user.selectOptions(within(panel).getAllByRole('combobox')[0], '301');
    await user.click(within(panel).getByRole('button', { name: /save consent/i }));

    expect(onRecordConsent).toHaveBeenCalledWith(expect.objectContaining({ participantId: 'P-1001', formVersionId: 301 }));
  });

  it('goal-setting form is only shown to a mentor', () => {
    const { rerender } = render(<ParticipantsDisplay {...baseProps} isMentor={false} />);
    expect(screen.queryByText('Set Goal')).not.toBeInTheDocument();
    rerender(<ParticipantsDisplay {...baseProps} isMentor />);
    expect(screen.getByText('Set Goal')).toBeInTheDocument();
  });

  it('opens Add Participant and submits through onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => 'P-9999');
    render(<ParticipantsDisplay {...baseProps} age="35" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /\+ add participant/i }));
    await user.click(screen.getByRole('button', { name: /^add participant$/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
