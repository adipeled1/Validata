import { verifySession, isMentor } from '@/lib/auth-server';
import { updateProfileSchema, formatValidationError } from '@/lib/schemas';
import { DEMO_USERS } from '@/lib/demoData';

// GET: Fetch profiles
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    // Lazy cleanup: hard-delete expired candidates on every admin load
    // Fire-and-forget — don't await so it doesn't delay the response
    if (!session.isDemo && session.supabaseClient) {
      void Promise.resolve(session.supabaseClient.rpc('cleanup_expired_candidates')).catch(() => {});
    }

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

    // 2. Fetch all profiles — mentor/sponsor_admin only (ICH E6(R3) ACC-01)
    if (!isMentor(session)) {
      return Response.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    if (session.isDemo) {
      const now = new Date().toISOString();
      return Response.json(DEMO_USERS.map((u) => ({ ...u, created_at: now })));
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

// PATCH: Update user profile (role/status) — mentor/sponsor_admin only (ICH E6(R3) AUTH-02, COR-01)
export async function PATCH(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!isMentor(session)) {
      return Response.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }
    const { id, role, status, reason } = parsed.data;

    if (session.isDemo) {
      return Response.json({ id, role, status });
    }

    const updates: Record<string, string | undefined> = {};
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
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

// DELETE: Delete user profile — mentor/sponsor_admin only
export async function DELETE(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!isMentor(session)) {
      return Response.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Missing user ID' }, { status: 400 });
    }

    if (session.isDemo) {
      return Response.json({ success: true, deletedId: id });
    }

    const { error } = await session.supabaseClient!
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return Response.json({ success: true, deletedId: id });

  } catch (error) {
    console.error('DELETE /api/profiles error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
