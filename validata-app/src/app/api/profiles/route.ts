import { verifySession, isMentor, canManageAccount } from '@/lib/auth-server';
import { updateProfileSchema, formatValidationError } from '@/lib/schemas';
import { DELEGATION_ROLES, hasRole } from '@/lib/permissions';
import { DEMO_USERS } from '@/lib/demoData';
import { applyUserOverride, setUserOverride, deleteUserOverride } from '@/lib/demoStore';

// GET: Fetch profiles
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    // Expired-candidate cleanup deliberately does NOT run here as a side
    // effect of this GET request - a read endpoint that hard-deletes rows
    // from auth.users as a fire-and-forget action would be surprising,
    // unauditable (the deletion's HTTP context is a list request), and
    // racy. It's a scheduled pg_cron job instead (see the "Scheduled jobs"
    // section of supabase_setup.sql), with POST /api/admin/cleanup-
    // candidates available for an on-demand manual trigger.

    const { searchParams } = new URL(request.url);
    const fetchCurrentOnly = searchParams.get('current') === 'true';
    const fetchActiveOnly = searchParams.get('activeOnly') === 'true';

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

      // verifySession() above already requires status === 'active' to reach
      // this point, and handle_new_user() guarantees a profile row exists
      // for every authenticated user, so this select should never miss.
      const { data: profile, error } = await session.supabaseClient!
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return Response.json(profile);
    }

    // 2. Minimal active-user roster (id/email/role only, no status/history) -
    // for pickers like Delegation Log's "Delegate To" dropdown. Scoped to
    // DELEGATION_ROLES, not the full mentor-only listing below, since this
    // never needs to expose applicant/suspended accounts - callers already
    // throw that away client-side, so this just doesn't send it.
    if (fetchActiveOnly) {
      if (!hasRole(session.profile.role, DELEGATION_ROLES)) {
        return Response.json({ error: 'Forbidden.' }, { status: 403 });
      }

      if (session.isDemo) {
        const now = new Date().toISOString();
        const active = DEMO_USERS.map((u) => applyUserOverride({ ...u, created_at: now })).filter((p) => p.status === 'active');
        return Response.json(active.map((p) => ({ id: p.id, email: p.email, role: p.role })));
      }

      const { data: activeProfiles, error: activeError } = await session.supabaseClient!
        .from('profiles')
        .select('id, email, role')
        .eq('status', 'active');

      if (activeError) throw activeError;
      return Response.json(activeProfiles);
    }

    // 3. Fetch all profiles — mentor only (ICH E6(R3) ACC-01)
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
      deleteUserOverride(id, target?.email ?? id, session.user.email);
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

    // Never-approved accounts (role = 'applicant', covering both
    // wait_email_confirm and wait_approval) are hard-deleted - same as if
    // their 30-day window had simply expired unreviewed. Ever-approved
    // accounts are soft-deleted only: status: 'deleted' is the authoritative
    // signal (distinct from 'suspended' - a mentor can tell them apart from
    // status alone, not just by also checking deleted_at); deleted_at is
    // kept purely as the "when" audit timestamp alongside it.
    let error;
    if (targetProfile.role === 'applicant') {
      const { error: rpcError } = await session.supabaseClient!
        .rpc('delete_candidate_user', { p_user_id: id });
      error = rpcError;
    } else {
      const { error: updateError } = await session.supabaseClient!
        .from('profiles')
        .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
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
