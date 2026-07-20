"use client";

import useSWR from 'swr';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import { AUDIT_VIEWER_ROLES, canAccessPage } from '../../../lib/permissions';
import { ACTION_COLORS } from '../../../lib/auditActionColors';
import * as clientDemoStore from '../../../lib/clientDemoStore';

const ACTION_VERBS: Record<string, string> = {
  INSERT: 'created',
  UPDATE: 'updated',
  DELETE: 'deleted',
  SOFT_DELETE: 'removed',
  ROLE_CHANGE: 'changed access for',
  STATUS_CHANGE: 'changed the status of',
  SIGN_OFF: 'endorsed',
  LOCK: 'locked',
  UNLOCK: 'unlocked',
};

const TABLE_LABELS: Record<string, string> = {
  participants: 'a participant',
  measurements: 'a measurement',
  queries: 'a query',
  adverse_events: 'an adverse event',
  consent_records: 'a consent record',
  consent_form_versions: 'a consent form version',
  delegations: 'a delegation',
  signatures: 'a signature',
  studies: 'the study',
  profiles: 'a user',
  system: 'the system',
};

async function fetchLog(params: URLSearchParams): Promise<any[]> {
  const res = await fetch(`/api/audit-log?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Full-page version of the bottom panel's "Study Log" tab - the same
// study-scoped audit data as the Audit Trail page, retold as a readable
// timeline instead of a raw table.
export default function StudyLogPage() {
  const { userRole, userStatus, isDemoMode } = useSession();
  const { currentStudyId } = useStudy();

  const canView = canAccessPage(userRole, userStatus, AUDIT_VIEWER_ROLES);

  // Demo mode reads clientDemoStore (sessionStorage, this browser tab) directly
  // instead of fetching - every demo mutation writes there, not to the
  // server-side store an API round trip would read from.
  //
  // No scope filter here (unlike System Log, which filters to scope:
  // 'system') - Study Log is meant to be the same underlying data as Audit
  // Trail, retold as plain-language events, so it includes this study's own
  // LOCK/UNLOCK entries too. Filtering by studyId alone already keeps other
  // studies' lock/unlock events out.
  const swrKey = currentStudyId ? `study-log:${currentStudyId}` : null;
  const { data: rows = [], isLoading: loading, mutate: refresh } = useSWR(swrKey, () =>
    isDemoMode
      ? Promise.resolve(clientDemoStore.getAuditLog({ studyId: currentStudyId! }))
      : fetchLog(new URLSearchParams({ studyId: currentStudyId! }))
  );

  if (!canView) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>
        You do not have access to the study log.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            COMPLIANCE / Study Log
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Study Log
          </h1>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '600px' }}>
            <strong>This study only</strong> - a readable timeline of everything that has happened in the currently selected study, the same audit data as Audit Trail retold as plain-language events.
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

      {!loading && !currentStudyId && (
        <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>No study selected.</div>
      )}

      {!loading && currentStudyId && rows.length === 0 && (
        <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>
          Nothing has happened in this study yet - actions you take will appear here as a readable timeline.
        </div>
      )}

      <div style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        {rows.map((row: any) => {
          const verb = ACTION_VERBS[row.action] ?? row.action.toLowerCase().replace(/_/g, ' ');
          const noun = TABLE_LABELS[row.table_name] ?? row.table_name;
          return (
            <div
              key={row.id}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border)',
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: 'var(--text-timestamp)', fontFamily: 'var(--font-data)', fontSize: 'var(--font-size-sm)' }}>
                {new Date(row.occurred_at).toISOString().replace('T', ' ').substring(0, 16)} UTC
              </span>
              {' — '}
              <span style={{ color: 'var(--text-actor)', fontWeight: 600 }}>{row.actor_email ?? 'Someone'}</span>
              {' '}
              <span style={{ color: ACTION_COLORS[row.action] ?? 'var(--text-secondary)' }}>{verb}</span>
              {' '}
              {noun}
              {row.reason && <span style={{ color: 'var(--text-muted)' }}> — {row.reason}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
