"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudy } from '../../../context/StudyContext';
import { useSession } from '../../../context/SessionContext';
import { ADMIN_ROLES, hasRole } from '../../../lib/permissions';

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

// Same 48h / 7d bands used on the Adverse Events page - a mentor deciding
// whether something needs attention today should see the same urgency
// signal here as they would on the page itself.
function deadlineStatus(deadline: string | null): 'red' | 'yellow' | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 48 * 60 * 60 * 1000) return 'red';
  if (diff < 7 * 24 * 60 * 60 * 1000) return 'yellow';
  return null;
}

interface AttentionRow {
  key: string;
  label: string;
  count: number;
  urgent: boolean;
  onClick: () => void;
}

function AttentionPanel({ rows }: { rows: AttentionRow[] }) {
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
  const anyUrgent = rows.some((r) => r.urgent);

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${anyUrgent ? 'var(--color-error)' : totalCount > 0 ? 'var(--status-warning)' : 'var(--border)'}`,
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary)',
        }}
      >
        Needs My Attention{totalCount > 0 ? ` (${totalCount})` : ''}
      </div>
      {totalCount === 0 ? (
        <div style={{ padding: '12px', fontSize: 'var(--font-size-md)', color: 'var(--status-active)' }}>
          Nothing needs your attention right now.
        </div>
      ) : (
        rows
          .filter((r) => r.count > 0)
          .map((row, i) => (
            <button
              key={row.key}
              onClick={row.onClick}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                borderBottom: '1px solid var(--border)',
                border: 'none',
                borderBottomStyle: 'solid',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-selection)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)')}
            >
              <span>
                {row.urgent && <span style={{ color: 'var(--color-error)', marginRight: '6px' }}>⚠</span>}
                {row.label}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 700,
                  padding: '1px 7px',
                  border: `1px solid ${row.urgent ? 'var(--color-error)' : 'var(--status-warning)'}`,
                  color: row.urgent ? 'var(--color-error)' : 'var(--status-warning)',
                }}
              >
                {row.count}
              </span>
            </button>
          ))
      )}
    </div>
  );
}

export default function StudyOverviewPage() {
  const { currentStudy, currentStudyId } = useStudy();
  const { userRole } = useSession();
  const router = useRouter();
  const canSeeApprovals = hasRole(userRole, ADMIN_ROLES);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [adverseEvents, setAdverseEvents] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const load = useCallback(() => {
    if (!currentStudyId) return;
    setLoadingAudit(true);
    Promise.all([
      fetch(`/api/audit-log?studyId=${currentStudyId}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/queries?studyId=${currentStudyId}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/adverse-events?studyId=${currentStudyId}`).then((r) => r.ok ? r.json() : []),
      canSeeApprovals
        ? fetch('/api/profiles').then((r) => r.ok ? r.json() : [])
        : Promise.resolve([]),
    ]).then(([logs, qs, aes, profiles]) => {
      setAuditLogs(logs.slice(0, 10));
      setQueries(qs);
      setAdverseEvents(Array.isArray(aes) ? aes : []);
      setPendingApprovals(Array.isArray(profiles) ? profiles.filter((p: any) => p.status === 'pending').length : 0);
    }).finally(() => setLoadingAudit(false));
  }, [currentStudyId, canSeeApprovals]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openQueries = queries.filter((q) => q.status === 'open' || q.status === 'answered').length;
  const isLocked = currentStudy?.lock_state === 'locked';

  const unsubmittedSAEs = adverseEvents.filter((e) => e.ae_type !== 'ae' && !e.authority_submitted_at);
  const urgentSAEs = unsubmittedSAEs.filter((e) => deadlineStatus(e.authority_deadline) === 'red');

  const attentionRows: AttentionRow[] = [
    {
      key: 'queries',
      label: `Open ${openQueries === 1 ? 'query' : 'queries'} awaiting action`,
      count: openQueries,
      urgent: false,
      onClick: () => router.push('/queries'),
    },
    {
      key: 'sae',
      label: `SAE/SUSAR${unsubmittedSAEs.length === 1 ? '' : 's'} not yet submitted to authority`,
      count: unsubmittedSAEs.length,
      urgent: urgentSAEs.length > 0,
      onClick: () => router.push('/adverse-events'),
    },
    ...(canSeeApprovals
      ? [{
          key: 'approvals',
          label: `Pending user ${pendingApprovals === 1 ? 'approval' : 'approvals'}`,
          count: pendingApprovals,
          urgent: false,
          onClick: () => router.push('/user-management'),
        }]
      : []),
  ];

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
              fontSize: 'var(--font-size-xs)',
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
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>
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
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--status-active)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            &#x25CF; Active
          </span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: isLocked ? 'var(--status-dropped)' : 'var(--text-secondary)' }}>
            {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </span>
        </div>
      </div>

      {/* Needs My Attention - consolidates everything a mentor would otherwise
          have to click through Queries, Adverse Events, and User Registry
          separately to discover. */}
      <AttentionPanel rows={attentionRows} />

      {/* Two-column row: Recent Activity + Open Queries */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Recent Activity */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--border)',
              fontSize: 'var(--font-size-xs)',
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
              <div style={{ padding: '12px', fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>Loading…</div>
            )}
            {!loadingAudit && auditLogs.length === 0 && (
              <div style={{ padding: '12px', fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>No audit events yet.</div>
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
                  fontSize: 'var(--font-size-sm)',
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
                fontSize: 'var(--font-size-xs)',
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
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-data)', color: 'var(--text-id)' }}>
                  Q-{String(q.id).padStart(3, '0')}
                </span>
                <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, margin: '0 10px' }}>
                  {q.query_text}
                </span>
                <span style={{ color: q.status === 'open' ? 'var(--status-dropped)' : 'var(--accent-soft)', fontSize: 'var(--font-size-xs)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {q.status.toUpperCase()}
                </span>
              </div>
            ))}
            {openQueries === 0 && (
              <div style={{ padding: '12px', fontSize: 'var(--font-size-md)', color: 'var(--status-active)' }}>No open queries. Study is clean.</div>
            )}
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '12px' }}>
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Last Signature
            </div>
            <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>
              See Electronic Signatures page for full endorsement registry.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
