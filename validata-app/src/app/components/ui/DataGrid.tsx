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

  return (
    <div
      style={{
        width: '100%',
        border: '1px solid var(--border)',
        overflow: 'auto',
        background: 'var(--bg-surface)',
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
            fontSize: '12px',
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
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-ui)',
            fontSize: '12px',
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
                    fontSize: '10px',
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
                    fontSize: '12px',
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
                          fontSize: '14px',
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
