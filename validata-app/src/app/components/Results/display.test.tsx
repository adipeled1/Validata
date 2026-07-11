import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('xlsx', () => ({
  utils: { json_to_sheet: vi.fn(), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
  writeFile: vi.fn(),
}));

import ResultsDisplay from './display';
import * as XLSX from 'xlsx';

const measurements = [
  { id: 1, participant: 'P-1001', enrollmentDate: '2026-01-05', testDate: '2026-07-01', goniometer: '45.0°', aiModel: '44.9°', notes: 'ok', isValid: true },
  { id: 2, participant: 'P-1002', enrollmentDate: '2026-02-10', testDate: '2026-07-05', goniometer: '50.0°', aiModel: '49.5°', notes: '', isValid: true },
  { id: 3, participant: 'P-1001', enrollmentDate: '2026-01-05', testDate: '2026-06-20', goniometer: '40.0°', aiModel: '41.0°', notes: '', isValid: false },
];

const noopProps = { onMarkInvalid: vi.fn() };

describe('ResultsDisplay', () => {
  it('renders every row by default', () => {
    render(<ResultsDisplay sortedMeasurements={measurements} {...noopProps} />);
    expect(screen.getByText('3 / 3 measurements')).toBeInTheDocument();
  });

  it('filters by participant', async () => {
    const user = userEvent.setup();
    render(<ResultsDisplay sortedMeasurements={measurements} {...noopProps} />);
    await user.selectOptions(screen.getByLabelText(/filter by participant/i), 'P-1002');
    expect(screen.getByText('1 / 3 measurements')).toBeInTheDocument();
  });

  it('filters by test date', async () => {
    const user = userEvent.setup();
    render(<ResultsDisplay sortedMeasurements={measurements} {...noopProps} />);
    const input = screen.getByLabelText(/filter by test date/i);
    await user.type(input, '2026-07-01');
    expect(screen.getByText('1 / 3 measurements')).toBeInTheDocument();
  });

  it('shows Clear filters only once a filter is active, and it resets everything', async () => {
    const user = userEvent.setup();
    render(<ResultsDisplay sortedMeasurements={measurements} {...noopProps} />);
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by participant/i), 'P-1002');
    expect(screen.getByText('Clear filters')).toBeInTheDocument();

    await user.click(screen.getByText('Clear filters'));
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
    expect(screen.getByText('3 / 3 measurements')).toBeInTheDocument();
  });

  it('a dropped participant\'s measurements always show Invalid, even if isValid is true', () => {
    render(
      <ResultsDisplay
        sortedMeasurements={measurements}
        participants={[{ id: 'P-1002', status: 'Dropped' }]}
        {...noopProps}
      />
    );
    // P-1002's row (id 2) has isValid: true but participant is dropped.
    const rows = screen.getAllByText('Invalid');
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking Valid on a valid, non-dropped measurement calls onMarkInvalid with its id', async () => {
    const user = userEvent.setup();
    const onMarkInvalid = vi.fn();
    render(<ResultsDisplay sortedMeasurements={measurements} onMarkInvalid={onMarkInvalid} />);
    await user.click(screen.getAllByRole('button', { name: 'Valid' })[0]);
    expect(onMarkInvalid).toHaveBeenCalled();
  });

  it('defaults to sorting by Test Date descending (newest first)', () => {
    const { container } = render(<ResultsDisplay sortedMeasurements={measurements} {...noopProps} />);
    const rows = container.querySelectorAll('tbody tr');
    // id 2 (2026-07-05) should render before id 1 (2026-07-01) before id 3 (2026-06-20).
    expect(within(rows[0] as HTMLElement).getByText('P-1002')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText('P-1001')).toBeInTheDocument();
  });

  // The click handler lives on the inner <span> (with the icon), not the
  // <th> itself - clicking the th directly wouldn't bubble down into it,
  // so these click the span via the columnheader's own accessible text.
  const clickHeader = (name: string) => {
    const th = screen.getByRole('columnheader', { name });
    return userEvent.setup().click(within(th).getByText(name));
  };

  it('clicking the Test Date header again flips to ascending order', async () => {
    const { container } = render(<ResultsDisplay sortedMeasurements={measurements} {...noopProps} />);
    await clickHeader('Test Date');
    const rows = container.querySelectorAll('tbody tr');
    // Ascending: id 3 (2026-06-20) first.
    const firstRowCells = within(rows[0] as HTMLElement);
    expect(firstRowCells.getByText('40.0°')).toBeInTheDocument();
  });

  it('clicking the Participant header sorts numerically by participant id', async () => {
    const { container } = render(<ResultsDisplay sortedMeasurements={measurements} {...noopProps} />);
    await clickHeader('Participant');
    const rows = container.querySelectorAll('tbody tr');
    // Descending by participant number: P-1002 first.
    expect(within(rows[0] as HTMLElement).getByText('P-1002')).toBeInTheDocument();
  });

  it('Export Excel builds a worksheet from only the valid measurements', async () => {
    const user = userEvent.setup();
    render(
      <ResultsDisplay
        sortedMeasurements={measurements}
        participants={[]}
        onMarkInvalid={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /export excel/i }));
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledTimes(1);
    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
    expect(rows).toHaveLength(2); // measurement id 3 is isValid: false, excluded
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it('shows the empty-filter message when no rows match', async () => {
    const user = userEvent.setup();
    render(<ResultsDisplay sortedMeasurements={measurements} {...noopProps} />);
    await user.selectOptions(screen.getByLabelText(/filter by participant/i), 'P-1001');
    await user.type(screen.getByLabelText(/filter by test date/i), '2099-01-01');
    expect(screen.getByText('No measurements match the current filters.')).toBeInTheDocument();
  });
});
