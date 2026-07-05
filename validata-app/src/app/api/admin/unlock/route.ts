import { verifySession, isMentor } from '@/lib/auth-server';
import { unlockStudySchema, formatValidationError } from '@/lib/schemas';

// POST /api/admin/unlock
// Unlocks a previously locked study (ICH E6(R3) INT-01, INT-03).
// Restricted to mentor role. Unlock events are logged by the audit trigger.
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!isMentor(session)) {
      return Response.json({ error: 'Forbidden. Admin role required to unlock a study.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = unlockStudySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }
    const { studyId, reason } = parsed.data;

    if (session.isDemo) {
      return Response.json({ success: true, studyId, lock_state: 'open' });
    }

    const { data: study, error: fetchError } = await session.supabaseClient!
      .from('studies')
      .select('id, lock_state')
      .eq('id', studyId)
      .single();

    if (fetchError || !study) {
      return Response.json({ error: 'Study not found.' }, { status: 404 });
    }
    if (study.lock_state === 'open') {
      return Response.json({ error: 'Study is not locked.' }, { status: 409 });
    }

    const { data, error } = await session.supabaseClient!
      .from('studies')
      .update({
        lock_state: 'open',
        locked_at: null,
        locked_by: null,
        lock_reason: reason,
      })
      .eq('id', studyId)
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 200 });
  } catch (error) {
    console.error('POST /api/admin/unlock error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
