"use client";

import { useState } from 'react';

export interface DataGridColumn<T> {
  key: string;
  label: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  rows: T[];
  keyField: string;
  onRowClick?: (row: T) => void;
  onRowContextMenu?: (row: T, e: React.MouseEvent) => void;
  selectedKeys?: Set<string>;
  onSelectChange?: (keys: Set<string>) => void;
  loading?: boolean;
  emptyMessage?: string;
  // Extra scrollable space (px) to add on the right, e.g. while an absolutely-
  // positioned InlinePanel is floating over the grid. The panel doesn't
  // affect layout (it's position: absolute, so it never shrinks the grid's
  // own container), so without this there's nothing forcing the grid to
  // become scrollable just because a panel is covering part of it. Adding
  // this as trailing padding on the scroll container extends its scrollWidth,
  // so scrolling right-to-left brings columns out from under the panel even
  // though the grid's own content didn't get any wider.
  reserveRight?: number;
}

export default function DataGrid<T extends Record<string, any>>({
  columns,
  rows,
  keyField,
  onRowClick,
  onRowContextMenu,
  selectedKeys,
  onSelectChange,
  loading = false,
  emptyMessage = 'No data.',
  reserveRight = 0,
}: DataGridProps<T>) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const toggleSelect = (key: string) => {
    if (!onSelectChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectChange(next);
  };

  const toggleSelectAll = () => {
    if (!onSelectChange || !selectedKeys) return;
    if (selectedKeys.size === rows.length) {
      onSelectChange(new Set());
    } else {
      onSelectChange(new Set(rows.map((r) => String(r[keyField]))));
    }
  };

  const hasCheckboxes = !!onSelectChange;
  const hasActions = !!onRowContextMenu;
  const allSelected = hasCheckboxes && rows.length > 0 && selectedKeys?.size === rows.length;

  // table-layout: auto (the default) treats a column's `width` as an advisory
  // hint, not a minimum - combined with the table's own `width: 100%`, the
  // browser just shrinks columns to fit the container instead of ever
  // overflowing it. That leaves nothing for the wrapper's overflow:auto to
  // scroll. table-layout: fixed + an explicit min-width (the sum of every
  // column's width) makes the table hold its real size and overflow - and
  // become horizontally scrollable - once the container is narrower than that.
  const minWidth =
    (hasCheckboxes ? 30 : 0) +
    columns.reduce((sum, col) => sum + (col.width ? parseInt(col.width, 10) || 0 : 150), 0) +
    (hasActions ? 48 : 0);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid var(--border)',
        overflow: 'auto',
        background: 'var(--bg-surface)',
        paddingRight: reserveRight ? `${reserveRight}px` : undefined,
      }}
    >
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '120px',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-md)',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid var(--accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Loading…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!loading && (
        <table
          style={{
            width: '100%',
            minWidth: `${minWidth}px`,
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--font-size-md)',
          }}
        >
          <thead>
            <tr
              style={{
                height: 'var(--header-height)',
                background: 'var(--bg-panel-header)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {hasCheckboxes && (
                <th style={{ width: '30px', padding: '0 6px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={!!allSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '0 8px',
                    textAlign: 'left',
                    width: col.width,
                    color: 'var(--text-col-header)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {col.label}
                </th>
              ))}
              {hasActions && (
                <th style={{ width: '48px', padding: '0 6px' }} />
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={
                    columns.length + (hasCheckboxes ? 1 : 0) + (hasActions ? 1 : 0)
                  }
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 'var(--font-size-md)',
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {rows.map((row, i) => {
              const key = String(row[keyField]);
              const isSelected = selectedKeys?.has(key) ?? false;
              const isHovered = hoveredKey === key;

              let rowBg = i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)';
              if (isSelected) rowBg = 'var(--bg-selection)';
              else if (isHovered) rowBg = 'var(--bg-surface-hover)';

              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  onContextMenu={(e) => {
                    if (onRowContextMenu) {
                      e.preventDefault();
                      onRowContextMenu(row, e);
                    }
                  }}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{
                    height: 'var(--row-height)',
                    background: rowBg,
                    cursor: onRowClick ? 'pointer' : 'default',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.05s',
                  }}
                >
                  {hasCheckboxes && (
                    <td
                      style={{ width: '30px', padding: '0 6px', textAlign: 'center' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(key);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(key)}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '0 8px',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: col.width ?? '200px',
                        fontFamily: 'var(--font-data)',
                      }}
                    >
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                  {hasActions && (
                    <td
                      style={{ width: '48px', padding: '0 6px', textAlign: 'center' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowContextMenu?.(row, e);
                      }}
                    >
                      <button
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: 'var(--font-size-lg)',
                          padding: '0 4px',
                          fontFamily: 'var(--font-ui)',
                          letterSpacing: '1px',
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color =
                            'var(--text-primary)')
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color =
                            'var(--text-muted)')
                        }
                        title="Actions"
                      >
                        ···
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
