import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('xlsx', () => ({
  utils: { aoa_to_sheet: vi.fn(), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
  writeFile: vi.fn(),
}));

import DataCollectionDisplay from './display';
import * as XLSX from 'xlsx';

const baseProps = {
  activeParticipants: [{ id: 'P-1001' }],
  participantId: '',
  onParticipantChange: vi.fn(),
  goniometer: '',
  onGoniometerChange: vi.fn(),
  aiModel: '',
  onAiModelChange: vi.fn(),
  notes: '',
  onNotesChange: vi.fn(),
  testDate: '',
  onTestDateChange: vi.fn(),
  onSubmitLog: vi.fn(),
  uploadedFile: null,
  onFileChange: vi.fn(),
  fileInputRef: { current: null },
  isDragging: false,
  onDragOver: vi.fn(),
  onDragLeave: vi.fn(),
  onDrop: vi.fn(),
  isImporting: false,
  importSummary: null,
  onClearImportSummary: vi.fn(),
};

afterEach(() => vi.clearAllMocks());

describe('DataCollectionDisplay', () => {
  it('shows the drop-zone prompt by default (no import in progress or summary)', () => {
    render(<DataCollectionDisplay {...baseProps} />);
    expect(screen.getByText(/click or drag and drop/i)).toBeInTheDocument();
  });

  it('shows a spinner while importing, hiding the drop zone', () => {
    render(<DataCollectionDisplay {...baseProps} isImporting />);
    expect(screen.getByText(/processing and importing file/i)).toBeInTheDocument();
    expect(screen.queryByText(/click or drag and drop/i)).not.toBeInTheDocument();
  });

  it('shows a success summary with no error styling when errorCount is 0', () => {
    render(<DataCollectionDisplay {...baseProps} importSummary={{ successCount: 10, errorCount: 0, errors: [] }} />);
    expect(screen.getByText('Import Complete')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.queryByText(/skipped/i)).not.toBeInTheDocument();
  });

  it('shows skipped-row count and the error list when errorCount > 0', () => {
    render(
      <DataCollectionDisplay
        {...baseProps}
        importSummary={{ successCount: 8, errorCount: 2, errors: ['Row 3: missing participant_id', 'Row 9: invalid date'] }}
      />
    );
    expect(screen.getByText(/skipped/i)).toBeInTheDocument();
    expect(screen.getByText(/Row 3: missing participant_id/)).toBeInTheDocument();
    expect(screen.getByText(/Row 9: invalid date/)).toBeInTheDocument();
  });

  it('"Import Another File" calls onClearImportSummary', async () => {
    const user = userEvent.setup();
    const onClearImportSummary = vi.fn();
    render(
      <DataCollectionDisplay
        {...baseProps}
        importSummary={{ successCount: 1, errorCount: 0, errors: [] }}
        onClearImportSummary={onClearImportSummary}
      />
    );
    await user.click(screen.getByRole('button', { name: /import another file/i }));
    expect(onClearImportSummary).toHaveBeenCalledTimes(1);
  });

  it('changes the drop-zone prompt/border while isDragging', () => {
    const { rerender } = render(<DataCollectionDisplay {...baseProps} />);
    expect(screen.getByText(/click or drag and drop/i)).toBeInTheDocument();
    rerender(<DataCollectionDisplay {...baseProps} isDragging />);
    expect(screen.getByText(/drop the file here/i)).toBeInTheDocument();
  });

  it('Download Template builds and writes an xlsx file', async () => {
    const user = userEvent.setup();
    render(<DataCollectionDisplay {...baseProps} />);
    await user.click(screen.getByRole('button', { name: /download template/i }));
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ['participant_id', 'goniometer', 'ai_model', 'test_date', 'notes'],
    ]);
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'validata-import-template.xlsx');
  });
});
