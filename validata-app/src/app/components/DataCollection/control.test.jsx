import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataCollectionControl from './control';

const activeParticipant = { id: 'P-1001', status: 'Active' };

describe('DataCollectionControl (log measurement golden path)', () => {
  it('submits a measurement for the selected active participant', async () => {
    const user = userEvent.setup();
    const onLogMeasurement = vi.fn();

    render(
      <DataCollectionControl
        participants={[activeParticipant]}
        onLogMeasurement={onLogMeasurement}
        onFileUpload={vi.fn()}
        isImporting={false}
        importSummary={null}
        onClearImportSummary={vi.fn()}
      />
    );

    await user.selectOptions(screen.getByRole('combobox'), 'P-1001');
    await user.type(screen.getByPlaceholderText('e.g. 45°'), '45');
    await user.type(screen.getByPlaceholderText('e.g. 44.8°'), '44.9');
    await user.click(screen.getByRole('button', { name: /log measurement/i }));

    expect(onLogMeasurement).toHaveBeenCalledTimes(1);
    const payload = onLogMeasurement.mock.calls[0][0];
    expect(payload.participantId).toBe('P-1001');
    expect(payload.goniometer).toBe('45');
    expect(payload.aiModel).toBe('44.9');
  });

  it('does not submit when no participant is selected', async () => {
    const user = userEvent.setup();
    const onLogMeasurement = vi.fn();

    render(
      <DataCollectionControl
        participants={[activeParticipant]}
        onLogMeasurement={onLogMeasurement}
        onFileUpload={vi.fn()}
        isImporting={false}
        importSummary={null}
        onClearImportSummary={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /log measurement/i }));
    expect(onLogMeasurement).not.toHaveBeenCalled();
  });
});
