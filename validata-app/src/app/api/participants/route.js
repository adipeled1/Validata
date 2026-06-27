import { verifySession } from '@/lib/auth-server';
import mockData from '@/mockData.json';

// GET: Fetch all participants for a given study from Supabase
export async function GET(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('study_id');

    if (session.isDemo) {
      const participants = studyId
        ? mockData.participants.filter((p) => p.study_id === studyId)
        : mockData.participants;
      return Response.json(participants);
    }

    let query = session.supabaseClient
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false });

    if (studyId) query = query.eq('study_id', studyId);

    const { data, error } = await query;

    if (error) throw error;

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new participant to Supabase
export async function POST(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const body = await request.json();
    const { id, consent, status, age, gender, healthStatus, enrollmentDate, studyId } = body;

    if (!studyId) {
      return Response.json({ error: 'A study must be selected before adding a participant.' }, { status: 400 });
    }

    if (session.isDemo) {
      return Response.json({
        id,
        consent,
        status: status || 'Active',
        age: parseInt(age) || null,
        gender,
        health_status: healthStatus,
        study_id: studyId,
        enrollment_date: enrollmentDate || new Date().toISOString().split('T')[0]
      });
    }

    const { data, error } = await session.supabaseClient
      .from('participants')
      .insert({
        id,
        consent,
        status: status || 'Active',
        age: parseInt(age) || null,
        gender,
        health_status: healthStatus,
        study_id: studyId,
        enrollment_date: enrollmentDate || new Date().toISOString().split('T')[0]
      })
      .select();

    if (error) throw error;
    return Response.json(data[0]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update participant status (e.g. drop, complete/un-complete)
export async function PATCH(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const body = await request.json();
    const { id, status, studyId } = body;

    if (!studyId) {
      return Response.json({ error: 'A study must be selected before updating a participant.' }, { status: 400 });
    }

    if (session.isDemo) {
      return Response.json({ id, status });
    }

    // id alone is not unique across studies (the same id can exist in two
    // different studies), so study_id must always be included or this would
    // update every study's matching row instead of just the current one.
    const { data, error } = await session.supabaseClient
      .from('participants')
      .update({ status })
      .eq('id', id)
      .eq('study_id', studyId)
      .select();

    if (error) throw error;
    return Response.json(data[0]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
