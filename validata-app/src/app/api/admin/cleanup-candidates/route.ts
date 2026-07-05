// POST /api/admin/cleanup-candidates
// Manually trigger cleanup of expired candidates
// Role-gated: mentor only
import { verifySession, isMentor } from '@/lib/auth-server';

export async function POST(): Promise<Response> {
  const session = await verifySession();
  if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
  if (!isMentor(session)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (session.isDemo) return Response.json({ deleted: 0, demo: true });

  const { data, error } = await session.supabaseClient!.rpc('cleanup_expired_candidates');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deleted: data });
}
