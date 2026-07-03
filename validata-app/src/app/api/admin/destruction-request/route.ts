import { verifySession, isMentor } from '@/lib/auth-server';
import { createDestructionRequestSchema, formatValidationError } from '@/lib/schemas';

// POST /api/admin/destruction-request
// Initiates a controlled data destruction request for a soft-deleted study.
// Subject to retention period check and retention_hold flag (ICH E6(R3) RET-02, RET-03).
//
// NOTE: Actual physical deletion is out of scope for the application layer and must be
// executed by a Supabase admin using the service role after approval. This endpoint:
//   1. Validates that the study is soft-deleted and not on retention hold
//   2. Validates a minimum 15-year retention period has elapsed (configurable)
//   3. Writes a DESTRUCTION_REQUEST audit entry so the intent is captured
//   4. Returns instructions for the Supabase admin to proceed
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!isMentor(session)) return Response.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });

    const body = await request.json();
    const parsed = createDestructionRequestSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    const { studyId, reason } = parsed.data;

    if (session.isDemo) {
      return Response.json({ success: true, status: 'destruction_requested', study_id: studyId });
    }

    const { data: study, error: fetchErr } = await session.supabaseClient!
      .from('studies')
      .select('id, deleted_at, retention_hold, created_at')
      .eq('id', studyId)
      .single();

    if (fetchErr || !study) return Response.json({ error: 'Study not found.' }, { status: 404 });
    if (!study.deleted_at) return Response.json({ error: 'Study must be soft-deleted before a destruction request can be raised.' }, { status: 400 });
    if (study.retention_hold) return Response.json({ error: 'Study is under a retention hold. Remove the hold before requesting destruction.' }, { status: 400 });

    // Minimum retention: 15 years from study creation (regulatory requirement)
    const MIN_RETENTION_YEARS = 15;
    const studyAge = (Date.now() - new Date(study.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (studyAge < MIN_RETENTION_YEARS) {
      return Response.json({
        error: `Study must be retained for at least ${MIN_RETENTION_YEARS} years. This study was created ${studyAge.toFixed(1)} years ago.`,
      }, { status: 400 });
    }

    // Record the destruction request in the audit log
    // The trigger does not cover this action since no table row is being modified.
    // We insert directly into audit_log via the application client (which can INSERT but not UPDATE/DELETE).
    // Note: The application user cannot INSERT into audit_log because no INSERT RLS policy was created.
    // The correct implementation requires the service role or a specific RPC function.
    // For now, update the study row so the trigger captures it.
    const { error: updateErr } = await session.supabaseClient!
      .from('studies')
      .update({ lock_reason: `DESTRUCTION_REQUESTED: ${reason}` })
      .eq('id', studyId);

    if (updateErr) throw updateErr;

    return Response.json({
      success: true,
      status: 'destruction_requested',
      study_id: studyId,
      message: 'Destruction request recorded. A Supabase administrator must execute the physical deletion using the service role after confirming regulatory approval.',
    });
  } catch (e) {
    console.error('POST /api/admin/destruction-request error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
