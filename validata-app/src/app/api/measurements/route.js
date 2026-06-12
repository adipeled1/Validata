import { verifySession } from '@/lib/auth-server';
import mockData from '@/mockData.json';

// GET: Fetch all measurements from Supabase
export async function GET() {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (session.isDemo) {
      return Response.json(mockData.measurements);
    }

    const { data, error } = await session.supabaseClient
      .from('measurements')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add a new measurement log
export async function POST(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const body = await request.json();
    const { participantId, goniometer, aiModel, notes } = body;

    const parsedGoniometer = parseFloat(goniometer.toString().replace('°', '')) || 0.0;
    const parsedAiModel = parseFloat(aiModel.toString().replace('°', '')) || 0.0;

    if (session.isDemo) {
      return Response.json({
        participant_id: participantId,
        goniometer: parsedGoniometer,
        ai_model: parsedAiModel,
        notes,
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await session.supabaseClient
      .from('measurements')
      .insert({
        participant_id: participantId, // Map frontend variable to DB column
        goniometer: parsedGoniometer,
        ai_model: parsedAiModel,
        notes,
        timestamp: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    return Response.json(data[0]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

