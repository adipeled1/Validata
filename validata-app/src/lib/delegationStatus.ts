// Single source of truth for "what state is this delegation in," shared by
// the Delegation Log table and the Study Overview dashboard cards, so the
// two can't quietly define "active"/"closed" differently from each other.
//
// Mirrors enforce_delegations_lifecycle() in supabase_setup.sql: revoked,
// completed, and past-its-own-effective_to are all equally terminal states -
// only their label and provenance differ (who closed it and how). Revoked
// and completed are real, permanent, stored facts; expired is a computed
// label only (nothing is ever written when a delegation's date passes) - see
// that trigger for why the backend still treats expiry as just as real.

export type DelegationLike = {
  revoked_at: string | null;
  completed_at: string | null;
  effective_to: string | null;
};

export type DelegationStatus = 'active' | 'completed' | 'revoked' | 'expired';

export function getDelegationStatus(d: DelegationLike): DelegationStatus {
  if (d.revoked_at) return 'revoked';
  if (d.completed_at) return 'completed';
  if (d.effective_to && new Date(d.effective_to) < new Date()) return 'expired';
  return 'active';
}

export function isDelegationOpen(d: DelegationLike): boolean {
  return getDelegationStatus(d) === 'active';
}

export const DELEGATION_STATUS_LABELS: Record<DelegationStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  revoked: 'Revoked',
  expired: 'Expired',
};

// Reuses the app's existing status color vocabulary (globals.css) rather
// than inventing new colors - --status-complete already means "Completed"
// on the Participants screen, --status-dropped is already the Revoke
// button's own color, --text-muted already means "Expired" here.
export const DELEGATION_STATUS_COLOR_VARS: Record<DelegationStatus, string> = {
  active: 'var(--status-active)',
  completed: 'var(--status-complete)',
  revoked: 'var(--status-dropped)',
  expired: 'var(--text-muted)',
};
