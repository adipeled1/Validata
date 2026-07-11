"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudy } from '../../../context/StudyContext';
import { useSession } from '../../../context/SessionContext';
import { ADMIN_ROLES, DELEGATION_ROLES, hasRole } from '../../../lib/permissions';
import * as clientDemoStore from '../../../lib/clientDemoStore';
import { DEMO_USERS } from '../../../lib/demoData';
import { getDelegationStatus, isDelegationOpen, DELEGATION_STATUS_COLOR_VARS } from '../../../lib/delegationStatus';
import DelegationForm from '../../components/Delegation/DelegationForm';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

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
  const { userRole, userStatus, isDemoMode, currentUserEmail } = useSession();
  const router = useRouter();
  const canSeeApprovals = hasRole(userRole, ADMIN_ROLES);
  const canDelegate = hasRole(userRole, DELEGATION_ROLES);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [adverseEvents, setAdverseEvents] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [delegations, setDelegations] = useState<any[]>([]);
  // Full roster (mentor/admin only) - used only for the pending-approvals
  // count. Kept separate from delegateRoster below, which has a different
  // permission scope and a deliberately narrower shape.
  const [profiles, setProfiles] = useState<any[]>([]);
  // Active-user id/email/role roster (DELEGATION_ROLES-scoped) - used only
  // to resolve names for the "Delegated by Me" / "Recently Completed" cards.
  const [delegateRoster, setDelegateRoster] = useState<{ id: string; email: string; role: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const load = useCallback(() => {
    if (!currentStudyId) return;

    if (isDemoMode) {
      setAuditLogs(clientDemoStore.getAuditLog({ studyId: currentStudyId, scope: 'study' }).slice(0, 10));
      setQueries(clientDemoStore.getQueries(currentStudyId));
      setAdverseEvents(clientDemoStore.getAdverseEvents(currentStudyId));
      const demoProfiles = DEMO_USERS.map((u) => clientDemoStore.applyUserOverride(u));
      setProfiles(demoProfiles);
      setDelegateRoster(demoProfiles.filter((u) => u.status === 'active'));
      setPendingApprovals(canSeeApprovals ? demoProfiles.filter((u) => u.status === 'wait_approval').length : 0);
      setDelegations(clientDemoStore.getDelegations(currentStudyId));
      return;
    }

    setLoadingAudit(true);
    Promise.all([
      fetch(`/api/audit-log?studyId=${currentStudyId}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/queries?studyId=${currentStudyId}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/adverse-events?studyId=${currentStudyId}`).then((r) => r.ok ? r.json() : []),
      canSeeApprovals ? fetch('/api/profiles').then((r) => r.ok ? r.json() : []) : Promise.resolve([]),
      canDelegate ? fetch('/api/profiles?activeOnly=true').then((r) => r.ok ? r.json() : []) : Promise.resolve([]),
      fetch(`/api/admin/delegations?studyId=${currentStudyId}`).then((r) => r.ok ? r.json() : []),
    ]).then(([logs, qs, aes, profs, roster, dels]) => {
      setAuditLogs(logs.slice(0, 10));
      setQueries(qs);
      setAdverseEvents(Array.isArray(aes) ? aes : []);
      const profileList = Array.isArray(profs) ? profs : [];
      setProfiles(profileList);
      setDelegateRoster(Array.isArray(roster) ? roster : []);
      setPendingApprovals(canSeeApprovals ? profileList.filter((p: any) => p.status === 'wait_approval').length : 0);
      setDelegations(Array.isArray(dels) ? dels : []);
    }).finally(() => setLoadingAudit(false));
  }, [currentStudyId, canSeeApprovals, canDelegate, isDemoMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // My own user id. Resolved separately from the `profiles` list above (which
  // GET /api/profiles restricts to mentor/admin) via the one branch of that
  // same route any authenticated user can call for themselves - otherwise
  // "delegated to me" could never resolve for any other role.
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

  const delegateLabel = (id: string) => delegateRoster.find((p) => p.id === id)?.email ?? id;
  // delegated_by is a real UUID in production (session.user.id) but an email
  // string in demo mode (see clientDemoStore's addDelegation) - matching
  // "did I create this" has to branch on that rather than assume one shape.
  const isDelegatedByMe = (d: any) => (isDemoMode ? d.delegated_by === currentUserEmail : d.delegated_by === currentUserId);

  const delegatedToMe = delegations.filter((d) => d.delegated_to === currentUserId && isDelegationOpen(d));
  const openDelegatedByMe = canDelegate ? delegations.filter((d) => isDelegatedByMe(d) && isDelegationOpen(d)) : [];
  const recentlyCompletedByMe = canDelegate
    ? delegations
      .filter((d) => isDelegatedByMe(d) && getDelegationStatus(d) === 'completed' && Date.now() - new Date(d.completed_at).getTime() < FOURTEEN_DAYS_MS)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    : [];

  const handleCompleteDelegation = async (id: number) => {
    if (isDemoMode) {
      clientDemoStore.completeDelegation(id, currentUserEmail);
    } else {
      await fetch(`/api/admin/delegations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
    }
    load();
  };

  // Inline "+ New Delegation" form for the Delegated by Me card - a compact
  // version of the same create flow on the full Delegation Log page, so
  // delegation-capable roles don't have to leave the dashboard to delegate.
  const [showNewDelegation, setShowNewDelegation] = useState(false);
  const [delegationSaving, setDelegationSaving] = useState(false);
  const [delegationError, setDelegationError] = useState<string | null>(null);
  const [delegationForm, setDelegationForm] = useState({
    delegatedTo: '',
    taskDescription: '',
    effectiveFrom: '',
    effectiveTo: '',
  });

  const handleCreateDelegation = async () => {
    if (!currentStudyId) return;
    setDelegationSaving(true);
    setDelegationError(null);
    try {
      if (isDemoMode) {
        clientDemoStore.addDelegation({
          studyId: currentStudyId,
          delegatedTo: delegationForm.delegatedTo,
          taskDescription: delegationForm.taskDescription,
          delegatedBy: currentUserEmail,
          effectiveFrom: delegationForm.effectiveFrom,
          effectiveTo: delegationForm.effectiveTo || undefined,
        });
      } else {
        const res = await fetch('/api/admin/delegations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studyId: currentStudyId,
            delegatedTo: delegationForm.delegatedTo,
            taskDescription: delegationForm.taskDescription,
            effectiveFrom: delegationForm.effectiveFrom,
            effectiveTo: delegationForm.effectiveTo || undefined,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      }
      setShowNewDelegation(false);
      setDelegationForm({ delegatedTo: '', taskDescription: '', effectiveFrom: '', effectiveTo: '' });
      load();
    } catch (e) {
      setDelegationError((e as Error).message);
    } finally {
      setDelegationSaving(false);
    }
  };

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
        onClick: () => router.push('/user-registry'),
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
            OVERVIEW & ANALYSIS / Study Overview
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

      {/* Suspended: unlike 'deleted', a suspended account CAN still sign in
          and lands here same as anyone else - it's just blocked from every
          read/write by RLS (status must be 'active'), same underlying
          mechanism as an unassigned team_member, regardless of what role it
          holds. PrimarySidebar's isActive gate hides the same role-gated nav
          sections for a suspended user as it does for team_member, so this
          note explains why. Checked before the team_member note below so
          the two never show together - suspension is the more serious,
          more specific fact when both would technically apply. */}
      {userStatus === 'suspended' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--status-dropped)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          Your account access has been suspended — contact a mentor or admin. Most screens will be unavailable until access is restored.
        </div>
      ) : userRole === 'team_member' && (
        // Approved-but-unassigned team_member: a real, active account that
        // lands here (Study Overview is the app's default page and has no
        // RLS-gated data of its own), but has near-zero functional
        // permissions until a mentor assigns an operational role - the
        // Participants/Analysis/Queries sidebar sections are hidden for them
        // (see PrimarySidebar's showReadableData gate) for exactly this
        // reason, so this note explains why rather than leaving a sparse
        // sidebar unexplained.
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent-soft)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          Your account is active, but a mentor hasn't assigned you a study role yet — ask a mentor or admin to assign you one in the User Registry.
        </div>
      )}

      {/* Needs My Attention - consolidates everything a mentor would otherwise
          have to click through Queries, Adverse Events, and User Registry
          separately to discover. */}
      <AttentionPanel rows={attentionRows} />

      {/* Delegations row: cards on the left, small side panel (matching the
          Delegation Log page's side panel) on the right when "+ New" is
          open - kept right under Needs My Attention rather than at the
          bottom of the page since both sections are "things that need me
          to act". "Delegated to Me" stays above "Delegated by Me". */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Delegated to Me */}
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
              Delegated to Me ({delegatedToMe.length})
            </div>
            {delegatedToMe.length === 0 ? (
              <div style={{ padding: '12px', fontSize: 'var(--font-size-md)', color: 'var(--status-active)' }}>
                Nothing delegated to you right now.
              </div>
            ) : (
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {delegatedToMe.map((d, i) => (
                  <div
                    key={d.id}
                    style={{
                      padding: '4px 12px',
                      minHeight: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    <span
                      title={d.task_description}
                      style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                    >
                      {d.task_description}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}>
                      {d.effective_to ? `until ${d.effective_to}` : 'no end date'}
                    </span>
                    <button
                      onClick={() => handleCompleteDelegation(d.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--status-complete)',
                        color: 'var(--status-complete)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-xs)',
                        padding: '1px 6px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Mark Complete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delegated by Me + Recently Completed - one grouped card, lighter
              internal divider between the two, so it reads as one family
              ("things I handed out") rather than two separate concerns. */}
          {canDelegate && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Delegated by Me ({openDelegatedByMe.length})
                </span>
                <button
                  onClick={() => setShowNewDelegation((p) => !p)}
                  style={{ padding: '3px 8px', fontSize: 'var(--font-size-xs)', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  + New
                </button>
              </div>

              {openDelegatedByMe.length === 0 ? (
                <div style={{ padding: '12px', fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>
                  Nothing open that you've delegated.
                </div>
              ) : (
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {openDelegatedByMe.map((d, i) => (
                    <div
                      key={d.id}
                      style={{
                        padding: '4px 12px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{delegateLabel(d.delegated_to)}</span>
                      <span
                        title={d.task_description}
                        style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                      >
                        {d.task_description}
                      </span>
                      <span style={{ color: DELEGATION_STATUS_COLOR_VARS.active, fontSize: 'var(--font-size-xs)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ● Active
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Lighter separation than the outer card border - same family,
                  different status, not a new concern. */}
              <div
                style={{
                  padding: '6px 12px',
                  borderTop: '1px solid var(--border)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                }}
              >
                Recently Completed (last 14 days)
              </div>
              {recentlyCompletedByMe.length === 0 ? (
                <div style={{ padding: '12px', fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>
                  Nothing completed in the last two weeks.
                </div>
              ) : (
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {recentlyCompletedByMe.map((d, i) => (
                    <div
                      key={d.id}
                      style={{
                        padding: '4px 12px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{delegateLabel(d.delegated_to)}</span>
                      <span
                        title={d.task_description}
                        style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                      >
                        {d.task_description}
                      </span>
                      <span style={{ color: DELEGATION_STATUS_COLOR_VARS.completed, fontSize: 'var(--font-size-xs)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ● Completed {new Date(d.completed_at).toISOString().slice(0, 10)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Small side panel, matching the Delegation Log page's "+ New
            Delegation" panel exactly (same width, header, and form). */}
        {canDelegate && showNewDelegation && (
          <div
            style={{
              width: '320px', flexShrink: 0,
              border: '1px solid var(--border)', background: 'var(--bg-editor)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)' }}>New Delegation Entry</span>
              <button onClick={() => setShowNewDelegation(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 'var(--font-size-lg)' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <DelegationForm
                roster={delegateRoster}
                form={delegationForm}
                onChange={(field, value) => setDelegationForm((p) => ({ ...p, [field]: value }))}
                onSubmit={handleCreateDelegation}
                onCancel={() => setShowNewDelegation(false)}
                saving={delegationSaving}
                error={delegationError}
              />
            </div>
          </div>
        )}
      </div>

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
                {q.status === 'open' ? (
                  <button
                    onClick={() => router.push(`/queries?id=${q.id}`)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--status-dropped)',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--status-dropped)';
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {q.status.toUpperCase()}
                  </button>
                ) : (
                  <span style={{ color: 'var(--accent-soft)', fontSize: 'var(--font-size-xs)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {q.status.toUpperCase()}
                  </span>
                )}
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
