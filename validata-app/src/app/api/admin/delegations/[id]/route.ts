import { verifySession } from '@/lib/auth-server';
import { DELEGATION_ROLES, hasRole } from '@/lib/permissions';
import { revokeDelegation, completeDelegation } from '@/lib/demoStore';

// PATCH /api/admin/delegations/:id — revoke or complete a delegation.
// Revoke (delegator-initiated) and Complete (delegate-initiated) are
// separate, mutually exclusive terminal states - see
// enforce_delegations_lifecycle() in supabase_setup.sql, which is the real
// enforcement; the checks here just produce a clean 4xx instead of letting
// that trigger's exception surface as a raw 500.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });

    const { id } = await params;
    const delegationId = parseInt(id, 10);
    if (isNaN(delegationId)) return Response.json({ error: 'Invalid delegation ID.' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    if (action !== 'revoke' && action !== 'complete') {
      return Response.json({ error: 'action must be "revoke" or "complete".' }, { status: 400 });
    }

    if (action === 'revoke') {
      if (!hasRole(session.profile.role, DELEGATION_ROLES)) {
        return Response.json({ error: 'Forbidden. Investigator, mentor, or admin role required.' }, { status: 403 });
      }

      if (session.isDemo) {
        const row = revokeDelegation(delegationId, session.user.email);
        if (!row) return Response.json({ error: 'Delegation not found or already closed.' }, { status: 404 });
        return Response.json(row);
      }

      const { data, error } = await session.supabaseClient!
        .from('delegations')
        .update({ revoked_at: new Date().toISOString(), revoked_by: session.user.id })
        .eq('id', delegationId)
        .is('revoked_at', null)
        .is('completed_at', null)
        .select()
        .single();

      if (error) throw error;
      if (!data) return Response.json({ error: 'Delegation not found or already closed.' }, { status: 404 });
      return Response.json(data);
    }

    // action === 'complete' — any delegate may mark their own delegation
    // complete; this is not limited to DELEGATION_ROLES, since the person a
    // task was delegated to is often a site coordinator or data manager.
    if (session.isDemo) {
      const row = completeDelegation(delegationId, session.user.email);
      if (!row) return Response.json({ error: 'Delegation not found, not yours, or already closed.' }, { status: 404 });
      return Response.json(row);
    }

    const { data, error } = await session.supabaseClient!
      .from('delegations')
      .update({ completed_at: new Date().toISOString(), completed_by: session.user.id })
      .eq('id', delegationId)
      .eq('delegated_to', session.user.id)
      .is('revoked_at', null)
      .is('completed_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) return Response.json({ error: 'Delegation not found, not yours, or already closed.' }, { status: 404 });
    return Response.json(data);
  } catch (e) {
    console.error('PATCH /api/admin/delegations/[id] error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
