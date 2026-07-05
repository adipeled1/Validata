import { verifySession, canReadOnly } from '@/lib/auth-server';
import { createQuerySchema, formatValidationError } from '@/lib/schemas';

// GET /api/queries?studyId=...
// Returns all queries for a study. Accessible to any operational role (ICH E6(R3) CAP-04).
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!canReadOnly(session)) {
      return Response.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');

    if (!studyId) {
      return Response.json({ error: 'studyId is required.' }, { status: 400 });
    }

    if (session.isDemo) {
      return Response.json([]);
    }

    const { data, error } = await session.supabaseClient!
      .from('queries')
      .select('*')
      .eq('study_id', studyId)
      .order('raised_at', { ascending: false });

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    console.error('GET /api/queries error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/queries
// Raise a new query against a specific data record (ICH E6(R3) CAP-04, COR-01).
// Permitted roles: mentor, data_manager, monitor, investigator.
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const allowedRoles = ['admin', 'mentor', 'data_manager', 'monitor', 'investigator'];
    if (!allowedRoles.includes(session.profile.role)) {
      return Response.json({ error: 'Forbidden. Insufficient role to raise a query.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createQuerySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }
    const { studyId, recordTable, recordId, fieldName, severity, queryText } = parsed.data;

    if (session.isDemo) {
      return Response.json({ id: 1, study_id: studyId, status: 'open' }, { status: 201 });
    }

    const { data, error } = await session.supabaseClient!
      .from('queries')
      .insert({
        study_id: studyId,
        record_table: recordTable,
        record_id: recordId,
        field_name: fieldName,
        severity,
        query_text: queryText,
        raised_by: session.user.id,
        raised_at: new Date().toISOString(),
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/queries error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
