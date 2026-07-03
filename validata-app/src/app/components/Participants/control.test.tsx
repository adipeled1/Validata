import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParticipantsControl from './control';

describe('ParticipantsControl (add participant golden path)', () => {
  it('submits the registration form with the entered fields', async () => {
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
      />
    );

    await user.type(screen.getByLabelText('Age'), '35');
    await user.selectOptions(screen.getByLabelText('Gender'), 'Female');
    await user.selectOptions(screen.getByLabelText('Health Status'), 'Healthy');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /add participant/i }));

    expect(onAddParticipant).toHaveBeenCalledTimes(1);
    const payload = onAddParticipant.mock.calls[0][0];
    expect(payload.age).toBe('35');
    expect(payload.gender).toBe('Female');
    expect(payload.healthStatus).toBe('Healthy');
    expect(payload.consent).toBe(true);
    expect(payload.enrollmentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
