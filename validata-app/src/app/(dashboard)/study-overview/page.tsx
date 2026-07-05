"use client";

import { useState, useEffect, useCallback } from 'react';
import { useStudy } from '../../../context/StudyContext';

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


export default function StudyOverviewPage() {
  const { currentStudy, currentStudyId } = useStudy();

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const load = useCallback(() => {
    if (!currentStudyId) return;
    setLoadingAudit(true);
    Promise.all([
      fetch(`/api/audit-log?studyId=${currentStudyId}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/queries?studyId=${currentStudyId}`).then((r) => r.ok ? r.json() : []),
    ]).then(([logs, qs]) => {
      setAuditLogs(logs.slice(0, 10));
      setQueries(qs);
    }).finally(() => setLoadingAudit(false));
  }, [currentStudyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openQueries = queries.filter((q) => q.status === 'open' || q.status === 'answered').length;
  const isLocked = currentStudy?.lock_state === 'locked';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Study header */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '2px',
            }}
          >
            ANALYSIS / Study Overview
          </div>
          <h1
            style={{
              fontSize: 'var(--font-size-h1)',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {currentStudy?.name ?? 'Study Overview'}
          </h1>
          {currentStudy?.site && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {currentStudy.site}
              {currentStudy.recruitment_goal && (
                <span style={{ marginLeft: '8px' }}>
                  · Enrollment target: {currentStudy.recruitment_goal}
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--status-active)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            &#x25CF; Active
          </span>
          <span style={{ fontSize: '11px', color: isLocked ? 'var(--status-dropped)' : 'var(--text-secondary)' }}>
            {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </span>
        </div>
      </div>

      {/* Two-column row: Recent Activity + Open Queries */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Recent Activity */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--border)',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-secondary)',
            }}
          >
            Recent Activity (last 10 audit events)
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loadingAudit && (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Loading…</div>
            )}
            {!loadingAudit && auditLogs.length === 0 && (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>No audit events yet.</div>
            )}
            {auditLogs.map((log, i) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '3px 12px',
                  height: '24px',
                  background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                  fontFamily: 'var(--font-data)',
                  fontSize: '11px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ color: 'var(--text-timestamp)', whiteSpace: 'nowrap', minWidth: '130px' }}>
                  {new Date(log.occurred_at).toISOString().replace('T', ' ').substring(0, 19)} UTC
                </span>
                <span style={{ color: 'var(--text-actor)', minWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.actor_email ?? '—'}
                </span>
                <span style={{ color: ACTION_COLORS[log.action] ?? 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {log.action}
                </span>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {log.table_name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Open Queries + placeholder for last signature */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', flex: 1 }}>
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border)',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-secondary)',
              }}
            >
              Open Queries ({openQueries})
            </div>
            {queries.filter((q) => q.status === 'open' || q.status === 'answered').slice(0, 5).map((q, i) => (
              <div
                key={q.id}
                style={{
                  padding: '4px 12px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '11px',
                }}
              >
                <span style={{ fontFamily: 'var(--font-data)', color: 'var(--text-id)' }}>
                  Q-{String(q.id).padStart(3, '0')}
                </span>
                <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, margin: '0 10px' }}>
                  {q.query_text}
                </span>
                <span style={{ color: q.status === 'open' ? 'var(--status-dropped)' : 'var(--accent-soft)', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {q.status.toUpperCase()}
                </span>
              </div>
            ))}
            {openQueries === 0 && (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--status-active)' }}>No open queries. Study is clean.</div>
            )}
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '12px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Last Signature
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              See Electronic Signatures page for full endorsement registry.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
