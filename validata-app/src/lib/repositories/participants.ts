import mockData from '@/mockData.json';
import type { ResolvedSession } from '@/lib/auth-server';

// Single source of truth for the demo/live branching on participants -
// shared by the GET route (src/app/api/participants/route.js) and the
// mutation Server Actions (src/app/actions/participants.js), which used to
// each duplicate this logic independently.

export type CreateParticipantInput = {
  id: string;
  consent: boolean;
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

export async function createParticipant(session: ResolvedSession, { id, consent, status, age, gender, healthStatus, enrollmentDate, studyId }: CreateParticipantInput) {
  if (!studyId) {
    throw new Error('A study must be selected before adding a participant.');
  }

  if (session.isDemo) {
    return {
      id,
      consent,
      status: status || 'Active',
      age: parseInt(String(age)) || null,
      gender,
      health_status: healthStatus,
      study_id: studyId,
      enrollment_date: enrollmentDate || new Date().toISOString().split('T')[0]
    };
  }

  const { data, error } = await session.supabaseClient!
    .from('participants')
    .insert({
      id,
      consent,
      status: status || 'Active',
      age: parseInt(String(age)) || null,
      gender,
      health_status: healthStatus,
      study_id: studyId,
      enrollment_date: enrollmentDate || new Date().toISOString().split('T')[0]
    })
    .select();

  if (error) throw error;
  return data[0];
}

// Update participant status (e.g. drop, complete/un-complete)
export async function updateParticipantStatus(session: ResolvedSession, { id, status, studyId }: UpdateParticipantStatusInput) {
  if (!studyId) {
    throw new Error('A study must be selected before updating a participant.');
  }

  if (session.isDemo) {
    return { id, status };
  }

  // id alone is not unique across studies (the same id can exist in two
  // different studies), so study_id must always be included or this would
  // update every study's matching row instead of just the current one.
  const { data, error } = await session.supabaseClient!
    .from('participants')
    .update({ status })
    .eq('id', id)
    .eq('study_id', studyId)
    .select();

  if (error) throw error;
  return data[0];
}
