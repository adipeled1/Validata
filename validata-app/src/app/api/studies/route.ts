import { verifySession, isMentor } from '@/lib/auth-server';
import { listStudies, listDeletedStudies } from '@/lib/repositories/studies';

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get('deleted') === 'true') {
      if (!isMentor(session)) {
        return Response.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
      }
      const deleted = await listDeletedStudies(session);
      return Response.json(deleted);
    }

    const studies = await listStudies(session);
    return Response.json(studies);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
