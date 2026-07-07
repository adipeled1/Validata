import { verifySession, isMentor, canManageAccount } from '@/lib/auth-server';
import { updateProfileSchema, formatValidationError } from '@/lib/schemas';
import { DEMO_USERS } from '@/lib/demoData';
import { applyUserOverride, setUserOverride, removeUserOverride } from '@/lib/demoStore';

// GET: Fetch profiles
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    // fable_system_review §5.4: candidate cleanup used to run here as an
    // un-awaited side effect of a GET request - a read endpoint that
    // hard-deletes rows from auth.users as a fire-and-forget action is
    // surprising, unauditable (the deletion's HTTP context is a list
    // request), and racy. It's now a scheduled pg_cron job (see
    // supabase_setup.sql §37) instead, with POST /api/admin/cleanup-
    // candidates still available for an on-demand manual trigger.

    const { searchParams } = new URL(request.url);
    const fetchCurrentOnly = searchParams.get('current') === 'true';

    // 1. Fetch current user's profile
    if (fetchCurrentOnly) {
      if (session.isDemo) {
        return Response.json({
          id: session.user.id,
          email: session.user.email,
          role: session.profile.role,
          status: session.profile.status
        });
      }

      const { data: profile, error } = await session.supabaseClient!
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        const { data: newProfile, error: createError } = await session.supabaseClient!
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            role: 'team_member',
            status: 'pending'
          })
          .select()
          .single();

        if (createError) throw createError;
        return Response.json(newProfile);
      }

      return Response.json(profile);
    }

    // 2. Fetch all profiles — mentor only (ICH E6(R3) ACC-01)
    if (!isMentor(session)) {
      return Response.json({ error: 'Forbidden. Mentor or admin role required.' }, { status: 403 });
    }

    if (session.isDemo) {
      const now = new Date().toISOString();
      return Response.json(DEMO_USERS.map((u) => applyUserOverride({ ...u, created_at: now })));
    }

    const { data: profiles, error } = await session.supabaseClient!
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json(profiles);

  } catch (error) {
    console.error('GET /api/profiles error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

// PATCH: Update user profile (role/status) — mentor only (ICH E6(R3) AUTH-02, COR-01)
export async function PATCH(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!isMentor(session)) {
      return Response.json({ error: 'Forbidden. Mentor or admin role required.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }
    const { id, role, status, reason } = parsed.data;

    if (session.isDemo) {
      const target = DEMO_USERS.find((u) => u.id === id);
      if (!target) return Response.json({ error: 'User not found.' }, { status: 404 });
      const merged = setUserOverride({
        userId: id,
        userEmail: target.email,
        role,
        status,
        actorEmail: session.user.email,
      });
      return Response.json({ id, role: merged.role ?? target.role, status: merged.status ?? target.status, reason });
    }

    // Separation of duties: a mentor can still promote someone to mentor (e.g.
    // approving a co-PI), but once an account is mentor/admin, only an admin
    // can change/suspend/delete it — that's the actual fix for "two mentors
    // can terminate each other". Granting the admin role itself is admin-only too.
    const { data: targetProfile, error: targetError } = await session.supabaseClient!
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();
    if (targetError || !targetProfile) {
      return Response.json({ error: 'User not found.' }, { status: 404 });
    }
    if (!canManageAccount(session, targetProfile.role, role)) {
      return Response.json({ error: 'Forbidden. Only an admin can manage mentor/admin accounts.' }, { status: 403 });
    }

    const updates: Record<string, string | null | undefined> = {};
    if (role !== undefined) updates.role = role;
    if (status !== undefined) {
      updates.status = status;
      if (status === 'active') {
        updates.deleted_at = null; // Clear deleted_at when reactivated!
      }
    }
    // ICH E6(R3) COR-01: store reason on the row so the audit trigger captures it in new_value
    if (reason) updates.change_reason = reason;

    const { data, error } = await session.supabaseClient!
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return Response.json(data[0]);

  } catch (error) {
    console.error('PATCH /api/profiles error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

// DELETE: Delete user profile — mentor only
export async function DELETE(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!isMentor(session)) {
      return Response.json({ error: 'Forbidden. Mentor or admin role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Missing user ID' }, { status: 400 });
    }

    if (session.isDemo) {
      const target = DEMO_USERS.find((u) => u.id === id);
      removeUserOverride(id, target?.email ?? id, session.user.email);
      return Response.json({ success: true, deletedId: id });
    }

    const { data: targetProfile, error: targetError } = await session.supabaseClient!
      .from('profiles')
      .select('role, status')
      .eq('id', id)
      .single();
    if (targetError || !targetProfile) {
      return Response.json({ error: 'User not found.' }, { status: 404 });
    }
    if (!canManageAccount(session, targetProfile.role)) {
      return Response.json({ error: 'Forbidden. Only an admin can delete mentor/admin accounts.' }, { status: 403 });
    }

    let error;
    if (targetProfile.status === 'candidate') {
      const { error: rpcError } = await session.supabaseClient!
        .rpc('delete_candidate_user', { p_user_id: id });
      error = rpcError;
    } else {
      const { error: updateError } = await session.supabaseClient!
        .from('profiles')
        .update({ deleted_at: new Date().toISOString(), status: 'suspended' })
        .eq('id', id);
      error = updateError;
    }

    if (error) throw error;
    return Response.json({ success: true, deletedId: id });

  } catch (error) {
    console.error('DELETE /api/profiles error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
