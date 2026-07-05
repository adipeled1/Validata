import { verifySession, isMentor } from '@/lib/auth-server';

// PATCH /api/admin/delegations/:id — revoke a delegation (ICH E6(R3) ACC-03)
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!isMentor(session) && session.profile.role !== 'investigator') {
      return Response.json({ error: 'Forbidden. Investigator or admin role required.' }, { status: 403 });
    }

    const { id } = await params;
    const delegationId = parseInt(id, 10);
    if (isNaN(delegationId)) return Response.json({ error: 'Invalid delegation ID.' }, { status: 400 });

    if (session.isDemo) return Response.json({ id: delegationId, revoked_at: new Date().toISOString() });

    const { data, error } = await session.supabaseClient!
      .from('delegations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', delegationId)
      .is('revoked_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) return Response.json({ error: 'Delegation not found or already revoked.' }, { status: 404 });
    return Response.json(data);
  } catch (e) {
    console.error('PATCH /api/admin/delegations/[id] error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
