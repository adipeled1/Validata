import { verifySession } from '@/lib/auth-server';
import mockData from '@/mockData.json';

// GET: List all studies (active users can switch between any of them)
export async function GET() {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (session.isDemo) {
      return Response.json(mockData.studies);
    }

    const { data, error } = await session.supabaseClient
      .from('studies')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new study (mentors only)
export async function POST(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (session.profile.role !== 'mentor') {
      return Response.json({ error: 'Forbidden. Only mentors can create studies.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, recruitmentGoal } = body;

    if (!name || !name.trim()) {
      return Response.json({ error: 'Study name is required.' }, { status: 400 });
    }

    if (session.isDemo) {
      return Response.json({
        id: `demo-${Date.now()}`,
        name,
        recruitment_goal: parseInt(recruitmentGoal) || 50
      });
    }

    const { data, error } = await session.supabaseClient
      .from('studies')
      .insert({ name, recruitment_goal: parseInt(recruitmentGoal) || 50 })
      .select();

    if (error) throw error;
    return Response.json(data[0]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update a study's recruitment goal (mentors only)
export async function PATCH(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (session.profile.role !== 'mentor') {
      return Response.json({ error: 'Forbidden. Only mentors can update studies.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, recruitmentGoal } = body;

    if (session.isDemo) {
      return Response.json({ id, recruitment_goal: recruitmentGoal });
    }

    const { data, error } = await session.supabaseClient
      .from('studies')
      .update({ recruitment_goal: recruitmentGoal })
      .eq('id', id)
      .select();

    if (error) throw error;
    return Response.json(data[0]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Permanently delete a study and all of its participants and
// measurements (mentors only). Deletes child rows explicitly rather than
// relying solely on a DB-side cascade, so this works the same way
// regardless of which version of the FK constraint is in place.
export async function DELETE(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (session.profile.role !== 'mentor') {
      return Response.json({ error: 'Forbidden. Only mentors can delete studies.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Study id is required.' }, { status: 400 });
    }

    if (session.isDemo) {
      return Response.json({ id });
    }

    const { error: measurementsError } = await session.supabaseClient
      .from('measurements')
      .delete()
      .eq('study_id', id);
    if (measurementsError) throw measurementsError;

    const { error: participantsError } = await session.supabaseClient
      .from('participants')
      .delete()
      .eq('study_id', id);
    if (participantsError) throw participantsError;

    const { error: studyError } = await session.supabaseClient
      .from('studies')
      .delete()
      .eq('id', id);
    if (studyError) throw studyError;

    return Response.json({ id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
