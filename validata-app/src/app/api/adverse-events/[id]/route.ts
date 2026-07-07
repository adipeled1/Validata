import { verifySession, canEditData } from '@/lib/auth-server';
import { updateAdverseEventSchema, formatValidationError } from '@/lib/schemas';
import { updateAdverseEvent } from '@/lib/demoStore';

// PATCH /api/adverse-events/:id — update resolution or authority submission (ICH E6(R3) SAFETY-04)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!canEditData(session)) return Response.json({ error: 'Forbidden.' }, { status: 403 });

    const { id } = await params;

    const body = await request.json();
    const parsed = updateAdverseEventSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });

    if (session.isDemo) {
      const row = updateAdverseEvent(id, { ...parsed.data, actorEmail: session.user.email });
      if (!row) return Response.json({ error: 'Adverse event not found.' }, { status: 404 });
      return Response.json(row);
    }

    const aeId = parseInt(id, 10);
    if (isNaN(aeId)) return Response.json({ error: 'Invalid AE ID.' }, { status: 400 });

    const updates: Record<string, string | undefined> = {};
    if (parsed.data.resolutionDate) updates.resolution_date = parsed.data.resolutionDate;
    if (parsed.data.outcome) updates.outcome = parsed.data.outcome;
    if (parsed.data.authoritySubmittedAt) updates.authority_submitted_at = parsed.data.authoritySubmittedAt;
    if (parsed.data.notes) updates.notes = parsed.data.notes;

    const { data, error } = await session.supabaseClient!
      .from('adverse_events')
      .update(updates)
      .eq('id', aeId)
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    console.error('PATCH /api/adverse-events/[id] error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
