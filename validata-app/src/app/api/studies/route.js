import { verifySession } from '@/lib/auth-server';
import { listStudies } from '@/lib/repositories/studies';

// GET: List all studies (active users can switch between any of them)
// (Mutations moved to Server Actions - see src/app/actions/studies.js)
export async function GET() {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const studies = await listStudies(session);
    return Response.json(studies);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
