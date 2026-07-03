import { verifySession } from '@/lib/auth-server';

const AUDIT_VIEWER_ROLES = ['mentor', 'sponsor_admin', 'monitor', 'auditor'];

// GET /api/audit-log?studyId=&actor=&action=&from=&to=&format=csv
// Returns the audit trail filtered by optional params (ICH E6(R3) AUDIT-05).
// Accessible to mentor, sponsor_admin, monitor, and auditor only.
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!AUDIT_VIEWER_ROLES.includes(session.profile.role)) {
      return Response.json({ error: 'Forbidden. Audit trail is restricted to monitors and auditors.' }, { status: 403 });
    }

    if (session.isDemo) {
      return Response.json([]);
    }

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');
    const actor = searchParams.get('actor');
    const action = searchParams.get('action');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const format = searchParams.get('format');

    let query = session.supabaseClient!
      .from('audit_log')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(500);

    if (studyId) query = query.eq('study_id', studyId);
    if (actor) query = query.eq('actor_id', actor);
    if (action) query = query.eq('action', action);
    if (from) query = query.gte('occurred_at', from);
    if (to) query = query.lte('occurred_at', to);

    const { data, error } = await query;
    if (error) throw error;

    if (format === 'csv') {
      const header = 'id,occurred_at,actor_email,table_name,record_id,action,reason,study_id\n';
      const rows = (data ?? [])
        .map(
          (r) =>
            `${r.id},${r.occurred_at},${r.actor_email ?? ''},${r.table_name},${r.record_id},${r.action},"${(r.reason ?? '').replace(/"/g, '""')}",${r.study_id ?? ''}`
        )
        .join('\n');
      return new Response(header + rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-trail.csv"',
        },
      });
    }

    return Response.json(data);
  } catch (error) {
    console.error('GET /api/audit-log error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
