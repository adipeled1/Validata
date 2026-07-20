"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../context/SessionContext';
import { AUDIT_VIEWER_ROLES, hasRole } from '../../../lib/permissions';
import * as clientDemoStore from '../../../lib/clientDemoStore';
import { ACTION_COLORS } from '../../../lib/auditActionColors';

interface BottomPanelProps {
  studyId: string | null;
  studies: any[];
  isOpen: boolean;
  onClose: () => void;
  height: number;
  onResize: (height: number) => void;
}

type TabId = 'story' | 'queries' | 'system';

const MIN_PANEL_HEIGHT = 100;
const MAX_PANEL_HEIGHT = 640;

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

async function fetchLog(params: Record<string, string>): Promise<any[]> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/audit-log?${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// In demo mode this reads clientDemoStore (sessionStorage, this browser tab
// only) directly instead of fetching - synchronous and scoped to the current
// visitor, unlike the server-side store an API route would read from.
function useAuditRows(params: Record<string, string> | null, isDemoMode: boolean, pollMs = 30000) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const paramsKey = useMemo(() => (params ? JSON.stringify(params) : null), [params]);

  const load = useCallback(async () => {
    if (!params) return;
    if (isDemoMode) {
      setRows(clientDemoStore.getAuditLog({
        studyId: params.studyId,
        scope: params.scope as 'study' | 'system' | undefined,
      }));
      return;
    }
    setLoading(true);
    try {
      setRows(await fetchLog(params));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, isDemoMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, pollMs);
    return () => clearInterval(interval);
  }, [load, pollMs]);

  return { rows, loading };
}

const emptyMsgStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: 'var(--text-muted)',
  fontSize: 'var(--font-size-md)',
};

function StoryTab({ studyId, isDemoMode }: { studyId: string | null; isDemoMode: boolean }) {
  const { rows, loading } = useAuditRows(studyId ? { studyId, scope: 'study' } : null, isDemoMode);

  if (!studyId) return <div style={emptyMsgStyle}>No study selected.</div>;
  if (loading && rows.length === 0) return <div style={emptyMsgStyle}>Loading…</div>;
  if (rows.length === 0) {
    return <div style={emptyMsgStyle}>Nothing has happened in this study yet — actions you take will appear here as a readable timeline.</div>;
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '6px 12px' }}>
      {rows.slice(0, 50).map((row) => {
        const verb = ACTION_VERBS[row.action] ?? row.action.toLowerCase().replace(/_/g, ' ');
        const noun = TABLE_LABELS[row.table_name] ?? row.table_name;
        return (
          <div
            key={row.id}
            style={{
              padding: '5px 0',
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
  );
}

async function fetchOpenQueries(studyId: string): Promise<any[]> {
  const res = await fetch(`/api/queries?studyId=${studyId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data.filter((q) => q.status === 'open' || q.status === 'answered') : [];
}

function getOpenQueriesDemo(studyId: string): any[] {
  return clientDemoStore.getQueries(studyId).filter((q) => q.status === 'open' || q.status === 'answered');
}

const SEVERITY_COLOR: Record<string, string> = {
  minor: 'var(--status-pending)',
  major: 'var(--status-warning)',
  critical: 'var(--status-dropped)',
};

function OpenQueriesTab({ studyId, isDemoMode }: { studyId: string | null; isDemoMode: boolean }) {
  const router = useRouter();
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!studyId) return;
    if (isDemoMode) {
      setQueries(getOpenQueriesDemo(studyId));
      return;
    }
    setLoading(true);
    try {
      setQueries(await fetchOpenQueries(studyId));
    } finally {
      setLoading(false);
    }
  }, [studyId, isDemoMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (!studyId) return <div style={emptyMsgStyle}>No study selected.</div>;
  if (loading && queries.length === 0) return <div style={emptyMsgStyle}>Loading…</div>;

  return (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          {queries.length === 0 ? 'No open queries. Study is clean.' : `${queries.length} query${queries.length === 1 ? '' : 'ies'} awaiting action`}
        </span>
        <button
          onClick={() => router.push('/queries')}
          style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-soft)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Open Query Management →
        </button>
      </div>
      {queries.slice(0, 20).map((q) => (
        <div
          key={q.id}
          onClick={() => router.push('/queries')}
          style={{
            padding: '6px 12px',
            borderBottom: '1px solid var(--border)',
            borderLeft: `3px solid ${SEVERITY_COLOR[q.severity] ?? 'transparent'}`,
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-data)', color: 'var(--text-id)' }}>Q-{String(q.id).padStart(3, '0')}</span>
          {' '}
          <span style={{ color: 'var(--text-secondary)' }}>{q.record_table}/{q.record_id} — {q.field_name}</span>
          <span style={{ float: 'right', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 'var(--font-size-xs)' }}>{q.status}</span>
        </div>
      ))}
    </div>
  );
}

function SystemLogTab({ isDemoMode, studies }: { isDemoMode: boolean; studies: any[] }) {
  const { rows, loading } = useAuditRows({ scope: 'system' }, isDemoMode);
  const studyNameById = useMemo(() => new Map(studies.map((s: any) => [s.id, s.name])), [studies]);

  if (loading && rows.length === 0) return <div style={emptyMsgStyle}>Loading…</div>;
  if (rows.length === 0) {
    return <div style={emptyMsgStyle}>No system-level events yet (study creation/locking, sign-offs, user access changes).</div>;
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '6px 12px' }}>
      {rows.slice(0, 50).map((row) => (
        <div
          key={row.id}
          style={{
            padding: '5px 0',
            borderBottom: '1px solid var(--border)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ color: 'var(--text-timestamp)', fontFamily: 'var(--font-data)' }}>
            {new Date(row.occurred_at).toISOString().replace('T', ' ').substring(0, 16)} UTC
          </span>
          {' — '}
          <span style={{ color: 'var(--text-actor)', fontWeight: 600 }}>{row.actor_email ?? 'Someone'}</span>
          {' '}
          <span style={{ color: ACTION_COLORS[row.action] ?? 'var(--text-secondary)', fontWeight: 600 }}>{row.action}</span>
          {row.study_id && (
            <span style={{ color: 'var(--text-secondary)' }}>
              {' '}({studyNameById.get(row.study_id) ?? row.study_id})
            </span>
          )}
          {row.reason && <span style={{ color: 'var(--text-muted)' }}> — {row.reason}</span>}
        </div>
      ))}
    </div>
  );
}

export default function BottomPanel({ studyId, studies, isOpen, onClose, height, onResize }: BottomPanelProps) {
  const { isDemoMode, userRole } = useSession();
  const showAuditLogs = hasRole(userRole, AUDIT_VIEWER_ROLES);
  const [activeTab, setActiveTab] = useState<TabId>(showAuditLogs ? 'story' : 'queries');
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

  const tabs = useMemo(() => {
    const list: Array<{ id: TabId; label: string }> = [];
    if (showAuditLogs) {
      list.push({ id: 'story', label: 'STUDY LOG' });
    }
    list.push({ id: 'queries', label: 'OPEN QUERIES' });
    if (showAuditLogs) {
      list.push({ id: 'system', label: 'SYSTEM LOG' });
    }
    return list;
  }, [showAuditLogs]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { startY: e.clientY, startHeight: height };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragState.current) return;
      // Panel is anchored to the bottom of the window, so dragging the
      // handle up (a smaller/negative clientY relative to the start)
      // should grow it, not shrink it.
      const delta = dragState.current.startY - moveEvent.clientY;
      const next = Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, dragState.current.startHeight + delta));
      onResize(next);
    };
    const handleMouseUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height, onResize]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        height: `${height}px`,
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Drag handle - grab anywhere along the top edge to resize */}
      <div
        onMouseDown={handleDragStart}
        title="Drag to resize"
        style={{
          position: 'absolute',
          top: '-3px',
          left: 0,
          right: 0,
          height: '6px',
          cursor: 'ns-resize',
          zIndex: 1,
        }}
      />

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
        {activeTab === 'story' && <StoryTab studyId={studyId} isDemoMode={isDemoMode} />}
        {activeTab === 'queries' && <OpenQueriesTab studyId={studyId} isDemoMode={isDemoMode} />}
        {activeTab === 'system' && <SystemLogTab isDemoMode={isDemoMode} studies={studies} />}
      </div>
    </div>
  );
}
