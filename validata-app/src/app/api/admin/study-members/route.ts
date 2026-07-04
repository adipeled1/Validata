// GET ?studyId=  → list members
// POST body: { studyId, userId, studyRole }  → add member
// DELETE body: { studyId, userId }  → remove member
// Role-gated: mentor / sponsor_admin
import { verifySession, isMentor } from '@/lib/auth-server';

// Demo mock data
const DEMO_MEMBERS = [
  { study_id: 'demo-study-1', user_id: 'demo-mentor-id', study_role: 'sponsor_admin', granted_at: new Date().toISOString(), email: 'mentor@demo.com' },
  { study_id: 'demo-study-1', user_id: 'demo-team-id', study_role: 'data_manager', granted_at: new Date().toISOString(), email: 'team@demo.com' },
];

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!isMentor(session)) return Response.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');
    if (!studyId) return Response.json({ error: 'studyId is required.' }, { status: 400 });

    if (session.isDemo) {
      return Response.json(DEMO_MEMBERS.filter((m) => m.study_id === studyId));
    }

    const { data, error } = await session.supabaseClient!
      .from('study_members')
      .select('*, profiles(email, role)')
      .eq('study_id', studyId)
      .order('granted_at', { ascending: true });

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
    const { studyId, userId, studyRole } = body;
    if (!studyId || !userId || !studyRole) {
      return Response.json({ error: 'studyId, userId, and studyRole are required.' }, { status: 400 });
    }

    if (session.isDemo) {
      return Response.json({ study_id: studyId, user_id: userId, study_role: studyRole }, { status: 201 });
    }

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
