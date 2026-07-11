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

    // Now the form fields are visible; use placeholder text since labels lack htmlFor
    await user.type(screen.getByPlaceholderText(/e\.g\. 35/i), '35');

    // Gender and Health Status are selects — find by their current displayed value
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'Female'); // Gender select
    await user.selectOptions(selects[1], 'Healthy'); // Health Status select

    // Submit via the submit button inside the panel
    const addButtons = screen.getAllByRole('button', { name: /add participant/i });
    await user.click(addButtons[addButtons.length - 1]);

    expect(onAddParticipant).toHaveBeenCalledTimes(1);
    const payload = onAddParticipant.mock.calls[0][0];
    expect(payload.age).toBe('35');
    expect(payload.enrollmentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
