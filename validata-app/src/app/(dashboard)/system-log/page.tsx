"use client";

import useSWR from 'swr';
import { useSession } from '../../../context/SessionContext';
import { AUDIT_VIEWER_ROLES, hasRole } from '../../../lib/permissions';

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

async function fetchLog(params: URLSearchParams): Promise<any[]> {
  const res = await fetch(`/api/audit-log?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Full-page version of the bottom panel's "System Log" tab - system-wide
// events (logins, study creation/locking, user access changes) that aren't
// scoped to any one study, so this page (unlike Study Log/Audit Trail)
// doesn't filter by currentStudyId.
export default function SystemLogPage() {
  const { userRole } = useSession();

  const canView = hasRole(userRole, AUDIT_VIEWER_ROLES);

  const { data: rows = [], isLoading: loading, mutate: refresh } = useSWR(
    canView ? 'system-log' : null,
    () => fetchLog(new URLSearchParams({ scope: 'system' }))
  );

  if (!canView) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>
        You do not have access to the system log.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            SYSTEM / System Log
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
            System Log
          </h1>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '600px' }}>
            System-level events not tied to any one study - logins, study creation/locking, and user access changes.
          </div>
        </div>
        <button
          onClick={() => refresh()}
          style={{
            padding: '5px 12px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--font-size-md)',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>Loading…</div>
      )}

      {!loading && rows.length === 0 && (
        <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>
          No system-level events yet (logins, study creation/locking, user access changes).
        </div>
      )}

      <div style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        {rows.map((row: any) => (
          <div
            key={row.id}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--border)',
              fontSize: 'var(--font-size-md)',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ color: 'var(--text-timestamp)', fontFamily: 'var(--font-data)', fontSize: 'var(--font-size-sm)' }}>
              {new Date(row.occurred_at).toISOString().replace('T', ' ').substring(0, 16)} UTC
            </span>
            {' — '}
            <span style={{ color: 'var(--text-actor)', fontWeight: 600 }}>{row.actor_email ?? 'Someone'}</span>
            {' '}
            <span style={{ color: ACTION_COLORS[row.action] ?? 'var(--text-secondary)', fontWeight: 600 }}>{row.action}</span>
            {row.reason && <span style={{ color: 'var(--text-muted)' }}> — {row.reason}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
