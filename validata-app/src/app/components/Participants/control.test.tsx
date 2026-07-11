import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParticipantsControl from './control';

describe('ParticipantsControl (add participant golden path)', () => {
  it('opens the InlinePanel and submits the registration form', async () => {
    const user = userEvent.setup();
    const onAddParticipant = vi.fn();

    render(
      <ParticipantsControl
        participants={[]}
        onAddParticipant={onAddParticipant}
        onDropParticipant={vi.fn()}
        onToggleParticipantCompleted={vi.fn()}
        recruitmentGoal={50}
        onUpdateRecruitmentGoal={vi.fn()}
        userRole="team_member"
        consentVersions={[]}
        consentRecords={[]}
        onRecordConsent={vi.fn()}
      />
    );

    // The form is inside an InlinePanel — open it by clicking the trigger
    await user.click(screen.getByRole('button', { name: /\+ add participant/i }));

    // Every panel field has a real <label htmlFor>, so query by accessible
    // label/name instead of positional index - the page also renders its own
    // filter selects (status/gender) outside the panel, so `getAllByRole('combobox')[0]`
    // is order-dependent and silently breaks if anything shifts render order.
    await user.type(screen.getByLabelText(/^age$/i), '35');
    await user.selectOptions(screen.getByLabelText(/^gender$/i), 'Female');
    await user.selectOptions(screen.getByLabelText(/^health status$/i), 'Healthy');

    // Submit via the submit button inside the panel
    const addButtons = screen.getAllByRole('button', { name: /add participant/i });
    await user.click(addButtons[addButtons.length - 1]);

    expect(onAddParticipant).toHaveBeenCalledTimes(1);
    const payload = onAddParticipant.mock.calls[0][0];
    expect(payload.age).toBe('35');
    expect(payload.enrollmentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
