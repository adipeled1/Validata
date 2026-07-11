"use client";

// The browser-side counterpart to lib/demoStore.ts, and - for anyone running
// the hosted demo - the one that actually matters.
//
// Why this exists: the server-side demoStore.ts holds one shared object per
// running process. That's fine for a single long-lived `next start` process,
// but it breaks two things a public, hosted, multi-visitor demo needs:
//   1. Isolation - every visitor should get their own sandbox. A global
//      server-side store means visitor A's clicks (raising a query, locking
//      a study, approving a user) are immediately visible to visitor B.
//   2. Vercel compatibility - serverless functions are stateless and
//      ephemeral; a different invocation of the same route can land on a
//      different instance with its own empty copy of any module-level state,
//      so server-side "persistence" silently stops persisting.
//
// Storing demo state in sessionStorage instead solves both: it's scoped to
// one browser tab (never shared with anyone else) and reset the moment that
// tab/window closes (sessionStorage's built-in lifetime, no cleanup code
// needed) - "closes it and comes back, brand new" is just what sessionStorage
// already does.
//
// Shape mirrors demoStore.ts closely on purpose, so call sites read the same
// either way and this file's logic can be sanity-checked against that one.

import { DEMO_USERS } from './demoData';

export type AuditEntry = {
  id: string;
  occurred_at: string;
  actor_email: string;
  table_name: string;
  record_id: string;
  action: string;
  reason: string | null;
  study_id: string | null;
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
  task_description: string;
  delegated_by: string;
  effective_from: string;
  effective_to: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
};

// A delegation is closed the same way whether a person revoked it, a person
// completed it, or its effective_to date simply passed unattended - once
// closed, none of the three can happen to it again.
function isDelegationClosed(d: Pick<DemoDelegation, 'revoked_at' | 'completed_at' | 'effective_to'>): boolean {
  return !!d.revoked_at || !!d.completed_at || (!!d.effective_to && new Date(d.effective_to) < new Date());
}

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

type ClientDemoState = {
  counter: number;
  auditLog: AuditEntry[];
  signatures: DemoSignature[];
  queries: DemoQuery[];
  adverseEvents: DemoAdverseEvent[];
  consentVersions: DemoConsentVersion[];
  consentRecords: DemoConsentRecord[];
  delegations: DemoDelegation[];
  studyLockOverrides: Record<string, StudyLockOverride>;
  userOverrides: Record<string, UserOverride>;
};

const STORAGE_KEY = 'validata_demo_state_v1';

function initState(): ClientDemoState {
  const query1: DemoQuery = {
    id: 101,
    study_id: 'demo-study-1',
    record_table: 'measurements',
    record_id: 'P-1001',
    field_name: 'goniometer',
    severity: 'major',
    query_text: 'Measurement angle of 15° deviates significantly from goniometer benchmark of 45°. Please verify.',
    status: 'open',
    raised_by: 'monitor@demo.com',
    raised_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  };

  const query2: DemoQuery = {
    id: 102,
    study_id: 'demo-study-1',
    record_table: 'participants',
    record_id: 'P-1003',
    field_name: 'consent',
    severity: 'critical',
    query_text: 'Informed consent form version missing in electronic records. Please upload copy of consent.',
    status: 'open',
    raised_by: 'monitor@demo.com',
    raised_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  };

  const del1: DemoDelegation = {
    id: 201,
    study_id: 'demo-study-1',
    delegated_to: 'demo-investigator-id',
    task_description: 'Perform interim review of active participant measurements and address open queries.',
    delegated_by: 'mentor@demo.com',
    effective_from: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    effective_to: null,
    revoked_at: null,
    revoked_by: null,
    completed_at: null,
    completed_by: null,
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  };

  const del3: DemoDelegation = {
    id: 203,
    study_id: 'demo-study-1',
    delegated_to: 'demo-mentor-id',
    task_description: 'Approve pending user registries and sign off on study milestone data_lock.',
    delegated_by: 'investigator@demo.com',
    effective_from: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    effective_to: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    revoked_at: null,
    revoked_by: null,
    completed_at: null,
    completed_by: null,
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  };

  const del4: DemoDelegation = {
    id: 204,
    study_id: 'demo-study-1',
    delegated_to: 'demo-investigator-id',
    task_description: 'Review and sign off on phase-1 baseline safety reports.',
    delegated_by: 'mentor@demo.com',
    effective_from: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    effective_to: null,
    revoked_at: null,
    revoked_by: null,
    completed_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    completed_by: 'investigator@demo.com',
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  };

  const del5: DemoDelegation = {
    id: 205,
    study_id: 'demo-study-1',
    delegated_to: 'demo-investigator-id',
    task_description: 'Perform safety assessments on adverse events reported in the last 7 days.',
    delegated_by: 'mentor@demo.com',
    effective_from: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    effective_to: null,
    revoked_at: null,
    revoked_by: null,
    completed_at: null,
    completed_by: null,
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  };

  // Seeded so the Consent Records page (and the Participants view's
  // "consent on file" indicator) aren't empty on first load - a mentor/
  // reviewer can see the full flow immediately instead of having to create
  // a form version themselves first.
  const consentV1: DemoConsentVersion = {
    id: 301,
    study_id: 'demo-study-1',
    version: 'v1.0',
    irb_approved_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    activated_at: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
    content_hash: 'a3f5c9e21b7d4f68091c2e5a7b3d9f1e4c6a8b0d2f4e6c8a0b2d4f6e8c0a2b4d',
  };

  const consentRecord1: DemoConsentRecord = {
    id: 'CR-401',
    study_id: 'demo-study-1',
    participant_id: 'P-1001',
    form_version_id: consentV1.id,
    method: 'written',
    copy_delivered: true,
    witnessed_by: null,
    notes: null,
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
  };

  return {
    counter: 1000,
    auditLog: [
      {
        id: 'AUD-101',
        occurred_at: query1.raised_at,
        actor_email: query1.raised_by,
        table_name: 'queries',
        record_id: '101',
        action: 'INSERT',
        reason: 'Query raised against measurements/P-1001',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-102',
        occurred_at: query2.raised_at,
        actor_email: query2.raised_by,
        table_name: 'queries',
        record_id: '102',
        action: 'INSERT',
        reason: 'Query raised against participants/P-1003',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-201',
        occurred_at: del1.created_at,
        actor_email: del1.delegated_by,
        table_name: 'delegations',
        record_id: '201',
        action: 'INSERT',
        reason: 'Delegated "Perform interim review of active participant measurements and address open queries." to demo-investigator-id',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-203',
        occurred_at: del3.created_at,
        actor_email: del3.delegated_by,
        table_name: 'delegations',
        record_id: '203',
        action: 'INSERT',
        reason: 'Delegated "Approve pending user registries and sign off on study milestone data_lock." to demo-mentor-id',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-204',
        occurred_at: del4.completed_at!,
        actor_email: del4.completed_by!,
        table_name: 'delegations',
        record_id: '204',
        action: 'UPDATE',
        reason: 'Delegation marked complete',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-205',
        occurred_at: del5.created_at,
        actor_email: del5.delegated_by,
        table_name: 'delegations',
        record_id: '205',
        action: 'INSERT',
        reason: 'Delegated "Perform safety assessments on adverse events reported in the last 7 days." to demo-investigator-id',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-301',
        occurred_at: consentV1.activated_at as string,
        actor_email: 'mentor@demo.com',
        table_name: 'consent_form_versions',
        record_id: String(consentV1.id),
        action: 'INSERT',
        reason: 'Created consent form version v1.0',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-401',
        occurred_at: consentRecord1.created_at,
        actor_email: 'investigator@demo.com',
        table_name: 'consent_records',
        record_id: consentRecord1.id,
        action: 'INSERT',
        reason: 'Recorded consent for P-1001',
        study_id: 'demo-study-1',
        scope: 'study',
      }
    ],
    signatures: [],
    queries: [query1, query2],
    adverseEvents: [],
    consentVersions: [consentV1],
    consentRecords: [consentRecord1],
    delegations: [del1, del3, del4, del5],
    studyLockOverrides: {},
    userOverrides: {},
  };
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function loadState(): ClientDemoState {
  if (!isBrowser()) return initState();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initState();
    return { ...initState(), ...JSON.parse(raw) };
  } catch {
    return initState();
  }
}

function saveState(state: ClientDemoState): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage full or unavailable (e.g. private browsing) - the demo
    // still works for the current render, it just won't survive a reload.
  }
}

// Every mutation below follows the same shape: load, change, save. The
// dataset is tiny (one visitor's worth of demo clicks), so re-reading and
// re-writing the whole blob each time is simpler than trying to keep an
// in-memory cache in sync with sessionStorage across multiple tabs of the
// same origin.

function nextId(state: ClientDemoState): number {
  return state.counter++;
}

export function addAuditEntry(entry: {
  actorEmail: string;
  tableName: string;
  recordId: string;
  action: string;
  reason?: string | null;
  studyId?: string | null;
  scope?: 'study' | 'system';
}): AuditEntry {
  const state = loadState();
  const row: AuditEntry = {
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: entry.actorEmail,
    table_name: entry.tableName,
    record_id: entry.recordId,
    action: entry.action,
    reason: entry.reason ?? null,
    study_id: entry.studyId ?? null,
    scope: entry.scope ?? 'study',
  };
  state.auditLog.unshift(row);
  saveState(state);
  return row;
}

export function getAuditLog(filters: {
  studyId?: string | null;
  scope?: 'study' | 'system';
  actor?: string | null;
  action?: string | null;
} = {}): AuditEntry[] {
  const state = loadState();
  return state.auditLog.filter((row) => {
    if (filters.scope && row.scope !== filters.scope) return false;
    if (filters.studyId && row.study_id !== filters.studyId) return false;
    if (filters.actor && row.actor_email !== filters.actor) return false;
    if (filters.action && row.action !== filters.action) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Signatures (Endorse Data / Electronic Signatures)
// ---------------------------------------------------------------------------

export function addSignature(input: {
  studyId: string;
  signerEmail: string;
  recordType: string;
  recordId: string;
  milestone: string;
  meaning: string;
}): DemoSignature {
  const state = loadState();
  const row: DemoSignature = {
    id: nextId(state),
    study_id: input.studyId,
    signer_email: input.signerEmail,
    record_type: input.recordType,
    record_id: input.recordId,
    milestone: input.milestone,
    meaning: input.meaning,
    signed_at: new Date().toISOString(),
  };
  state.signatures.unshift(row);
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: row.signed_at,
    actor_email: input.signerEmail,
    table_name: 'signatures',
    record_id: String(row.id),
    action: 'SIGN_OFF',
    reason: `Endorsed ${input.milestone.replace(/_/g, ' ')}`,
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
  return row;
}

export function getSignatures(studyId: string): DemoSignature[] {
  return loadState().signatures.filter((s) => s.study_id === studyId);
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
  const state = loadState();
  const row: DemoQuery = {
    id: nextId(state),
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
  state.queries.unshift(row);
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: row.raised_at,
    actor_email: input.raisedBy,
    table_name: 'queries',
    record_id: String(row.id),
    action: 'INSERT',
    reason: `Query raised against ${input.recordTable}/${input.recordId}`,
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
  return row;
}

export function getQueries(studyId: string): DemoQuery[] {
  return loadState().queries.filter((q) => q.study_id === studyId);
}

export function updateQuery(
  id: number,
  updates: { status: string; answerText?: string; actorEmail: string }
): DemoQuery | null {
  const state = loadState();
  const row = state.queries.find((q) => q.id === id);
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

  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: now,
    actor_email: updates.actorEmail,
    table_name: 'queries',
    record_id: String(id),
    action: 'STATUS_CHANGE',
    reason: `Query Q-${String(id).padStart(3, '0')} -> ${updates.status}`,
    study_id: row.study_id,
    scope: 'study',
  });
  saveState(state);
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
  const state = loadState();
  const row: DemoAdverseEvent = {
    id: `AE-${nextId(state)}`,
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
  state.adverseEvents.unshift(row);
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: row.created_at,
    actor_email: input.actorEmail,
    table_name: 'adverse_events',
    record_id: row.id,
    action: 'INSERT',
    reason: `Reported ${input.aeType.toUpperCase()} for ${input.participantId}`,
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
  return row;
}

export function getAdverseEvents(studyId: string): DemoAdverseEvent[] {
  return loadState().adverseEvents.filter((e) => e.study_id === studyId);
}

export function updateAdverseEvent(
  id: string,
  updates: { resolutionDate?: string; outcome?: string; authoritySubmittedAt?: string; notes?: string; actorEmail: string }
): DemoAdverseEvent | null {
  const state = loadState();
  const row = state.adverseEvents.find((e) => e.id === id);
  if (!row) return null;

  if (updates.resolutionDate) row.resolution_date = updates.resolutionDate;
  if (updates.outcome) row.outcome = updates.outcome;
  if (updates.authoritySubmittedAt) row.authority_submitted_at = updates.authoritySubmittedAt;
  if (updates.notes) row.notes = updates.notes;

  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: updates.actorEmail,
    table_name: 'adverse_events',
    record_id: id,
    action: 'UPDATE',
    reason: updates.authoritySubmittedAt ? 'Marked as submitted to authority' : 'Adverse event updated',
    study_id: row.study_id,
    scope: 'study',
  });
  saveState(state);
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
  const state = loadState();
  const row: DemoConsentVersion = {
    id: nextId(state),
    study_id: input.studyId,
    version: input.version,
    irb_approved_at: input.irbApprovedAt ?? null,
    activated_at: input.activatedAt ?? null,
    content_hash: input.contentHash ?? null,
  };
  state.consentVersions.unshift(row);
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: input.actorEmail,
    table_name: 'consent_form_versions',
    record_id: String(row.id),
    action: 'INSERT',
    reason: `Created consent form version ${input.version}`,
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
  return row;
}

export function getConsentVersions(studyId: string): DemoConsentVersion[] {
  return loadState().consentVersions.filter((v) => v.study_id === studyId);
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
  const state = loadState();
  const row: DemoConsentRecord = {
    id: `CR-${nextId(state)}`,
    study_id: input.studyId,
    participant_id: input.participantId,
    form_version_id: input.formVersionId,
    method: input.method,
    copy_delivered: input.copyDelivered,
    witnessed_by: input.witnessedBy ?? null,
    notes: input.notes ?? null,
    created_at: new Date().toISOString(),
  };
  state.consentRecords.unshift(row);
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: row.created_at,
    actor_email: input.actorEmail,
    table_name: 'consent_records',
    record_id: row.id,
    action: 'INSERT',
    reason: `Recorded consent for ${input.participantId}`,
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
  return row;
}

export function getConsentRecords(studyId: string): DemoConsentRecord[] {
  return loadState().consentRecords.filter((r) => r.study_id === studyId);
}

// ---------------------------------------------------------------------------
// Delegations
// ---------------------------------------------------------------------------

export function addDelegation(input: {
  studyId: string;
  delegatedTo: string;
  taskDescription: string;
  delegatedBy: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}): DemoDelegation {
  const state = loadState();
  const row: DemoDelegation = {
    id: nextId(state),
    study_id: input.studyId,
    delegated_to: input.delegatedTo,
    task_description: input.taskDescription,
    delegated_by: input.delegatedBy,
    effective_from: input.effectiveFrom,
    effective_to: input.effectiveTo ?? null,
    revoked_at: null,
    revoked_by: null,
    completed_at: null,
    completed_by: null,
    created_at: new Date().toISOString(),
  };
  state.delegations.unshift(row);
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: row.created_at,
    actor_email: input.delegatedBy,
    table_name: 'delegations',
    record_id: String(row.id),
    action: 'INSERT',
    reason: `Delegated "${input.taskDescription}" to ${input.delegatedTo}`,
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
  return row;
}

export function getDelegations(studyId: string): DemoDelegation[] {
  return loadState().delegations.filter((d) => d.study_id === studyId);
}

export function revokeDelegation(id: number, actorEmail: string): DemoDelegation | null {
  const state = loadState();
  const row = state.delegations.find((d) => d.id === id);
  if (!row || isDelegationClosed(row)) return null;
  row.revoked_at = new Date().toISOString();
  row.revoked_by = actorEmail;
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: row.revoked_at,
    actor_email: actorEmail,
    table_name: 'delegations',
    record_id: String(id),
    action: 'UPDATE',
    reason: 'Delegation revoked',
    study_id: row.study_id,
    scope: 'study',
  });
  saveState(state);
  return row;
}

// The delegate marks their own delegation complete. actorEmail is resolved
// to a DEMO_USERS id the same way as demoStore.ts's server-side counterpart -
// see that file's completeDelegation() for why email is the only reliable
// identity signal in demo mode.
export function completeDelegation(id: number, actorEmail: string): DemoDelegation | null {
  const state = loadState();
  const row = state.delegations.find((d) => d.id === id);
  if (!row || isDelegationClosed(row)) return null;
  const actor = DEMO_USERS.find((u) => u.email === actorEmail);
  if (!actor || row.delegated_to !== actor.id) return null;
  row.completed_at = new Date().toISOString();
  row.completed_by = actorEmail;
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: row.completed_at,
    actor_email: actorEmail,
    table_name: 'delegations',
    record_id: String(id),
    action: 'UPDATE',
    reason: 'Delegation marked complete',
    study_id: row.study_id,
    scope: 'study',
  });
  saveState(state);
  return row;
}

// ---------------------------------------------------------------------------
// Study lock state
// ---------------------------------------------------------------------------

export function getStudyLockOverride(studyId: string): StudyLockOverride | null {
  return loadState().studyLockOverrides[studyId] ?? null;
}

export function setStudyLock(input: {
  studyId: string;
  locked: boolean;
  reason: string;
  actorEmail: string;
}): StudyLockOverride {
  const state = loadState();
  const override: StudyLockOverride = input.locked
    ? { lock_state: 'locked', locked_at: new Date().toISOString(), locked_by: input.actorEmail, lock_reason: input.reason }
    : { lock_state: 'open', locked_at: null, locked_by: null, lock_reason: input.reason };
  state.studyLockOverrides[input.studyId] = override;
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: input.actorEmail,
    table_name: 'studies',
    record_id: input.studyId,
    action: input.locked ? 'LOCK' : 'UNLOCK',
    reason: input.reason,
    study_id: input.studyId,
    scope: 'system',
  });
  saveState(state);
  return override;
}

// ---------------------------------------------------------------------------
// User role/status overrides (User Registry approve/suspend/role-change)
// ---------------------------------------------------------------------------

export function getUserOverride(userId: string): UserOverride | null {
  return loadState().userOverrides[userId] ?? null;
}

export function setUserOverride(input: {
  userId: string;
  userEmail: string;
  role?: string;
  status?: string;
  actorEmail: string;
}): UserOverride {
  const state = loadState();
  const existing = state.userOverrides[input.userId] ?? {};
  const merged: UserOverride = { ...existing };
  if (input.role !== undefined) merged.role = input.role;
  if (input.status !== undefined) {
    merged.status = input.status;
    if (input.status === 'active') merged.deleted_at = null;
  }
  state.userOverrides[input.userId] = merged;

  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: input.actorEmail,
    table_name: 'profiles',
    record_id: input.userId,
    action: 'ROLE_CHANGE',
    reason: input.status
      ? `${input.userEmail} status -> ${input.status}`
      : `${input.userEmail} role -> ${input.role}`,
    study_id: null,
    scope: 'system',
  });
  saveState(state);
  return merged;
}

// Soft-deletes a user in demo mode, mirroring the live DELETE endpoint:
// sets status: 'deleted' (the authoritative signal, distinct from
// 'suspended') plus a deleted_at audit timestamp, via the same override
// mechanism setUserOverride uses - NOT a removal of the override, despite
// the old name this replaced ("removeUserOverride") suggesting otherwise.
// Deleting the override entirely would have reset the user back to their
// unmodified DEMO_USERS row on the next fetch, silently undoing the delete.
export function deleteUserOverride(userId: string, userEmail: string, actorEmail: string): void {
  const state = loadState();
  const existing = state.userOverrides[userId] ?? {};
  state.userOverrides[userId] = { ...existing, status: 'deleted', deleted_at: new Date().toISOString() };
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: actorEmail,
    table_name: 'profiles',
    record_id: userId,
    action: 'SOFT_DELETE',
    reason: `${userEmail} removed`,
    study_id: null,
    scope: 'system',
  });
  saveState(state);
}

export function applyUserOverride<T extends { id: string; role: string; status: string; deleted_at?: string | null }>(
  user: T
): T {
  const override = loadState().userOverrides[user.id];
  if (!override) return user;
  return { ...user, ...override };
}
