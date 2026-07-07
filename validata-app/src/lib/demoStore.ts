// A single in-memory, module-scoped store backing every "demo mode" mutation
// in the app (audit log, signatures, queries, adverse events, consent,
// delegations, study lock state, and user role/status overrides).
//
// Why this exists: every API route already had a `session.isDemo` branch that
// echoed back a fake "success" object without persisting anything, while the
// matching GET routes unconditionally returned `[]` in demo mode. That made
// every demo-mode mutation a dead end — it looked like it worked, but no
// other page (or even the same page after a refetch) would ever see it. This
// module is the one place demo-mode reads and writes meet, so a mentor
// clicking through the app in demo mode sees the same consistent, growing
// state everywhere, without every route re-inventing its own fake persistence.
//
// This is intentionally a plain in-process array/map, not a database: it's
// only meant to make a *single running server process* (e.g. `next dev` or
// `next start` hosting a live demo) behave consistently for the length of
// that process's life. It is not shared across serverless instances and does
// not survive a restart — acceptable for a demo, not a substitute for
// Supabase once one is connected.

export type AuditEntry = {
  id: string;
  occurred_at: string;
  actor_email: string;
  table_name: string;
  record_id: string;
  action: string;
  reason: string | null;
  study_id: string | null;
  // 'study' entries show up in that study's Audit Trail; 'system' entries
  // (login, user management, study create/lock) show up in the System Log
  // regardless of which study is currently selected.
  scope: 'study' | 'system';
};

export type DemoSignature = {
  id: number;
  study_id: string;
  signer_email: string;
  record_type: string;
  record_id: string;
  milestone: string;
  meaning: string;
  signed_at: string;
};

export type DemoQuery = {
  id: number;
  study_id: string;
  record_table: string;
  record_id: string;
  field_name: string;
  severity: string;
  query_text: string;
  status: string;
  raised_by: string;
  raised_at: string;
  answered_by?: string | null;
  answered_at?: string | null;
  answer_text?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  closed_by?: string | null;
  closed_at?: string | null;
};

export type DemoAdverseEvent = {
  id: string;
  study_id: string;
  participant_id: string;
  ae_type: string;
  description: string;
  severity: string;
  causality: string;
  expectedness: string;
  report_date: string;
  onset_date: string | null;
  authority_deadline: string | null;
  authority_submitted_at: string | null;
  resolution_date: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
};

export type DemoConsentVersion = {
  id: number;
  study_id: string;
  version: string;
  irb_approved_at: string | null;
  activated_at: string | null;
  content_hash: string | null;
};

export type DemoConsentRecord = {
  id: string;
  study_id: string;
  participant_id: string;
  form_version_id: number;
  method: string;
  copy_delivered: boolean;
  witnessed_by: string | null;
  notes: string | null;
  created_at: string;
};

export type DemoDelegation = {
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
};

export type StudyLockOverride = {
  lock_state: 'locked' | 'open';
  locked_at: string | null;
  locked_by: string | null;
  lock_reason: string | null;
};

export type UserOverride = {
  role?: string;
  status?: string;
  deleted_at?: string | null;
};

// Next.js (particularly under Turbopack dev) can compile Server Actions and
// Route Handlers into separate module graphs, so two files that both
// `import` this module are not guaranteed to get the same module instance -
// plain module-level `const` state was observed to silently diverge between
// a Server Action (src/app/actions/participants.ts) and a Route Handler
// (src/app/api/audit-log/route.ts) even within the same running process.
// Anchoring the mutable state on `globalThis` (the same pattern used for
// singletons like a shared Prisma client in Next.js dev) guarantees every
// caller reads and writes the exact same objects, regardless of which
// module graph pulled this file in.
type DemoStoreState = {
  counter: number;
  auditLog: AuditEntry[];
  signatures: DemoSignature[];
  queries: DemoQuery[];
  adverseEvents: DemoAdverseEvent[];
  consentVersions: DemoConsentVersion[];
  consentRecords: DemoConsentRecord[];
  delegations: DemoDelegation[];
  studyLockOverrides: Map<string, StudyLockOverride>;
  userOverrides: Map<string, UserOverride>;
};

const GLOBAL_KEY = '__validataDemoStore__';

function initState(): DemoStoreState {
  return {
    counter: 1000,
    auditLog: [],
    signatures: [],
    queries: [],
    adverseEvents: [],
    consentVersions: [],
    consentRecords: [],
    delegations: [],
    studyLockOverrides: new Map(),
    userOverrides: new Map(),
  };
}

const globalForDemoStore = globalThis as typeof globalThis & { [GLOBAL_KEY]?: DemoStoreState };
const state: DemoStoreState = globalForDemoStore[GLOBAL_KEY] ?? (globalForDemoStore[GLOBAL_KEY] = initState());

function nextId(): number {
  return state.counter++;
}

const auditLog = state.auditLog;
const signatures = state.signatures;
const queries = state.queries;
const adverseEvents = state.adverseEvents;
const consentVersions = state.consentVersions;
const consentRecords = state.consentRecords;
const delegations = state.delegations;
const studyLockOverrides = state.studyLockOverrides;
const userOverrides = state.userOverrides;

// ---------------------------------------------------------------------------
// Audit log — every add* function below also calls this, so Audit Trail /
// Study Log / System Log all read from one consistent trail instead of each
// resource needing its own separate "did this get logged" bookkeeping.
// ---------------------------------------------------------------------------

export function addAuditEntry(entry: {
  actorEmail: string;
  tableName: string;
  recordId: string;
  action: string;
  reason?: string | null;
  studyId?: string | null;
  scope?: 'study' | 'system';
}): AuditEntry {
  const row: AuditEntry = {
    id: `AUD-${nextId()}`,
    occurred_at: new Date().toISOString(),
    actor_email: entry.actorEmail,
    table_name: entry.tableName,
    record_id: entry.recordId,
    action: entry.action,
    reason: entry.reason ?? null,
    study_id: entry.studyId ?? null,
    scope: entry.scope ?? 'study',
  };
  auditLog.unshift(row);
  return row;
}

export function getAuditLog(filters: {
  studyId?: string | null;
  scope?: 'study' | 'system';
  actor?: string | null;
  action?: string | null;
  from?: string | null;
  to?: string | null;
} = {}): AuditEntry[] {
  return auditLog.filter((row) => {
    if (filters.scope && row.scope !== filters.scope) return false;
    if (filters.studyId && row.study_id !== filters.studyId) return false;
    if (filters.actor && row.actor_email !== filters.actor) return false;
    if (filters.action && row.action !== filters.action) return false;
    if (filters.from && row.occurred_at < filters.from) return false;
    if (filters.to && row.occurred_at > filters.to) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Signatures (Electronic Signatures / Endorse Data)
// ---------------------------------------------------------------------------

export function addSignature(input: {
  studyId: string;
  signerEmail: string;
  recordType: string;
  recordId: string;
  milestone: string;
  meaning: string;
}): DemoSignature {
  const row: DemoSignature = {
    id: nextId(),
    study_id: input.studyId,
    signer_email: input.signerEmail,
    record_type: input.recordType,
    record_id: input.recordId,
    milestone: input.milestone,
    meaning: input.meaning,
    signed_at: new Date().toISOString(),
  };
  signatures.unshift(row);
  addAuditEntry({
    actorEmail: input.signerEmail,
    tableName: 'signatures',
    recordId: String(row.id),
    action: 'SIGN_OFF',
    studyId: input.studyId,
    reason: `Endorsed ${input.milestone.replace(/_/g, ' ')}`,
  });
  return row;
}

export function getSignatures(studyId: string): DemoSignature[] {
  return signatures.filter((s) => s.study_id === studyId);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function addQuery(input: {
  studyId: string;
  recordTable: string;
  recordId: string;
  fieldName: string;
  severity: string;
  queryText: string;
  raisedBy: string;
}): DemoQuery {
  const row: DemoQuery = {
    id: nextId(),
    study_id: input.studyId,
    record_table: input.recordTable,
    record_id: input.recordId,
    field_name: input.fieldName,
    severity: input.severity,
    query_text: input.queryText,
    status: 'open',
    raised_by: input.raisedBy,
    raised_at: new Date().toISOString(),
  };
  queries.unshift(row);
  addAuditEntry({
    actorEmail: input.raisedBy,
    tableName: 'queries',
    recordId: String(row.id),
    action: 'INSERT',
    studyId: input.studyId,
    reason: `Query raised against ${input.recordTable}/${input.recordId}`,
  });
  return row;
}

export function getQueries(studyId: string): DemoQuery[] {
  return queries.filter((q) => q.study_id === studyId);
}

export function updateQuery(
  id: number,
  updates: { status: string; answerText?: string; actorEmail: string }
): DemoQuery | null {
  const row = queries.find((q) => q.id === id);
  if (!row) return null;

  const now = new Date().toISOString();
  row.status = updates.status;
  if (updates.status === 'answered') {
    row.answered_by = updates.actorEmail;
    row.answered_at = now;
    if (updates.answerText) row.answer_text = updates.answerText;
  } else if (updates.status === 'resolved') {
    row.resolved_by = updates.actorEmail;
    row.resolved_at = now;
  } else if (updates.status === 'closed') {
    row.closed_by = updates.actorEmail;
    row.closed_at = now;
  }

  addAuditEntry({
    actorEmail: updates.actorEmail,
    tableName: 'queries',
    recordId: String(id),
    action: 'STATUS_CHANGE',
    studyId: row.study_id,
    reason: `Query Q-${String(id).padStart(3, '0')} -> ${updates.status}`,
  });

  return row;
}

// ---------------------------------------------------------------------------
// Adverse Events
// ---------------------------------------------------------------------------

export function addAdverseEvent(input: {
  studyId: string;
  participantId: string;
  aeType: string;
  description: string;
  severity: string;
  causality: string;
  expectedness: string;
  reportDate: string;
  onsetDate?: string | null;
  notes?: string | null;
  authorityDeadline: string | null;
  actorEmail: string;
}): DemoAdverseEvent {
  const row: DemoAdverseEvent = {
    id: `AE-${nextId()}`,
    study_id: input.studyId,
    participant_id: input.participantId,
    ae_type: input.aeType,
    description: input.description,
    severity: input.severity,
    causality: input.causality,
    expectedness: input.expectedness,
    report_date: input.reportDate,
    onset_date: input.onsetDate ?? null,
    authority_deadline: input.authorityDeadline,
    authority_submitted_at: null,
    resolution_date: null,
    outcome: null,
    notes: input.notes ?? null,
    created_at: new Date().toISOString(),
  };
  adverseEvents.unshift(row);
  addAuditEntry({
    actorEmail: input.actorEmail,
    tableName: 'adverse_events',
    recordId: row.id,
    action: 'INSERT',
    studyId: input.studyId,
    reason: `Reported ${input.aeType.toUpperCase()} for ${input.participantId}`,
  });
  return row;
}

export function getAdverseEvents(studyId: string): DemoAdverseEvent[] {
  return adverseEvents.filter((e) => e.study_id === studyId);
}

export function updateAdverseEvent(
  id: string,
  updates: { resolutionDate?: string; outcome?: string; authoritySubmittedAt?: string; notes?: string; actorEmail: string }
): DemoAdverseEvent | null {
  const row = adverseEvents.find((e) => e.id === id);
  if (!row) return null;

  if (updates.resolutionDate) row.resolution_date = updates.resolutionDate;
  if (updates.outcome) row.outcome = updates.outcome;
  if (updates.authoritySubmittedAt) row.authority_submitted_at = updates.authoritySubmittedAt;
  if (updates.notes) row.notes = updates.notes;

  addAuditEntry({
    actorEmail: updates.actorEmail,
    tableName: 'adverse_events',
    recordId: id,
    action: 'UPDATE',
    studyId: row.study_id,
    reason: updates.authoritySubmittedAt ? 'Marked as submitted to authority' : 'Adverse event updated',
  });

  return row;
}

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

export function addConsentVersion(input: {
  studyId: string;
  version: string;
  irbApprovedAt?: string | null;
  activatedAt?: string | null;
  contentHash?: string | null;
  actorEmail: string;
}): DemoConsentVersion {
  const row: DemoConsentVersion = {
    id: nextId(),
    study_id: input.studyId,
    version: input.version,
    irb_approved_at: input.irbApprovedAt ?? null,
    activated_at: input.activatedAt ?? null,
    content_hash: input.contentHash ?? null,
  };
  consentVersions.unshift(row);
  addAuditEntry({
    actorEmail: input.actorEmail,
    tableName: 'consent_form_versions',
    recordId: String(row.id),
    action: 'INSERT',
    studyId: input.studyId,
    reason: `Created consent form version ${input.version}`,
  });
  return row;
}

export function getConsentVersions(studyId: string): DemoConsentVersion[] {
  return consentVersions.filter((v) => v.study_id === studyId);
}

export function addConsentRecord(input: {
  studyId: string;
  participantId: string;
  formVersionId: number;
  method: string;
  copyDelivered: boolean;
  witnessedBy?: string | null;
  notes?: string | null;
  actorEmail: string;
}): DemoConsentRecord {
  const row: DemoConsentRecord = {
    id: `CR-${nextId()}`,
    study_id: input.studyId,
    participant_id: input.participantId,
    form_version_id: input.formVersionId,
    method: input.method,
    copy_delivered: input.copyDelivered,
    witnessed_by: input.witnessedBy ?? null,
    notes: input.notes ?? null,
    created_at: new Date().toISOString(),
  };
  consentRecords.unshift(row);
  addAuditEntry({
    actorEmail: input.actorEmail,
    tableName: 'consent_records',
    recordId: row.id,
    action: 'INSERT',
    studyId: input.studyId,
    reason: `Recorded consent for ${input.participantId}`,
  });
  return row;
}

export function getConsentRecords(studyId: string): DemoConsentRecord[] {
  return consentRecords.filter((r) => r.study_id === studyId);
}

// ---------------------------------------------------------------------------
// Delegations
// ---------------------------------------------------------------------------

export function addDelegation(input: {
  studyId: string;
  delegatedTo: string;
  roleDelegated: string;
  taskDescription: string;
  delegatedBy: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}): DemoDelegation {
  const row: DemoDelegation = {
    id: nextId(),
    study_id: input.studyId,
    delegated_to: input.delegatedTo,
    role_delegated: input.roleDelegated,
    task_description: input.taskDescription,
    delegated_by: input.delegatedBy,
    effective_from: input.effectiveFrom,
    effective_to: input.effectiveTo ?? null,
    revoked_at: null,
    created_at: new Date().toISOString(),
  };
  delegations.unshift(row);
  addAuditEntry({
    actorEmail: input.delegatedBy,
    tableName: 'delegations',
    recordId: String(row.id),
    action: 'INSERT',
    studyId: input.studyId,
    reason: `Delegated ${input.roleDelegated.replace(/_/g, ' ')} to ${input.delegatedTo}`,
  });
  return row;
}

export function getDelegations(studyId: string): DemoDelegation[] {
  return delegations.filter((d) => d.study_id === studyId);
}

export function revokeDelegation(id: number, actorEmail: string): DemoDelegation | null {
  const row = delegations.find((d) => d.id === id);
  if (!row || row.revoked_at) return null;
  row.revoked_at = new Date().toISOString();
  addAuditEntry({
    actorEmail,
    tableName: 'delegations',
    recordId: String(id),
    action: 'UPDATE',
    studyId: row.study_id,
    reason: 'Delegation revoked',
  });
  return row;
}

// ---------------------------------------------------------------------------
// Study lock state
// ---------------------------------------------------------------------------

export function getStudyLockOverride(studyId: string): StudyLockOverride | null {
  return studyLockOverrides.get(studyId) ?? null;
}

export function setStudyLock(input: {
  studyId: string;
  studyName: string;
  locked: boolean;
  reason: string;
  actorEmail: string;
}): StudyLockOverride {
  const override: StudyLockOverride = input.locked
    ? { lock_state: 'locked', locked_at: new Date().toISOString(), locked_by: input.actorEmail, lock_reason: input.reason }
    : { lock_state: 'open', locked_at: null, locked_by: null, lock_reason: input.reason };
  studyLockOverrides.set(input.studyId, override);
  addAuditEntry({
    actorEmail: input.actorEmail,
    tableName: 'studies',
    recordId: input.studyId,
    action: input.locked ? 'LOCK' : 'UNLOCK',
    studyId: input.studyId,
    reason: input.reason,
    scope: 'system',
  });
  return override;
}

// ---------------------------------------------------------------------------
// User role/status overrides (User Registry approve/suspend/role-change)
// ---------------------------------------------------------------------------

export function getUserOverride(userId: string): UserOverride | null {
  return userOverrides.get(userId) ?? null;
}

export function setUserOverride(input: {
  userId: string;
  userEmail: string;
  role?: string;
  status?: string;
  actorEmail: string;
}): UserOverride {
  const existing = userOverrides.get(input.userId) ?? {};
  const merged: UserOverride = { ...existing };
  if (input.role !== undefined) merged.role = input.role;
  if (input.status !== undefined) {
    merged.status = input.status;
    if (input.status === 'active') merged.deleted_at = null;
  }
  userOverrides.set(input.userId, merged);

  addAuditEntry({
    actorEmail: input.actorEmail,
    tableName: 'profiles',
    recordId: input.userId,
    action: 'ROLE_CHANGE',
    studyId: null,
    reason: input.status
      ? `${input.userEmail} status -> ${input.status}`
      : `${input.userEmail} role -> ${input.role}`,
    scope: 'system',
  });

  return merged;
}

export function removeUserOverride(userId: string, userEmail: string, actorEmail: string): void {
  userOverrides.delete(userId);
  addAuditEntry({
    actorEmail,
    tableName: 'profiles',
    recordId: userId,
    action: 'SOFT_DELETE',
    studyId: null,
    reason: `${userEmail} removed`,
    scope: 'system',
  });
}

export function applyUserOverride<T extends { id: string; role: string; status: string; deleted_at?: string | null }>(
  user: T
): T {
  const override = userOverrides.get(user.id);
  if (!override) return user;
  return { ...user, ...override };
}

// ---------------------------------------------------------------------------
// System-level events not tied to a specific resource above (login, exports)
// ---------------------------------------------------------------------------

export function logSystemEvent(input: { actorEmail: string; action: string; reason?: string; studyId?: string | null }): void {
  addAuditEntry({
    actorEmail: input.actorEmail,
    tableName: 'system',
    recordId: '-',
    action: input.action,
    studyId: input.studyId ?? null,
    reason: input.reason ?? null,
    scope: 'system',
  });
}
