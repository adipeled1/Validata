"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
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

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  padding: '4px 8px',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};

// fable_system_review §3.2: standardized on SWR instead of a bare useEffect
// fetch - the key encodes every filter param so changing a filter is just a
// new SWR key (and thus a fresh cache entry) rather than an imperative reload.
async function fetchAuditLogs(params: URLSearchParams): Promise<any[]> {
  const res = await fetch(`/api/audit-log?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export default function AuditLogPage() {
  const { userRole } = useSession();
  const { currentStudyId } = useStudy();
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const canView = hasRole(userRole, AUDIT_VIEWER_ROLES);

  const swrKey = currentStudyId
    ? `audit-log:${currentStudyId}:${actionFilter}:${fromDate}:${toDate}`
    : null;
  const { data: logs = [], isLoading: loading, mutate: refreshLogs } = useSWR(swrKey, () => {
    const params = new URLSearchParams({ studyId: currentStudyId! });
    if (actionFilter) params.set('action', actionFilter);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    return fetchAuditLogs(params);
  });

  const downloadCsv = async () => {
    if (!currentStudyId) return;
    const params = new URLSearchParams({ studyId: currentStudyId, format: 'csv' });
    if (actionFilter) params.set('action', actionFilter);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    const res = await fetch(`/api/audit-log?${params}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${currentStudyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canView) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
        You do not have access to the audit trail.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            COMPLIANCE / Audit Trail
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Audit Trail
          </h1>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '600px' }}>
            Immutable, system-generated audit trail. Every data creation, modification, and deletion is recorded with actor identity and UTC timestamp. (ICH E6(R3) AUDIT-01 to AUDIT-08)
          </div>
        </div>
        <button
          onClick={downloadCsv}
          style={{
            padding: '5px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Action</div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={inputStyle}
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {['INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'ROLE_CHANGE', 'STATUS_CHANGE', 'LOCK', 'UNLOCK', 'SIGN_OFF'].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>From (UTC)</div>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} aria-label="From date" />
        </div>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>To (UTC)</div>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} aria-label="To date" />
        </div>
        <button
          onClick={() => refreshLogs()}
          style={{
            padding: '5px 12px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {logs.length} entries
        </span>
      </div>

      {loading && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading…</div>
      )}

      {!loading && !currentStudyId && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No study selected.</div>
      )}

      {!loading && logs.length === 0 && currentStudyId && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No audit entries match the current filters.</div>
      )}

      {/* Dense table */}
      <div style={{ overflow: 'auto', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-data)', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-panel-header)', height: 'var(--header-height)' }}>
              {['UTC Timestamp', 'Actor', 'Table', 'Record', 'Action', 'Reason'].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '0 8px',
                    textAlign: 'left',
                    color: 'var(--text-col-header)',
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((row, i) => (
              <tr
                key={row.id}
                style={{
                  height: 'var(--row-height)',
                  background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <td style={{ padding: '0 8px', color: 'var(--text-timestamp)', whiteSpace: 'nowrap' }}>
                  {new Date(row.occurred_at).toISOString().replace('T', ' ').substring(0, 19)} UTC
                </td>
                <td style={{ padding: '0 8px', color: 'var(--text-actor)', whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.actor_email ?? '—'}
                </td>
                <td style={{ padding: '0 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {row.table_name}
                </td>
                <td style={{ padding: '0 8px', color: 'var(--text-id)', whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.record_id ?? '—'}
                </td>
                <td style={{ padding: '0 8px', whiteSpace: 'nowrap' }}>
                  <span style={{ color: ACTION_COLORS[row.action] ?? 'var(--text-secondary)', fontWeight: 600 }}>
                    {row.action}
                  </span>
                </td>
                <td style={{ padding: '0 8px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.reason ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
