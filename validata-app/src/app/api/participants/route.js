import { verifySession } from '@/lib/auth-server';
import mockData from '@/mockData.json';

// GET: Fetch all participants from Supabase
export async function GET() {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (session.isDemo) {
      return Response.json(mockData.participants);
    }

    const { data, error } = await session.supabaseClient
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false });

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
    const { id, consent, status, age, gender, healthStatus } = body;

    if (session.isDemo) {
      // Return the added participant as if it succeeded
      return Response.json({
        id,
        consent,
        status: status || 'Active',
        age: parseInt(age) || null,
        gender,
        health_status: healthStatus
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
        health_status: healthStatus // Map camelCase from frontend to snake_case in DB
      })
      .select();

    if (error) throw error;
    return Response.json(data[0]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update participant status (e.g. drop)
export async function PATCH(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const body = await request.json();
    const { id, status } = body;

    if (session.isDemo) {
      return Response.json({ id, status });
    }

    const { data, error } = await session.supabaseClient
      .from('participants')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) throw error;
    return Response.json(data[0]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

