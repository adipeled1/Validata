// GET ?studyId=  → list members of one study
// GET (no studyId) → list every study_members row (used to render each user's
//   study memberships inline in User Registry without an N+1 fetch per user)
// POST body: { studyId, userId }  → add member (study_role set from user's profile.role)
// DELETE body: { studyId, userId }  → remove member
// Role-gated: mentor only
import { verifySession, isMentor } from '@/lib/auth-server';

// Demo mock data
const DEMO_MEMBERS = [
  { study_id: 'demo-study-1', user_id: 'demo-mentor-id', study_role: 'mentor', granted_at: new Date().toISOString(), email: 'mentor@demo.com', profiles: { email: 'mentor@demo.com', role: 'mentor' } },
  { study_id: 'demo-study-1', user_id: 'demo-team-id', study_role: 'data_manager', granted_at: new Date().toISOString(), email: 'team@demo.com', profiles: { email: 'team@demo.com', role: 'data_manager' } },
];

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!isMentor(session)) return Response.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');

    if (session.isDemo) {
      return Response.json(studyId ? DEMO_MEMBERS.filter((m) => m.study_id === studyId) : DEMO_MEMBERS);
    }

    let query = session.supabaseClient!
      .from('study_members')
      .select('*, profiles(email, role)')
      .order('granted_at', { ascending: true });
    if (studyId) query = query.eq('study_id', studyId);

    const { data, error } = await query;

    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err) {
    console.error('GET /api/admin/study-members error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!isMentor(session)) return Response.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });

    const body = await request.json();
    const { studyId, userId } = body;
    if (!studyId || !userId) {
      return Response.json({ error: 'studyId and userId are required.' }, { status: 400 });
    }

    if (session.isDemo) {
      return Response.json({ study_id: studyId, user_id: userId, study_role: 'team_member' }, { status: 201 });
    }

    // Derive study_role from the user's platform role (annotation only — roles are global).
    const { data: profile } = await session.supabaseClient!
      .from('profiles')
      .select('role, status')
      .eq('id', userId)
      .single();

    if (!profile) {
      return Response.json({ error: 'User profile not found.' }, { status: 404 });
    }
    if (profile.status !== 'active') {
      return Response.json({ error: 'Cannot manage study memberships for non-active users.' }, { status: 400 });
    }

    const studyRole = profile.role ?? 'team_member';

    const { data, error } = await session.supabaseClient!
      .from('study_members')
      .insert({
        study_id: studyId,
        user_id: userId,
        study_role: studyRole,
        granted_by: session.user.id,
        granted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/study-members error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!isMentor(session)) return Response.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });

    const body = await request.json();
    const { studyId, userId } = body;
    if (!studyId || !userId) {
      return Response.json({ error: 'studyId and userId are required.' }, { status: 400 });
    }

    if (session.isDemo) {
      return Response.json({ success: true });
    }

    const { data: profile } = await session.supabaseClient!
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .single();

    if (!profile) {
      return Response.json({ error: 'User profile not found.' }, { status: 404 });
    }
    if (profile.status !== 'active') {
      return Response.json({ error: 'Cannot manage study memberships for non-active users.' }, { status: 400 });
    }

    const { error } = await session.supabaseClient!
      .from('study_members')
      .delete()
      .eq('study_id', studyId)
      .eq('user_id', userId);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/study-members error:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
