import mockData from '@/mockData.json';
import type { ResolvedSession } from '@/lib/auth-server';

// Single source of truth for the demo/live branching on studies - shared by
// the GET route (src/app/api/studies/route.js) and the mutation Server
// Actions (src/app/actions/studies.js), which used to each duplicate this
// logic independently.

export type CreateStudyInput = {
  name: string;
  recruitmentGoal?: string | number;
};

export type UpdateStudyGoalInput = {
  id: string;
  recruitmentGoal: string | number;
};

// session.supabaseClient is only null in demo mode (see resolveSession in
// auth-server.ts) - the `!` below is safe once the `session.isDemo` branch
// has already returned.

export async function listStudies(session: ResolvedSession) {
  if (session.isDemo) {
    return mockData.studies;
  }

  const { data, error } = await session.supabaseClient!
    .from('studies')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createStudy(session: ResolvedSession, { name, recruitmentGoal }: CreateStudyInput) {
  if (!name || !name.trim()) {
    throw new Error('Study name is required.');
  }

  if (session.isDemo) {
    return {
      id: `demo-${Date.now()}`,
      name,
      recruitment_goal: parseInt(String(recruitmentGoal)) || 50
    };
  }

  const { data, error } = await session.supabaseClient!
    .from('studies')
    .insert({ name, recruitment_goal: parseInt(String(recruitmentGoal)) || 50 })
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateStudyGoal(session: ResolvedSession, { id, recruitmentGoal }: UpdateStudyGoalInput) {
  if (session.isDemo) {
    return { id, recruitment_goal: recruitmentGoal };
  }

  const { data, error } = await session.supabaseClient!
    .from('studies')
    .update({ recruitment_goal: recruitmentGoal })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}

// Permanently deletes a study and all of its participants and measurements.
// Deletes child rows explicitly rather than relying solely on a DB-side
// cascade, so this works the same way regardless of which version of the FK
// constraint is in place.
export async function deleteStudy(session: ResolvedSession, id: string) {
  if (!id) {
    throw new Error('Study id is required.');
  }

  if (session.isDemo) {
    return { id };
  }

  const { error: measurementsError } = await session.supabaseClient!
    .from('measurements')
    .delete()
    .eq('study_id', id);
  if (measurementsError) throw measurementsError;

  const { error: participantsError } = await session.supabaseClient!
    .from('participants')
    .delete()
    .eq('study_id', id);
  if (participantsError) throw participantsError;

  const { error: studyError } = await session.supabaseClient!
    .from('studies')
    .delete()
    .eq('id', id);
  if (studyError) throw studyError;

  return { id };
}
