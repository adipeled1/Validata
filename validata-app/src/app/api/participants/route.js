import { verifySession } from '@/lib/auth-server';
import { listParticipants } from '@/lib/repositories/participants';

// GET: Fetch all participants for a given study
// (Mutations moved to Server Actions - see src/app/actions/participants.js)
export async function GET(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('study_id');

    const participants = await listParticipants(session, studyId);
    return Response.json(participants);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
