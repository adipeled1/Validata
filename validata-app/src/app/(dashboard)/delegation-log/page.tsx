"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import { READABLE_ROLES, DELEGATION_ROLES, hasRole } from '../../../lib/permissions';
import * as clientDemoStore from '../../../lib/clientDemoStore';
import { DEMO_USERS } from '../../../lib/demoData';

interface Delegation {
  id: number;
  study_id: string;
  delegated_to: string;
  role_delegated: string;
  task_description: string;
  delegated_by: string;
  effective_from: string;
  effective_to: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface ProfileItem {
  id: string;
  email: string;
  role: string;
  status: string;
}

// fable_system_review §3.2: standardized on SWR instead of a bare useEffect fetch.
async function fetchDelegations(studyId: string, isDemoMode: boolean): Promise<Delegation[]> {
  if (isDemoMode) return clientDemoStore.getDelegations(studyId) as unknown as Delegation[];
  const res = await fetch(`/api/admin/delegations?studyId=${studyId}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return Array.isArray(data) ? data : [];
}

export default function DelegationLogPage() {
  const { userRole, isDemoMode, currentUserEmail } = useSession();
  const { currentStudyId, studies } = useStudy();

  const [showPanel, setShowPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);

  const [form, setForm] = useState({
    delegatedTo: '',
    roleDelegated: 'site_coordinator',
    taskDescription: '',
    effectiveFrom: '',
    effectiveTo: '',
  });

  const canCreate = hasRole(userRole, DELEGATION_ROLES);

  const swrKey = currentStudyId ? `delegations:${currentStudyId}` : null;
  const { data: delegations = [], isLoading: loading, error: swrError, mutate: mutateDelegations } = useSWR(
    swrKey,
    () => fetchDelegations(currentStudyId!, isDemoMode)
  );
  const error = actionError ?? (swrError ? (swrError as Error).message : null);

  useEffect(() => {
    if (isDemoMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfiles(DEMO_USERS.map((u) => clientDemoStore.applyUserOverride(u)).filter((p) => p.status === 'active'));
      return;
    }
    fetch('/api/profiles')
      .then(r => r.ok ? r.json() : [])
      .then((data: ProfileItem[]) => setProfiles(data.filter(p => p.status === 'active')))
      .catch(() => setProfiles([]));
  }, [isDemoMode]);

  const handleCreate = async () => {
    if (!currentStudyId) return;
    setSaving(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        clientDemoStore.addDelegation({
          studyId: currentStudyId,
          delegatedTo: form.delegatedTo,
          roleDelegated: form.roleDelegated,
          taskDescription: form.taskDescription,
          delegatedBy: currentUserEmail,
          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo || undefined,
        });
      } else {
        const res = await fetch('/api/admin/delegations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studyId: currentStudyId,
            delegatedTo: form.delegatedTo,
            roleDelegated: form.roleDelegated,
            taskDescription: form.taskDescription,
            effectiveFrom: form.effectiveFrom,
            effectiveTo: form.effectiveTo || undefined,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      }
      setShowPanel(false);
      setForm({ delegatedTo: '', roleDelegated: 'site_coordinator', taskDescription: '', effectiveFrom: '', effectiveTo: '' });
      mutateDelegations();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      if (isDemoMode) {
        clientDemoStore.revokeDelegation(id, currentUserEmail);
      } else {
        const res = await fetch(`/api/admin/delegations/${id}`, { method: 'PATCH' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to revoke.');
      }
      mutateDelegations();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  if (!hasRole(userRole, READABLE_ROLES)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>
        You do not have access to the delegation log.
      </div>
    );
  }

  const studyName = (studies as any[])?.find((s: any) => s.id === currentStudyId)?.name ?? currentStudyId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            ADMINISTRATION / Delegation Log
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Delegation Log
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {canCreate && (
            <button
              onClick={() => setShowPanel(p => !p)}
              style={{ padding: '4px 10px', fontSize: 'var(--font-size-sm)', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              + New Delegation
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid #dc2626', padding: '8px 12px', fontSize: 'var(--font-size-md)', color: '#dc2626', flexShrink: 0 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, gap: '0', minHeight: 0 }}>
        {/* Main table */}
        <div style={{ flex: 1, border: '1px solid var(--border)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-md)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 1 }}>
                {['Delegated To', 'Role Delegated', 'Task', 'Delegated By', 'Study', 'From', 'To', 'Status', ''].map(col => (
                  <th key={col} style={thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading…</td></tr>
              ) : delegations.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                    {isDemoMode
                      ? 'No delegation records (demo mode — database not connected)'
                      : 'No delegation entries for this study.'}
                  </td>
                </tr>
              ) : delegations.map((d, i) => {
                const isRevoked = !!d.revoked_at;
                const isExpired = d.effective_to && new Date(d.effective_to) < new Date() && !isRevoked;
                const isActive = !isRevoked && !isExpired;
                const statusLabel = isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active';
                const statusColor = isRevoked ? '#dc2626' : isExpired ? 'var(--text-muted)' : 'var(--status-active)';
                return (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-surface)', height: 'var(--row-height)' }}>
                    <td style={tdStyle}>{d.delegated_to}</td>
                    <td style={tdStyle}>{d.role_delegated}</td>
                    <td style={{ ...tdStyle, maxWidth: '200px' }} title={d.task_description}>{d.task_description}</td>
                    <td style={tdStyle}>{d.delegated_by}</td>
                    <td style={tdStyle}>{studyName}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-data)', fontSize: 'var(--font-size-sm)' }}>{d.effective_from}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-data)', fontSize: 'var(--font-size-sm)' }}>{d.effective_to ?? '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ color: statusColor, fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>● {statusLabel}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', paddingRight: '8px' }}>
                      {canCreate && isActive && (
                        <button
                          onClick={() => handleRevoke(d.id)}
                          title="Revoke delegation"
                          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--status-dropped)', cursor: 'pointer', fontSize: 'var(--font-size-xs)', padding: '1px 6px' }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inline right panel */}
        {showPanel && (
          <div style={{
            width: '320px', flexShrink: 0, marginLeft: '1px',
            border: '1px solid var(--border)', background: 'var(--bg-editor)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)' }}>New Delegation Entry</span>
              <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 'var(--font-size-lg)' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={labelStyle}>Delegate To</div>
                <select
                  value={form.delegatedTo}
                  onChange={e => setForm(p => ({ ...p, delegatedTo: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">— Select user —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.email} ({p.role.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={labelStyle}>Role Delegated</div>
                <select value={form.roleDelegated} onChange={e => setForm(p => ({ ...p, roleDelegated: e.target.value }))} style={inputStyle}>
                  <option value="site_coordinator">Site Coordinator</option>
                  <option value="data_manager">Data Manager</option>
                  <option value="monitor">Monitor</option>
                  <option value="investigator">Sub-Investigator</option>
                </select>
              </div>
              <div>
                <div style={labelStyle}>Task / Duties</div>
                <textarea
                  placeholder="Describe the delegated task or duties…"
                  value={form.taskDescription}
                  onChange={e => setForm(p => ({ ...p, taskDescription: e.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
                />
              </div>
              <div>
                <div style={labelStyle}>Effective From</div>
                <input type="date" value={form.effectiveFrom} onChange={e => setForm(p => ({ ...p, effectiveFrom: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Effective To (optional)</div>
                <input type="date" value={form.effectiveTo} onChange={e => setForm(p => ({ ...p, effectiveTo: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '6px' }}>
              <button
                onClick={handleCreate}
                disabled={saving || !form.delegatedTo || !form.taskDescription || !form.effectiveFrom}
                style={{
                  flex: 1, padding: '6px', fontSize: 'var(--font-size-md)', fontWeight: 600,
                  background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
                  opacity: (saving || !form.delegatedTo || !form.taskDescription || !form.effectiveFrom) ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save Delegation'}
              </button>
              <button onClick={() => setShowPanel(false)} style={{ padding: '6px 12px', fontSize: 'var(--font-size-md)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)', padding: '5px 7px',
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', outline: 'none', width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px',
};

const thStyle: React.CSSProperties = {
  padding: '6px 8px', textAlign: 'left',
  fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0 8px', height: 'var(--row-height)',
  color: 'var(--text-primary)', borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
