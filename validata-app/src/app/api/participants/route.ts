import { verifySession } from '@/lib/auth-server';
import { listParticipants } from '@/lib/repositories/participants';

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('study_id');

    const participants = await listParticipants(session, studyId);
    return Response.json(participants);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
