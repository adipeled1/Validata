"use client";

import { useState, useEffect, useCallback } from 'react';

interface BottomPanelProps {
  studyId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'audit' | 'queries' | 'system';

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'var(--status-insert)',
  UPDATE: 'var(--status-update)',
  DELETE: 'var(--status-dropped)',
  SOFT_DELETE: 'var(--status-warning)',
  ROLE_CHANGE: 'var(--status-sign)',
  STATUS_CHANGE: 'var(--status-pending)',
  SIGN_OFF: 'var(--status-sign)',
  LOCK: 'var(--text-muted)',
  UNLOCK: 'var(--text-secondary)',
};

function AuditTab({ studyId }: { studyId: string | null }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!studyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-log?studyId=${studyId}`);
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoading(false);
    }
  }, [studyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (!studyId)
    return (
      <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>
        No study selected.
      </div>
    );
  if (loading && logs.length === 0)
    return (
      <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>
        Loading…
      </div>
    );

  return (
    <div style={{ overflowX: 'auto', height: '100%' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--font-data)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <thead>
          <tr style={{ background: 'var(--bg-panel-header)' }}>
            {['UTC Timestamp', 'Actor', 'Action', 'Table', 'Record'].map((col) => (
              <th
                key={col}
                style={{
                  padding: '3px 8px',
                  textAlign: 'left',
                  color: 'var(--text-col-header)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--font-size-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  fontWeight: 600,
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.slice(0, 50).map((row, i) => (
            <tr
              key={row.id}
              style={{
                background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                height: '22px',
              }}
            >
              <td
                style={{
                  padding: '0 8px',
                  color: 'var(--text-timestamp)',
                  whiteSpace: 'nowrap',
                }}
              >
                {new Date(row.occurred_at).toISOString().replace('T', ' ').substring(0, 19)} UTC
              </td>
              <td style={{ padding: '0 8px', color: 'var(--text-actor)', whiteSpace: 'nowrap' }}>
                {row.actor_email ?? '—'}
              </td>
              <td
                style={{
                  padding: '0 8px',
                  color: ACTION_COLORS[row.action] ?? 'var(--text-secondary)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {row.action}
              </td>
              <td style={{ padding: '0 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {row.table_name}
              </td>
              <td style={{ padding: '0 8px', color: 'var(--text-id)', whiteSpace: 'nowrap' }}>
                {row.record_id?.substring(0, 8) ?? '—'}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: '8px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                No audit entries yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function BottomPanel({ studyId, isOpen, onClose }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('audit');

  if (!isOpen) return null;

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'audit', label: 'AUDIT TRAIL' },
    { id: 'queries', label: 'OPEN QUERIES' },
    { id: 'system', label: 'SYSTEM LOG' },
  ];

  return (
    <div
      style={{
        height: 'var(--panel-height)',
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          height: '28px',
          background: 'var(--bg-panel-header)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'stretch',
          flexShrink: 0,
        }}
      >
        <span style={{
          padding: '0 12px',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 700,
          letterSpacing: '0.07em',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          borderRight: '1px solid var(--border)',
          userSelect: 'none',
        }}>
          STUDY LOG
        </span>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0 12px',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                letterSpacing: '0.07em',
                fontFamily: 'var(--font-ui)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-soft)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          title="Close panel"
          style={{
            padding: '0 10px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-lg)',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)')}
        >
          ×
        </button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'audit' && <AuditTab studyId={studyId} />}
        {activeTab === 'queries' && (
          <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 'var(--font-size-md)' }}>
            Navigate to Query Management for full management.
          </div>
        )}
        {activeTab === 'system' && (
          <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 'var(--font-size-md)' }}>
            System log — coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
