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
import mockData from '../mockData.json';

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

// Demo mode's own mutable copy of the participants/measurements/studies in
// mockData.json - shapes match the raw DB rows mockData.json already uses
// (snake_case, same fields a live Supabase query would return), same as
// every other Demo* type in this file, so mapParticipants/mapMeasurements
// require no separate demo-shape branch.
export type DemoParticipant = {
  id: string;
  study_id: string;
  status: string;
  age: number | null;
  gender: string;
  health_status: string;
  enrollment_date: string;
};

export type DemoMeasurement = {
  id: number;
  study_id: string;
  participant_id: string;
  goniometer: number;
  ai_model: number;
  notes: string;
  timestamp: string;
  test_date: string;
  is_valid: boolean;
  created_by: string | null;
  capture_method: string;
};

export type DemoStudy = {
  id: string;
  name: string;
  recruitment_goal: number;
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

type ClientDemoState = {
  counter: number;
  auditLog: AuditEntry[];
  signatures: DemoSignature[];
  queries: DemoQuery[];
  adverseEvents: DemoAdverseEvent[];
  consentVersions: DemoConsentVersion[];
  consentRecords: DemoConsentRecord[];
  delegations: DemoDelegation[];
  participants: DemoParticipant[];
  measurements: DemoMeasurement[];
  studies: DemoStudy[];
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

  // demo-study-2's own (single) seed query - without this, switching to the
  // second study shows every compliance screen completely empty, which reads
  // as broken rather than "a newly opened study" to an unguided visitor.
  const query3: DemoQuery = {
    id: 103,
    study_id: 'demo-study-2',
    record_table: 'measurements',
    record_id: 'P-2001',
    field_name: 'notes',
    severity: 'minor',
    query_text: 'Please confirm capture device calibration date for this first session.',
    status: 'open',
    raised_by: 'monitor@demo.com',
    raised_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
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

  // demo-study-2's own (single) seed delegation - same reasoning as query3
  // above.
  const del2: DemoDelegation = {
    id: 202,
    study_id: 'demo-study-2',
    delegated_to: 'demo-investigator-id',
    task_description: 'Set up baseline data collection procedures for this newly opened study.',
    delegated_by: 'mentor@demo.com',
    effective_from: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    effective_to: null,
    revoked_at: null,
    revoked_by: null,
    completed_at: null,
    completed_by: null,
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
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

  // Seeded so Electronic Signatures isn't empty on first load. sig3 shares
  // its timestamp with the LOCK audit event above (interim analysis lock),
  // so the two read as one coherent moment in the study's history rather
  // than unrelated seed data.
  const sig1: DemoSignature = {
    id: 601,
    study_id: 'demo-study-1',
    signer_email: 'mentor@demo.com',
    record_type: 'studies',
    record_id: 'demo-study-1',
    milestone: 'protocol_approval',
    meaning: 'Protocol version 1.0 reviewed and approved for execution.',
    signed_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
  };

  const sig2: DemoSignature = {
    id: 602,
    study_id: 'demo-study-1',
    signer_email: 'investigator@demo.com',
    record_type: 'studies',
    record_id: 'demo-study-1',
    milestone: 'enrollment_review',
    meaning: 'Enrollment baseline data reviewed and confirmed accurate for all active participants.',
    signed_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  };

  const sig3: DemoSignature = {
    id: 603,
    study_id: 'demo-study-1',
    signer_email: 'mentor@demo.com',
    record_type: 'studies',
    record_id: 'demo-study-1',
    milestone: 'interim_analysis',
    meaning: 'Interim analysis dataset confirmed complete and accurate as of the lock timestamp.',
    signed_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  };

  // Seeded so Adverse Events isn't empty on first load - one closed AE, one
  // still-open SAE inside its regulatory deadline window (drives the "Needs
  // My Attention" urgency banding on Study Overview and the deadline
  // highlighting on this page), and one fully-processed SUSAR showing the
  // complete report -> submit -> resolve lifecycle.
  const ae1: DemoAdverseEvent = {
    id: 'AE-701',
    study_id: 'demo-study-1',
    participant_id: 'P-1004',
    ae_type: 'ae',
    description: 'Mild ankle soreness reported after goniometer measurement session.',
    severity: 'mild',
    causality: 'possible',
    expectedness: 'expected',
    report_date: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    onset_date: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    authority_deadline: null,
    authority_submitted_at: null,
    resolution_date: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    outcome: 'resolved',
    notes: 'Resolved without intervention.',
    created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
  };

  // Unexpected + life_threatening -> 7-day authority deadline (matches
  // calculateDeadline() in adverse-events/page.tsx and its route). Reported
  // 6 days ago, so the deadline lands ~1 day from now - inside the 48-hour
  // "red" urgency band on purpose, so a live demo has something genuinely
  // urgent to point at instead of only settled history.
  const ae2: DemoAdverseEvent = {
    id: 'AE-702',
    study_id: 'demo-study-1',
    participant_id: 'P-1002',
    ae_type: 'sae',
    description: 'Acute anaphylactic reaction requiring emergency intervention during measurement session.',
    severity: 'life_threatening',
    causality: 'probable',
    expectedness: 'unexpected',
    report_date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    onset_date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    authority_deadline: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    authority_submitted_at: null,
    resolution_date: null,
    outcome: null,
    notes: 'Regulatory submission pending - coordinating with IRB.',
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  };

  const ae3: DemoAdverseEvent = {
    id: 'AE-703',
    study_id: 'demo-study-1',
    participant_id: 'P-1014',
    ae_type: 'susar',
    description: 'Unexpected severe joint inflammation following ankle flexion protocol.',
    severity: 'severe',
    causality: 'possible',
    expectedness: 'unexpected',
    report_date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    onset_date: new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    authority_deadline: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    authority_submitted_at: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString(),
    resolution_date: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    outcome: 'resolved',
    notes: 'Reported to IRB within required window; device recalibrated.',
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  };

  return {
    counter: 1000,
    auditLog: [
      // Seeded LOCK/UNLOCK pair - shaped exactly like the entries setStudyLock()
      // itself writes (table_name 'studies', record_id/study_id the study, scope
      // 'system'), so the System Log isn't empty on first load and shows the
      // same kind of row a real lock/unlock produces, not a demo-only shortcut.
      {
        id: 'AUD-502',
        occurred_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        actor_email: 'mentor@demo.com',
        table_name: 'studies',
        record_id: 'demo-study-1',
        action: 'UNLOCK',
        reason: 'Reopened to correct P-1003 consent query before final lock',
        study_id: 'demo-study-1',
        scope: 'system',
      },
      {
        id: 'AUD-501',
        occurred_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        actor_email: 'mentor@demo.com',
        table_name: 'studies',
        record_id: 'demo-study-1',
        action: 'LOCK',
        reason: 'Interim analysis lock ahead of DSMB review',
        study_id: 'demo-study-1',
        scope: 'system',
      },
      {
        id: 'AUD-601',
        occurred_at: sig1.signed_at,
        actor_email: sig1.signer_email,
        table_name: 'signatures',
        record_id: String(sig1.id),
        action: 'SIGN_OFF',
        reason: 'Signed protocol approval attestation',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-602',
        occurred_at: sig2.signed_at,
        actor_email: sig2.signer_email,
        table_name: 'signatures',
        record_id: String(sig2.id),
        action: 'SIGN_OFF',
        reason: 'Signed enrollment review attestation',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-603',
        occurred_at: sig3.signed_at,
        actor_email: sig3.signer_email,
        table_name: 'signatures',
        record_id: String(sig3.id),
        action: 'SIGN_OFF',
        reason: 'Signed interim analysis attestation',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-701',
        occurred_at: ae1.created_at,
        actor_email: 'investigator@demo.com',
        table_name: 'adverse_events',
        record_id: ae1.id,
        action: 'INSERT',
        reason: 'Reported AE for P-1004',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-702',
        occurred_at: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
        actor_email: 'investigator@demo.com',
        table_name: 'adverse_events',
        record_id: ae1.id,
        action: 'UPDATE',
        reason: 'Adverse event updated',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-703',
        occurred_at: ae2.created_at,
        actor_email: 'mentor@demo.com',
        table_name: 'adverse_events',
        record_id: ae2.id,
        action: 'INSERT',
        reason: 'Reported SAE for P-1002',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-704',
        occurred_at: ae3.created_at,
        actor_email: 'investigator@demo.com',
        table_name: 'adverse_events',
        record_id: ae3.id,
        action: 'INSERT',
        reason: 'Reported SUSAR for P-1014',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-705',
        occurred_at: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString(),
        actor_email: 'mentor@demo.com',
        table_name: 'adverse_events',
        record_id: ae3.id,
        action: 'UPDATE',
        reason: 'Marked as submitted to authority',
        study_id: 'demo-study-1',
        scope: 'study',
      },
      {
        id: 'AUD-706',
        occurred_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
        actor_email: 'investigator@demo.com',
        table_name: 'adverse_events',
        record_id: ae3.id,
        action: 'UPDATE',
        reason: 'Adverse event updated',
        study_id: 'demo-study-1',
        scope: 'study',
      },
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
        id: 'AUD-103',
        occurred_at: query3.raised_at,
        actor_email: query3.raised_by,
        table_name: 'queries',
        record_id: '103',
        action: 'INSERT',
        reason: 'Query raised against measurements/P-2001',
        study_id: 'demo-study-2',
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
        id: 'AUD-202',
        occurred_at: del2.created_at,
        actor_email: del2.delegated_by,
        table_name: 'delegations',
        record_id: '202',
        action: 'INSERT',
        reason: 'Delegated "Set up baseline data collection procedures for this newly opened study." to demo-investigator-id',
        study_id: 'demo-study-2',
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
    signatures: [sig1, sig2, sig3],
    queries: [query1, query2, query3],
    adverseEvents: [ae1, ae2, ae3],
    consentVersions: [consentV1],
    consentRecords: [consentRecord1],
    delegations: [del1, del2, del3, del4, del5],
    // Deep-cloned (not a shared reference) so mutating a row in place here
    // never touches the module-level mockData import itself - every other
    // consumer of mockData.json in the same browser session (before this
    // file's getStudies/getParticipants/getMeasurements become the only
    // demo-mode reader) must keep seeing the original, untouched data.
    participants: JSON.parse(JSON.stringify(mockData.participants)),
    measurements: JSON.parse(JSON.stringify(mockData.measurements)),
    studies: JSON.parse(JSON.stringify(mockData.studies)),
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
  from?: string | null;
  to?: string | null;
} = {}): AuditEntry[] {
  const state = loadState();
  return state.auditLog.filter((row) => {
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
    reason: `Signed ${input.milestone.replace(/_/g, ' ')} attestation`,
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

// ---------------------------------------------------------------------------
// Studies / Participants / Measurements - demo mode's own mutable copy of
// mockData.json (seeded once in initState()), so additions/edits actually
// persist in sessionStorage for the tab's lifetime instead of being silently
// reverted to the static seed data on the next refresh or SWR revalidation
// (e.g. the browser tab regaining focus). Every mutator writes its own audit
// entry, the same convention every other demo entity in this file follows.
// ---------------------------------------------------------------------------

export function getStudies(): DemoStudy[] {
  const state = loadState();
  return state.studies.map((s) => {
    const override = state.studyLockOverrides[s.id];
    return override ? { ...s, ...override } : s;
  });
}

export function addStudy(input: { name: string; recruitmentGoal: number; actorEmail: string }): DemoStudy {
  const state = loadState();
  const row: DemoStudy = {
    id: `demo-${nextId(state)}`,
    name: input.name,
    recruitment_goal: input.recruitmentGoal,
  };
  state.studies.push(row);
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: input.actorEmail,
    table_name: 'studies',
    record_id: row.id,
    action: 'INSERT',
    reason: `Study "${input.name}" created`,
    study_id: row.id,
    scope: 'system',
  });
  saveState(state);
  return row;
}

// Cascades to the study's own participants/measurements too, mirroring the
// FK-driven cascade a real Postgres delete would produce (see StudyContext's
// comment: "Deleting a study permanently deletes all of its participants and
// measurements too").
export function deleteStudy(input: { studyId: string; studyName: string; actorEmail: string }): void {
  const state = loadState();
  state.studies = state.studies.filter((s) => s.id !== input.studyId);
  state.participants = state.participants.filter((p) => p.study_id !== input.studyId);
  state.measurements = state.measurements.filter((m) => m.study_id !== input.studyId);
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: input.actorEmail,
    table_name: 'studies',
    record_id: input.studyId,
    action: 'DELETE',
    reason: `Study "${input.studyName}" deleted`,
    study_id: input.studyId,
    scope: 'system',
  });
  saveState(state);
}

export function updateStudyGoal(input: { studyId: string; recruitmentGoal: number; actorEmail: string }): void {
  const state = loadState();
  const row = state.studies.find((s) => s.id === input.studyId);
  if (row) row.recruitment_goal = input.recruitmentGoal;
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: input.actorEmail,
    table_name: 'studies',
    record_id: input.studyId,
    action: 'UPDATE',
    reason: `Recruitment goal updated to ${input.recruitmentGoal}`,
    study_id: input.studyId,
    scope: 'system',
  });
  saveState(state);
}

export function getParticipants(studyId: string): DemoParticipant[] {
  return loadState().participants.filter((p) => p.study_id === studyId);
}

export function addParticipant(input: {
  studyId: string;
  age: number | null;
  gender: string;
  healthStatus: string;
  enrollmentDate: string;
  actorEmail: string;
}): DemoParticipant {
  const state = loadState();
  // 9000-offset keeps generated ids (e.g. P-10000) disjoint from mockData's
  // own P-1001..P-1023 / P-2001 range, so a newly added participant can never
  // collide with (and silently overwrite) a seeded one.
  const row: DemoParticipant = {
    id: `P-${9000 + nextId(state)}`,
    study_id: input.studyId,
    status: 'Active',
    age: input.age,
    gender: input.gender,
    health_status: input.healthStatus,
    enrollment_date: input.enrollmentDate,
  };
  state.participants.unshift(row);
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: input.actorEmail,
    table_name: 'participants',
    record_id: row.id,
    action: 'INSERT',
    reason: 'Participant registered',
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
  return row;
}

export function updateParticipantStatus(input: {
  id: string;
  studyId: string;
  status: string;
  reason?: string;
  actorEmail: string;
}): DemoParticipant | null {
  const state = loadState();
  const row = state.participants.find((p) => p.id === input.id && p.study_id === input.studyId);
  if (!row) return null;
  row.status = input.status;
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: input.actorEmail,
    table_name: 'participants',
    record_id: input.id,
    action: 'STATUS_CHANGE',
    reason: input.reason ?? `Status changed to ${input.status}`,
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
  return row;
}

export function getMeasurements(studyId: string): DemoMeasurement[] {
  return loadState().measurements.filter((m) => m.study_id === studyId);
}

export function addMeasurement(input: {
  studyId: string;
  participantId: string;
  goniometer: number;
  aiModel: number;
  notes: string;
  testDate: string;
  actorEmail: string;
}): DemoMeasurement {
  const state = loadState();
  const row: DemoMeasurement = {
    id: nextId(state),
    study_id: input.studyId,
    participant_id: input.participantId,
    goniometer: input.goniometer,
    ai_model: input.aiModel,
    notes: input.notes,
    timestamp: new Date().toISOString(),
    test_date: input.testDate,
    is_valid: true,
    created_by: null,
    capture_method: 'manual_entry',
  };
  state.measurements.unshift(row);
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: row.timestamp,
    actor_email: input.actorEmail,
    table_name: 'measurements',
    record_id: String(row.id),
    action: 'INSERT',
    reason: `Measurement logged for ${input.participantId}`,
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
  return row;
}

// Batch variant for file import (CSV/XLSX/JSON) - writes one audit entry per
// row, the same as a manual entry would. The demo path previously created
// rows here without ever logging them, leaving an import invisible in the
// audit trail even though it visibly populated Data Collection.
export function addMeasurementsBatch(
  inputs: { studyId: string; participantId: string; goniometer: number; aiModel: number; notes: string; testDate: string }[],
  actorEmail: string
): DemoMeasurement[] {
  const state = loadState();
  const rows: DemoMeasurement[] = inputs.map((input) => {
    const row: DemoMeasurement = {
      id: nextId(state),
      study_id: input.studyId,
      participant_id: input.participantId,
      goniometer: input.goniometer,
      ai_model: input.aiModel,
      notes: input.notes,
      timestamp: new Date().toISOString(),
      test_date: input.testDate,
      is_valid: true,
      created_by: null,
      capture_method: 'file_import',
    };
    state.auditLog.unshift({
      id: `AUD-${nextId(state)}`,
      occurred_at: row.timestamp,
      actor_email: actorEmail,
      table_name: 'measurements',
      record_id: String(row.id),
      action: 'INSERT',
      reason: `Measurement logged for ${input.participantId} (file import)`,
      study_id: input.studyId,
      scope: 'study',
    });
    return row;
  });
  state.measurements.unshift(...rows);
  saveState(state);
  return rows;
}

export function markMeasurementInvalid(input: { id: string | number; studyId: string; reason?: string; actorEmail: string }): void {
  const state = loadState();
  const row = state.measurements.find((m) => String(m.id) === String(input.id) && m.study_id === input.studyId);
  if (row) row.is_valid = false;
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: input.actorEmail,
    table_name: 'measurements',
    record_id: String(input.id),
    action: 'UPDATE',
    reason: input.reason ?? 'Marked invalid',
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
}

// Bulk-invalidates every measurement for a participant (used when a
// participant is dropped) - one summarizing audit entry, matching the single
// "Participant dropped: X" entry the live-mode dropParticipant flow already
// produces for the equivalent bulk UPDATE.
export function invalidateMeasurementsForParticipant(input: { participantId: string; studyId: string; reason: string; actorEmail: string }): void {
  const state = loadState();
  state.measurements.forEach((m) => {
    if (m.participant_id === input.participantId && m.study_id === input.studyId) m.is_valid = false;
  });
  state.auditLog.unshift({
    id: `AUD-${nextId(state)}`,
    occurred_at: new Date().toISOString(),
    actor_email: input.actorEmail,
    table_name: 'measurements',
    record_id: input.participantId,
    action: 'UPDATE',
    reason: `Participant dropped: ${input.reason}`,
    study_id: input.studyId,
    scope: 'study',
  });
  saveState(state);
}
