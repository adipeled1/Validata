"use client";

// The "Manage data lock" popover from the study header - scoped to just the
// selected study's row, for consistency with the rest of Study Management
// (which is always about the one study you've picked on the left, not every
// study at once). Same table layout as the original cross-study view, just
// filtered down to one row.
import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../../context/SessionContext';

export interface LockableStudy {
  id: string;
  name: string;
  lock_state?: string;
  locked_at?: string | null;
  locked_by?: string | null;
  lock_reason?: string | null;
  deleted_at?: string | null;
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left',
  fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};

export default function StudyLockModal({ studyId, onClose }: { studyId: string; onClose: () => void }) {
  const { isDemoMode } = useSession();
  const [study, setStudy] = useState<LockableStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/studies');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const match = Array.isArray(data) ? data.find((s: LockableStudy) => s.id === studyId) : null;
      setStudy(match ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [studyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const isLocked = study?.lock_state === 'locked';

  const handleLockToggle = async () => {
    if (!study || !reason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const endpoint = isLocked ? '/api/admin/unlock' : '/api/admin/lock';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId: study.id, reason }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setShowReason(false);
      setReason('');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        width: '100%', maxWidth: '720px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Study Lock Control
          </span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'var(--font-size-2xl)', padding: '4px' }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '0 24px 24px', maxHeight: '420px', overflowY: 'auto' }}>
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid var(--color-error)', margin: '16px 0 0', padding: '10px 14px', fontSize: 'var(--font-size-base)', color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          {loading || !study ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-base)' }}>
              {loading ? 'Loading…' : 'Lock status unavailable for this study.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-base)', marginTop: '16px' }}>
              <thead>
                <tr>
                  {['Study', 'State', 'Locked At (UTC)', 'Locked By', 'Reason', 'Action'].map((col) => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{study.name}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '1px 6px', fontSize: 'var(--font-size-xs)', fontWeight: 700,
                      border: `1px solid ${isLocked ? 'var(--color-error)' : 'var(--status-active)'}`,
                      color: isLocked ? 'var(--color-error)' : 'var(--status-active)',
                      background: isLocked ? 'rgba(220,38,38,0.08)' : 'rgba(78,201,176,0.08)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {isLocked ? 'Locked' : 'Open'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-data)', fontSize: 'var(--font-size-md)' }}>
                    {study.locked_at ? new Date(study.locked_at).toUTCString() : '—'}
                  </td>
                  <td style={tdStyle}>{study.locked_by ?? '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: '160px' }} title={study.lock_reason ?? undefined}>
                    {study.lock_reason ?? '—'}
                  </td>
                  <td style={tdStyle}>
                    {isDemoMode ? (
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Demo mode</span>
                    ) : (
                      <button
                        onClick={() => setShowReason((s) => !s)}
                        style={{
                          padding: '4px 10px', fontSize: 'var(--font-size-md)', fontWeight: 600,
                          background: isLocked ? 'rgba(220,38,38,0.1)' : 'rgba(78,201,176,0.1)',
                          color: isLocked ? 'var(--color-error)' : 'var(--status-active)',
                          border: `1px solid ${isLocked ? 'var(--color-error)' : 'var(--status-active)'}`,
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                        }}
                      >
                        {isLocked ? 'Unlock…' : 'Lock…'}
                      </button>
                    )}
                  </td>
                </tr>
                {showReason && (
                  <tr style={{ background: 'var(--bg-editor)' }}>
                    <td colSpan={6} style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {isLocked ? 'Reason for unlock (required):' : 'Reason for lock (required):'}
                        </span>
                        <input
                          placeholder="Enter mandatory reason…"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          style={{
                            flex: 1, fontSize: 'var(--font-size-md)', padding: '5px 8px',
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', outline: 'none', borderRadius: 'var(--radius)',
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleLockToggle}
                          disabled={saving || !reason.trim()}
                          style={{
                            padding: '5px 12px', fontSize: 'var(--font-size-md)', fontWeight: 600,
                            background: isLocked ? 'var(--color-error)' : 'var(--accent)',
                            color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
                            opacity: (saving || !reason.trim()) ? 0.5 : 1,
                          }}
                        >
                          {saving ? '…' : isLocked ? 'Confirm Unlock' : 'Confirm Lock'}
                        </button>
                        <button
                          onClick={() => { setShowReason(false); setReason(''); }}
                          style={{ padding: '5px 10px', fontSize: 'var(--font-size-md)', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
