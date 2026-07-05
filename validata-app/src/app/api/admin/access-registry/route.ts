import { verifySession } from '@/lib/auth-server';
import { ACCESS_REGISTRY_ROLES, hasRole } from '@/lib/permissions';

// GET /api/admin/access-registry
// Returns all active user profiles with their roles and status, including
// email addresses (PII) - kept to ACCESS_REGISTRY_ROLES (admin, mentor,
// monitor, auditor), narrower than the general READABLE_ROLES set.
// fable_system_review §2.1: this previously used canReadOnly(), which is
// actually an 8-role set - broader than the comment here ever claimed.
// Supports ?format=csv for regulatory export.
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!hasRole(session.profile.role, ACCESS_REGISTRY_ROLES)) {
      return Response.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
    }

    if (session.isDemo) {
      return Response.json([]);
    }

    const { data: profiles, error } = await session.supabaseClient!
      .from('profiles')
      .select('id, email, role, status, created_at, deleted_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { searchParams } = new URL(request.url);
    if (searchParams.get('format') === 'csv') {
      const header = 'id,email,role,status,created_at,deleted_at\n';
      const rows = (profiles ?? [])
        .map((p) => `${p.id},${p.email},${p.role},${p.deleted_at ? 'deleted' : p.status},${p.created_at},${p.deleted_at ?? ''}`)
        .join('\n');
      return new Response(header + rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="access-registry.csv"',
        },
      });
    }

    return Response.json(profiles);
  } catch (error) {
    console.error('GET /api/admin/access-registry error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
