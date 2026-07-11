import mockData from '@/mockData.json';
import type { ResolvedSession } from '@/lib/auth-server';
import { addAuditEntry } from '@/lib/demoStore';

// Single source of truth for the demo/live branching on participants -
// shared by the GET route (src/app/api/participants/route.js) and the
// mutation Server Actions (src/app/actions/participants.js), which used to
// each duplicate this logic independently.

export type CreateParticipantInput = {
  id?: string;
  status?: string;
  age?: string | number | null;
  gender: string;
  healthStatus: string;
  enrollmentDate?: string;
  studyId: string;
};

export type UpdateParticipantStatusInput = {
  id: string;
  status: string;
  studyId: string;
  // ICH E6(R3) COR-01: reason is required for Drop; optional for Completed toggle
  reason?: string;
};

// session.supabaseClient is only null in demo mode (see resolveSession in
// auth-server.ts) - the `!` below is safe once the `session.isDemo` branch
// has already returned.

export async function listParticipants(session: ResolvedSession, studyId?: string | null) {
  if (session.isDemo) {
    return studyId
      ? mockData.participants.filter((p) => p.study_id === studyId)
      : mockData.participants;
  }

  let query = session.supabaseClient!
    .from('participants')
    .select('*')
    .order('created_at', { ascending: false });

  if (studyId) query = query.eq('study_id', studyId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createParticipant(
  session: ResolvedSession,
  { id, status, age, gender, healthStatus, enrollmentDate, studyId }: CreateParticipantInput
) {
  if (!studyId) {
    throw new Error('A study must be selected before adding a participant.');
  }

  if (session.isDemo) {
    const newId = id || `P-${Date.now()}`;
    addAuditEntry({
      actorEmail: session.user.email,
      tableName: 'participants',
      recordId: newId,
      action: 'INSERT',
      studyId,
      reason: 'Participant registered',
    });
    return {
      id: newId,
      status: status || 'Active',
      age: parseInt(String(age)) || null,
      gender,
      health_status: healthStatus,
      study_id: studyId,
      enrollment_date: enrollmentDate || new Date().toISOString().split('T')[0],
      created_by: null,
    };
  }

  let participantId = id;
  if (!participantId) {
    // next_participant_id() atomically increments a per-study counter row
    // in the DB, so concurrent callers always get distinct values - doing
    // this in application code instead (SELECT all participants, compute
    // max+1) would let two concurrent enrollments read the same max and
    // generate the same id, hitting the composite PK (id, study_id).
    const { data: nextId, error: idError } = await session.supabaseClient!
      .rpc('next_participant_id', { p_study_id: studyId });

    if (idError) throw idError;
    participantId = nextId as string;
  }

  const { data, error } = await session.supabaseClient!
    .from('participants')
    .insert({
      id: participantId,
      status: status || 'Active',
      age: parseInt(String(age)) || null,
      gender,
      health_status: healthStatus,
      study_id: studyId,
      enrollment_date: enrollmentDate || new Date().toISOString().split('T')[0],
      // ICH E6(R3) INT-02: store who enrolled this participant
      created_by: session.user.id,
    })
    .select();

  if (error) throw error;
  return data[0];
}

// Update participant status (e.g. drop, complete/un-complete).
// ICH E6(R3) COR-01: reason is captured for status changes and flows to
// the audit_log trigger via the status_reason column.
// Only status/status_reason may ever be written here — this is now also
// enforced at the DB level by enforce_participants_immutability() in
// supabase_setup.sql, which rejects any UPDATE touching another column.
export async function updateParticipantStatus(
  session: ResolvedSession,
  { id, status, studyId, reason }: UpdateParticipantStatusInput
) {
  if (!studyId) {
    throw new Error('A study must be selected before updating a participant.');
  }

  if (session.isDemo) {
    addAuditEntry({
      actorEmail: session.user.email,
      tableName: 'participants',
      recordId: id,
      action: 'STATUS_CHANGE',
      studyId,
      reason: reason ?? `Status changed to ${status}`,
    });
    return { id, status };
  }

  // id alone is not unique across studies (the same id can exist in two
  // different studies), so study_id must always be included or this would
  // update every study's matching row instead of just the current one.
  const { data, error } = await session.supabaseClient!
    .from('participants')
    .update({
      status,
      ...(reason ? { status_reason: reason } : {}),
    })
    .eq('id', id)
    .eq('study_id', studyId)
    .select();

  if (error) throw error;
  return data[0];
}
