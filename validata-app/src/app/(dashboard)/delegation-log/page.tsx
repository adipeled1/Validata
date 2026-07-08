"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import { READABLE_ROLES, DELEGATION_ROLES, hasRole } from '../../../lib/permissions';
import * as clientDemoStore from '../../../lib/clientDemoStore';
import { DEMO_USERS } from '../../../lib/demoData';
import { getDelegationStatus, DELEGATION_STATUS_LABELS, DELEGATION_STATUS_COLOR_VARS } from '../../../lib/delegationStatus';
import DelegationForm from '../../components/Delegation/DelegationForm';

interface Delegation {
  id: number;
  study_id: string;
  delegated_to: string;
  task_description: string;
  delegated_by: string;
  effective_from: string;
  effective_to: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
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
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const [form, setForm] = useState({
    delegatedTo: '',
    taskDescription: '',
    effectiveFrom: '',
    effectiveTo: '',
  });

  const canCreate = hasRole(userRole, DELEGATION_ROLES);
  const delegateLabel = (id: string) => profiles.find((p) => p.id === id)?.email ?? id;

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
    // Narrow, DELEGATION_ROLES-scoped roster (id/email/role only, active users
    // only) - not the full mentor-only listing behind plain GET /api/profiles,
    // which this page's "Delegate To" picker has no business seeing (it never
    // needs candidate/pending/suspended accounts or their status history).
    fetch('/api/profiles?activeOnly=true')
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; email: string; role: string }[]) =>
        setProfiles(data.map((p) => ({ ...p, status: 'active' })))
      )
      .catch(() => setProfiles([]));
  }, [isDemoMode]);

  // Resolved separately from the profiles list above, via the one branch of
  // GET /api/profiles any authenticated user can call for themselves -
  // "is this delegated to me" must work for every
  // role, not just admin/mentor.
  useEffect(() => {
    if (isDemoMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentUserId(DEMO_USERS.find((u) => u.email === currentUserEmail)?.id);
      return;
    }
    fetch('/api/profiles?current=true')
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { id: string } | null) => setCurrentUserId(p?.id))
      .catch(() => setCurrentUserId(undefined));
  }, [isDemoMode, currentUserEmail]);

  const handleCreate = async () => {
    if (!currentStudyId) return;
    setSaving(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        clientDemoStore.addDelegation({
          studyId: currentStudyId,
          delegatedTo: form.delegatedTo,
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
            taskDescription: form.taskDescription,
            effectiveFrom: form.effectiveFrom,
            effectiveTo: form.effectiveTo || undefined,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      }
      setShowPanel(false);
      setForm({ delegatedTo: '', taskDescription: '', effectiveFrom: '', effectiveTo: '' });
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
        if (!clientDemoStore.revokeDelegation(id, currentUserEmail)) {
          throw new Error('Delegation not found or already closed.');
        }
      } else {
        const res = await fetch(`/api/admin/delegations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'revoke' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to revoke.');
      }
      mutateDelegations();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  // Delegate-initiated - distinct from Revoke. Marking a delegation complete
  // means the delegate finished the task; it never touches revoked_at/by,
  // and is unavailable once the row is already closed (completed, revoked,
  // or past its own effective_to date).
  const handleComplete = async (id: number) => {
    try {
      if (isDemoMode) {
        if (!clientDemoStore.completeDelegation(id, currentUserEmail)) {
          throw new Error('Delegation not found, not yours, or already closed.');
        }
      } else {
        const res = await fetch(`/api/admin/delegations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to mark complete.');
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
            DELEGATION / Delegation Log
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
                {['Delegated To', 'Task', 'Delegated By', 'Study', 'From', 'To', 'Status', ''].map(col => (
                  <th key={col} style={thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading…</td></tr>
              ) : delegations.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                    {isDemoMode
                      ? 'No delegation records (demo mode — database not connected)'
                      : 'No delegation entries for this study.'}
                  </td>
                </tr>
              ) : delegations.map((d, i) => {
                const status = getDelegationStatus(d);
                const isActive = status === 'active';
                const isMine = d.delegated_to === currentUserId;
                return (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-surface)', height: 'var(--row-height)' }}>
                    <td style={tdStyle}>{delegateLabel(d.delegated_to)}</td>
                    <td style={{ ...tdStyle, maxWidth: '280px' }} title={d.task_description}>{d.task_description}</td>
                    <td style={tdStyle}>{delegateLabel(d.delegated_by)}</td>
                    <td style={tdStyle}>{studyName}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-data)', fontSize: 'var(--font-size-sm)' }}>{d.effective_from}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-data)', fontSize: 'var(--font-size-sm)' }}>{d.effective_to ?? '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ color: DELEGATION_STATUS_COLOR_VARS[status], fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                        ● {DELEGATION_STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', paddingRight: '8px', whiteSpace: 'nowrap' }}>
                      {isActive && isMine && (
                        <button
                          onClick={() => handleComplete(d.id)}
                          title="Mark this delegation complete"
                          style={{ background: 'transparent', border: '1px solid var(--status-complete)', color: 'var(--status-complete)', cursor: 'pointer', fontSize: 'var(--font-size-xs)', padding: '1px 6px', marginRight: '4px' }}
                        >
                          Mark Complete
                        </button>
                      )}
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <DelegationForm
                roster={profiles}
                form={form}
                onChange={(field, value) => setForm(p => ({ ...p, [field]: value }))}
                onSubmit={handleCreate}
                onCancel={() => setShowPanel(false)}
                saving={saving}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
