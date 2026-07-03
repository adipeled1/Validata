import { verifySession, isMentor, canReadOnly } from '@/lib/auth-server';

// GET /api/admin/delegations?studyId=
// Returns the delegation-of-duties log for a study (ICH E6(R3) ACC-03, AUTH-03).
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!canReadOnly(session)) return Response.json({ error: 'Forbidden.' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');
    if (!studyId) return Response.json({ error: 'studyId is required.' }, { status: 400 });
    if (session.isDemo) return Response.json([]);

    const { data, error } = await session.supabaseClient!
      .from('delegations')
      .select('*')
      .eq('study_id', studyId)
      .order('effective_from');

    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    console.error('GET /api/admin/delegations error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/admin/delegations — create a delegation entry (investigator assigns duty to staff)
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!isMentor(session) && session.profile.role !== 'investigator') {
      return Response.json({ error: 'Forbidden. Investigator or admin role required.' }, { status: 403 });
    }

    const body = await request.json();
    const { studyId, delegatedTo, roleDelegated, taskDescription, effectiveFrom, effectiveTo } = body ?? {};
    if (!studyId || !delegatedTo || !roleDelegated || !taskDescription || !effectiveFrom) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (session.isDemo) return Response.json({ id: 1, study_id: studyId }, { status: 201 });

    const { data, error } = await session.supabaseClient!
      .from('delegations')
      .insert({
        study_id: studyId,
        delegated_to: delegatedTo,
        role_delegated: roleDelegated,
        task_description: taskDescription,
        effective_from: effectiveFrom,
        effective_to: effectiveTo ?? null,
        delegated_by: session.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (e) {
    console.error('POST /api/admin/delegations error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
