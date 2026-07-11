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
    if (!isMentor(session)) return Response.json({ error: 'Forbidden. Mentor or admin role required.' }, { status: 403 });

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

    // Record the destruction request in the audit log as its own
    // DESTRUCTION_REQUEST action via a dedicated RPC, rather than writing to
    // audit_log directly (application code has no INSERT policy on it) or
    // repurposing another column as a workaround. record_destruction_request()
    // is SECURITY DEFINER (bypasses RLS for this one insert only), matching
    // the pattern used by log_audit_event().
    const { error: rpcErr } = await session.supabaseClient!
      .rpc('record_destruction_request', { p_study_id: studyId, p_reason: reason });

    if (rpcErr) throw rpcErr;

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
