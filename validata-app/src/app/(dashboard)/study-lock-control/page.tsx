"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';

interface Study {
  id: string;
  name: string;
  lock_state?: string;
  locked_at?: string | null;
  locked_by?: string | null;
  lock_reason?: string | null;
  deleted_at?: string | null;
}

const ADMIN_ROLES = ['admin', 'mentor'];

export default function StudyLockControlPage() {
  const { userRole, isDemoMode } = useSession();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, { saving: boolean; reason: string; show: boolean }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/studies');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStudies(Array.isArray(data) ? data.filter((s: Study) => !s.deleted_at) : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getState = (id: string) => actionState[id] ?? { saving: false, reason: '', show: false };

  const setStudyAction = (id: string, patch: Partial<{ saving: boolean; reason: string; show: boolean }>) => {
    setActionState(prev => ({ ...prev, [id]: { ...getState(id), ...patch } }));
  };

  const handleLockToggle = async (study: Study) => {
    const isLocked = study.lock_state === 'locked';
    const state = getState(study.id);
    if (!state.reason.trim()) return;

    setStudyAction(study.id, { saving: true });
    setError(null);
    try {
      const endpoint = isLocked ? '/api/admin/unlock' : '/api/admin/lock';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId: study.id, reason: state.reason }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStudyAction(study.id, { show: false, reason: '', saving: false });
      load();
    } catch (e) {
      setError((e as Error).message);
      setStudyAction(study.id, { saving: false });
    }
  };

  if (!ADMIN_ROLES.includes(userRole)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
        You do not have access to study lock control.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            ADMINISTRATION / Study Lock Control
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Study Lock Control
          </h1>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid var(--color-error)', padding: '8px 12px', fontSize: '12px', color: 'var(--color-error)', flexShrink: 0 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>Loading…</div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 1 }}>
                {['Study', 'Lock State', 'Locked At (UTC)', 'Locked By', 'Reason', 'Action'].map(col => (
                  <th key={col} style={thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studies.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '11px' }}>
                    No studies found.
                  </td>
                </tr>
              ) : studies.map((study, i) => {
                const isLocked = study.lock_state === 'locked';
                const state = getState(study.id);
                return (
                  <React.Fragment key={study.id}>
                  <tr style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-surface)', height: 'var(--row-height)' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{study.name}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '1px 6px', fontSize: '10px', fontWeight: 700,
                          border: `1px solid ${isLocked ? 'var(--color-error)' : 'var(--status-active)'}`,
                          color: isLocked ? 'var(--color-error)' : 'var(--status-active)',
                          background: isLocked ? 'rgba(220,38,38,0.08)' : 'rgba(78,201,176,0.08)',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {isLocked ? '🔒 Locked' : '🔓 Open'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-data)', fontSize: '11px' }}>
                        {study.locked_at ? new Date(study.locked_at).toUTCString() : '—'}
                      </td>
                      <td style={tdStyle}>{study.locked_by ?? '—'}</td>
                      <td style={{ ...tdStyle, maxWidth: '200px' }} title={study.lock_reason ?? undefined}>
                        {study.lock_reason ?? '—'}
                      </td>
                      <td style={tdStyle}>
                        {isDemoMode ? (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Demo mode</span>
                        ) : (
                          <button
                            onClick={() => setStudyAction(study.id, { show: !state.show })}
                            style={{
                              padding: '3px 8px', fontSize: '11px', fontWeight: 600,
                              background: isLocked ? 'rgba(220,38,38,0.1)' : 'rgba(78,201,176,0.1)',
                              color: isLocked ? 'var(--color-error)' : 'var(--status-active)',
                              border: `1px solid ${isLocked ? 'var(--color-error)' : 'var(--status-active)'}`,
                              cursor: 'pointer',
                            }}
                          >
                            {isLocked ? 'Unlock…' : 'Lock…'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {state.show && (
                      <tr key={`${study.id}-action`} style={{ background: 'var(--bg-editor)' }}>
                        <td colSpan={6} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {isLocked ? 'Reason for unlock (required):' : 'Reason for lock (required):'}
                            </span>
                            <input
                              placeholder="Enter mandatory reason…"
                              value={state.reason}
                              onChange={e => setStudyAction(study.id, { reason: e.target.value })}
                              style={{
                                flex: 1, fontSize: '11px', padding: '4px 8px',
                                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', outline: 'none',
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleLockToggle(study)}
                              disabled={state.saving || !state.reason.trim()}
                              style={{
                                padding: '4px 12px', fontSize: '11px', fontWeight: 600,
                                background: isLocked ? 'var(--color-error)' : 'var(--accent)',
                                color: '#fff', border: 'none', cursor: 'pointer',
                                opacity: (state.saving || !state.reason.trim()) ? 0.5 : 1,
                              }}
                            >
                              {state.saving ? '…' : isLocked ? 'Confirm Unlock' : 'Confirm Lock'}
                            </button>
                            <button
                              onClick={() => setStudyAction(study.id, { show: false, reason: '' })}
                              style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px', textAlign: 'left',
  fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0 8px', height: 'var(--row-height)',
  color: 'var(--text-primary)', borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
