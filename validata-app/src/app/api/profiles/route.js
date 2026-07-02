import { verifySession } from '@/lib/auth-server';
import { updateProfileSchema, formatValidationError } from '@/lib/schemas';

// GET: Fetch profiles
export async function GET(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
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

      const { data: profile, error } = await session.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        // If profile doesn't exist, try to create it
        const { data: newProfile, error: createError } = await session.supabaseClient
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

    // 2. Fetch all profiles (Mentors only)
    if (session.profile.role !== 'mentor') {
      return Response.json({ error: 'Forbidden. Mentors only.' }, { status: 403 });
    }

    if (session.isDemo) {
      // In demo mode, return default mock users
      return Response.json([
        { id: 'demo-mentor-id', email: 'mentor@demo.com', role: 'mentor', status: 'active', created_at: new Date().toISOString() },
        { id: 'demo-team-id', email: 'team@demo.com', role: 'team_member', status: 'active', created_at: new Date().toISOString() },
        { id: 'demo-pending-id', email: 'newuser@demo.com', role: 'team_member', status: 'pending', created_at: new Date().toISOString() },
        { id: 'demo-suspended-id', email: 'suspended@demo.com', role: 'team_member', status: 'suspended', created_at: new Date().toISOString() }
      ]);
    }

    const { data: profiles, error } = await session.supabaseClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json(profiles);

  } catch (error) {
    console.error('GET /api/profiles error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update user profile (role/status) - Mentors only
export async function PATCH(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (session.profile.role !== 'mentor') {
      return Response.json({ error: 'Forbidden. Mentors only.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }
    const { id, role, status } = parsed.data;

    if (session.isDemo) {
      return Response.json({ id, role, status });
    }

    const updates = {};
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;

    const { data, error } = await session.supabaseClient
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return Response.json(data[0]);

  } catch (error) {
    console.error('PATCH /api/profiles error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete user profile - Mentors only
export async function DELETE(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (session.profile.role !== 'mentor') {
      return Response.json({ error: 'Forbidden. Mentors only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Missing user ID' }, { status: 400 });
    }

    if (session.isDemo) {
      return Response.json({ success: true, deletedId: id });
    }

    // Note: Due to RLS or foreign key constraints, we delete from the profiles table.
    // Deleting from auth.users requires admin rights which is not available in frontend SDK,
    // but suspending the profile is usually preferred anyway.
    // Here we delete the public profile row.
    const { error } = await session.supabaseClient
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return Response.json({ success: true, deletedId: id });

  } catch (error) {
    console.error('DELETE /api/profiles error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
