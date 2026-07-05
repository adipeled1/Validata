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

export type SoftDeleteStudyInput = {
  id: string;
  // ICH E6(R3) RET-02: reason for deletion must be documented
  reason?: string;
};

// session.supabaseClient is only null in demo mode (see resolveSession in
// auth-server.ts) - the `!` below is safe once the `session.isDemo` branch
// has already returned.

export async function listStudies(session: ResolvedSession) {
  if (session.isDemo) {
    return mockData.studies;
  }

  // ICH E6(R3) RET-01: only return non-deleted studies; soft-deleted rows
  // are hidden by the RLS policy (deleted_at IS NULL) and this filter is a
  // belt-and-suspenders guard at the query layer.
  const { data, error } = await session.supabaseClient!
    .from('studies')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Soft-deleted studies, for the mentor/admin-only retention & destruction-request
// workflow (RET-02, RET-03). Relies on the "Allow mentors to view deleted studies"
// RLS policy — a non-mentor caller simply gets an empty result, not an error.
export async function listDeletedStudies(session: ResolvedSession) {
  if (session.isDemo) {
    return [];
  }

  const { data, error } = await session.supabaseClient!
    .from('studies')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

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
    .insert({
      name,
      recruitment_goal: parseInt(String(recruitmentGoal)) || 50,
      created_by: session.user.id,
    })
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

// ICH E6(R3) RET-01, RET-02: studies are NEVER hard-deleted.
// This function performs a soft-delete (sets deleted_at and deleted_by).
// The data remains in the database and is still retrievable by the service
// role for retention and inspection purposes. A controlled destruction
// workflow (Phase 2 task 2.9) is required for physical deletion.
export async function softDeleteStudy(
  session: ResolvedSession,
  { id, reason }: SoftDeleteStudyInput
) {
  if (!id) {
    throw new Error('Study id is required.');
  }

  if (session.isDemo) {
    return { id };
  }

  // Check retention hold before allowing soft-delete
  const { data: study, error: fetchError } = await session.supabaseClient!
    .from('studies')
    .select('retention_hold, name')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  if (study?.retention_hold) {
    throw new Error(
      `Study "${study.name}" has an active retention hold and cannot be deleted. ` +
      'Contact the sponsor administrator to release the hold.'
    );
  }

  const { data, error } = await session.supabaseClient!
    .from('studies')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
    })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}
