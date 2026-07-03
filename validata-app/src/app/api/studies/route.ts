import { verifySession } from '@/lib/auth-server';
import { listStudies } from '@/lib/repositories/studies';

export async function GET(): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const studies = await listStudies(session);
    return Response.json(studies);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
