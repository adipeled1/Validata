import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataGrid from './DataGrid';

const columns = [
  { key: 'id', label: 'ID', width: '100px' },
  { key: 'name', label: 'Name', width: '200px' },
  { key: 'notes', label: 'Notes' }, // no width - falls back to 150px in the minWidth sum
];

const rows = [
  { id: '1', name: 'Alice', notes: 'a' },
  { id: '2', name: 'Bob', notes: 'b' },
];

describe('DataGrid', () => {
  it('sets a real min-width (sum of column widths, unspecified ones default to 150px) with table-layout: fixed', () => {
    const { container } = render(<DataGrid columns={columns} rows={rows} keyField="id" />);
    const table = container.querySelector('table')!;
    expect(table.style.minWidth).toBe('450px'); // 100 + 200 + 150
    expect(table.style.tableLayout).toBe('fixed');
  });

  it('includes the checkbox (30px) and actions (48px) columns in min-width when those features are enabled', () => {
    const { container } = render(
      <DataGrid
        columns={columns}
        rows={rows}
        keyField="id"
        selectedKeys={new Set()}
        onSelectChange={vi.fn()}
        onRowContextMenu={vi.fn()}
      />
    );
    const table = container.querySelector('table')!;
    expect(table.style.minWidth).toBe('528px'); // 450 + 30 + 48
  });

  it('applies reserveRight as paddingRight on the scroll container, and omits it when 0', () => {
    const { container: withReserve } = render(<DataGrid columns={columns} rows={rows} keyField="id" reserveRight={360} />);
    expect((withReserve.firstChild as HTMLElement).style.paddingRight).toBe('360px');

    const { container: noReserve } = render(<DataGrid columns={columns} rows={rows} keyField="id" reserveRight={0} />);
    expect((noReserve.firstChild as HTMLElement).style.paddingRight).toBe('');
  });

  it('renders the empty message when there are no rows', () => {
    render(<DataGrid columns={columns} rows={[]} keyField="id" emptyMessage="Nothing here." />);
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  it('shows a loading indicator instead of the table body when loading', () => {
    render(<DataGrid columns={columns} rows={rows} keyField="id" loading />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('fires onRowClick with the clicked row', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataGrid columns={columns} rows={rows} keyField="id" onRowClick={onRowClick} />);
    await user.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('toggles a row into selectedKeys via its checkbox without triggering onRowClick', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const onSelectChange = vi.fn();
    render(
      <DataGrid
        columns={columns}
        rows={rows}
        keyField="id"
        selectedKeys={new Set()}
        onSelectChange={onSelectChange}
        onRowClick={onRowClick}
      />
    );
    // First checkbox is "select all"; row checkboxes follow.
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    expect(onSelectChange).toHaveBeenCalledWith(new Set(['1']));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('select-all toggles every row key, and toggles back to empty when all are already selected', async () => {
    const user = userEvent.setup();
    const onSelectChange = vi.fn();
    const { rerender } = render(
      <DataGrid columns={columns} rows={rows} keyField="id" selectedKeys={new Set()} onSelectChange={onSelectChange} />
    );
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(onSelectChange).toHaveBeenCalledWith(new Set(['1', '2']));

    rerender(
      <DataGrid columns={columns} rows={rows} keyField="id" selectedKeys={new Set(['1', '2'])} onSelectChange={onSelectChange} />
    );
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(onSelectChange).toHaveBeenCalledWith(new Set());
  });

  it('renders a custom column via render() instead of the raw field value', () => {
    const withRender = [
      { key: 'id', label: 'ID', width: '100px' },
      { key: 'name', label: 'Name', width: '200px', render: (row: any) => `Custom: ${row.name}` },
    ];
    render(<DataGrid columns={withRender} rows={rows} keyField="id" />);
    expect(screen.getByText('Custom: Alice')).toBeInTheDocument();
  });
});
