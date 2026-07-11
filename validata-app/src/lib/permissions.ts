// Single source of truth for "who can do what". Defining these role sets in
// one place - rather than independently in auth-server.ts, supabase_setup.sql
// RLS helpers, PrimarySidebar.tsx, every page.tsx's own *_ROLES literal, and
// inline route-handler arrays - is what prevents the two layers from
// silently drifting apart (e.g. an endpoint accepting a role that RLS then
// rejects, or a mutation endpoint accidentally reusing a read-only role check).
//
// This module has NO server-only imports (no next/headers, no Supabase
// client) so it can be imported from both client components (pages,
// PrimarySidebar) and server code (auth-server.ts, route handlers) alike.
// The Postgres RLS policies in supabase_setup.sql are hand-mirrored against
// these exact sets (see the comments there) since SQL can't import TS -
// keeping them in one reviewable place here is what makes that mirroring
// checkable in code review instead of only discoverable by drift.

export const ADMIN_ROLES = ['admin', 'mentor'] as const;

// Roles that can create/edit clinical data (participants, measurements,
// consent records, adverse events, etc.)
export const EDIT_ROLES = ['admin', 'mentor', 'investigator', 'site_coordinator', 'data_manager'] as const;

// Oversight-only roles: can read broadly but must not be able to mutate
// clinical data or workflow records (queries, signatures, consent, ...).
export const OVERSIGHT_ROLES = ['monitor', 'auditor', 'irb_reviewer'] as const;

// Everyone who can read study-level operational/compliance data.
export const READABLE_ROLES = [...EDIT_ROLES, ...OVERSIGHT_ROLES] as const;

// Electronic signatures (ICH E6(R3) SIG-01/02/03) - investigator/mentor/admin only.
export const SIGNING_ROLES = ['admin', 'mentor', 'investigator'] as const;

// Delegation-of-duties log (ACC-03): investigators delegate tasks to site
// staff, so they must be able to create/revoke delegations, not just mentors/
// admins - this also fixes the RLS mismatch in supabase_setup.sql's
// can_manage_delegations(), which is now defined against this exact set.
export const DELEGATION_ROLES = ['admin', 'mentor', 'investigator'] as const;

// Raising a data query - matches the existing UI's QUERY_ROLES; monitors are
// intentionally included (a monitor is often who raises a query against a
// site's data), but auditor/irb_reviewer are not, since they must stay
// read-only.
export const QUERY_MUTATE_ROLES = ['admin', 'mentor', 'investigator', 'data_manager', 'monitor'] as const;

// Consent FORM VERSIONING (the master template) is protocol-level document
// control, reserved for the PI/sponsor - distinct from recording an
// individual participant's consent, which any EDIT_ROLES member can do.
export const CONSENT_VERSION_ROLES = ADMIN_ROLES;

// Audit log / access registry expose sensitive PII (emails, role/status
// history) - kept to a narrower set than the general READABLE_ROLES.
export const AUDIT_VIEWER_ROLES = ['admin', 'mentor', 'monitor', 'auditor'] as const;
export const ACCESS_REGISTRY_ROLES = ['admin', 'mentor', 'monitor', 'auditor'] as const;

export function hasRole(role: string | undefined | null, allowed: readonly string[]): boolean {
  return !!role && allowed.includes(role);
}
