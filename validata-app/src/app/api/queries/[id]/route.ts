import { verifySession } from '@/lib/auth-server';
import { updateQuerySchema, formatValidationError } from '@/lib/schemas';
import { QUERY_MUTATE_ROLES, hasRole } from '@/lib/permissions';
import { updateQuery } from '@/lib/demoStore';

// PATCH /api/queries/:id
// Advance the lifecycle of a query (answer → resolve → close) (ICH E6(R3) CAP-04, COR-02).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    // fable_system_review §2.3: this used to accept canReadOnly(), which let
    // auditor/irb_reviewer - roles that must stay read-only - mutate queries.
    if (!hasRole(session.profile.role, QUERY_MUTATE_ROLES)) {
      return Response.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
    }

    const { id } = await params;
    const queryId = parseInt(id, 10);
    if (isNaN(queryId)) {
      return Response.json({ error: 'Invalid query ID.' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateQuerySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }
    const { status, answerText } = parsed.data;

    if (session.isDemo) {
      const row = updateQuery(queryId, { status, answerText, actorEmail: session.user.email });
      if (!row) return Response.json({ error: 'Query not found.' }, { status: 404 });
      return Response.json(row);
    }

    const now = new Date().toISOString();
    const updates: Record<string, string | null> = { status };

    if (status === 'answered') {
      updates.answered_by = session.user.id;
      updates.answered_at = now;
      if (answerText) updates.answer_text = answerText;
    } else if (status === 'resolved') {
      updates.resolved_by = session.user.id;
      updates.resolved_at = now;
    } else if (status === 'closed') {
      updates.closed_by = session.user.id;
      updates.closed_at = now;
    }

    const { data, error } = await session.supabaseClient!
      .from('queries')
      .update(updates)
      .eq('id', queryId)
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    console.error('PATCH /api/queries/[id] error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
