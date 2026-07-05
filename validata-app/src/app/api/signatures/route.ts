import { verifySession, canReadOnly } from '@/lib/auth-server';
import { createSignatureSchema, formatValidationError } from '@/lib/schemas';
import { consumeSigningToken } from '@/lib/signing-tokens';
import { SIGNING_ROLES, hasRole } from '@/lib/permissions';

// POST /api/signatures
// Records an electronic signature for a data milestone (ICH E6(R3) SIG-01, SIG-02, SIG-03).
// fable_system_review §2.4: re-authentication is now enforced here, not just
// choreographed by the client - a signingToken minted by a prior, successful
// POST /api/auth/verify-credentials is required and atomically consumed
// (single use), so this endpoint can't be called directly to sign without
// ever presenting a password. Signatures are append-only (no UPDATE/DELETE RLS policy).
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!hasRole(session.profile.role, SIGNING_ROLES)) {
      return Response.json(
        { error: 'Forbidden. Only investigators and sponsor admins may sign data.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createSignatureSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }
    const { studyId, recordType, recordId, milestone, meaning, signingToken } = parsed.data;

    const tokenValid = await consumeSigningToken(session, signingToken);
    if (!tokenValid) {
      return Response.json(
        { error: 'Re-authentication required or expired. Please re-enter your password and try again.' },
        { status: 401 }
      );
    }

    if (session.isDemo) {
      return Response.json(
        { id: 1, study_id: studyId, signer_email: session.user.email, signed_at: new Date().toISOString() },
        { status: 201 }
      );
    }

    const { data, error } = await session.supabaseClient!
      .from('signatures')
      .insert({
        study_id: studyId,
        signer_id: session.user.id,
        signer_email: session.user.email,
        record_type: recordType,
        record_id: recordId,
        milestone,
        meaning,
        signed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/signatures error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

// GET /api/signatures?studyId=...
// Returns all signatures for a study (ICH E6(R3) SIG-03).
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    // fable_system_review §2.1: this endpoint previously had no role check at
    // all while the signatures log page restricted viewing to compliance
    // roles - any authenticated active user could list every signature for a
    // study. Aligned to the same READABLE_ROLES set used everywhere else.
    if (!canReadOnly(session)) {
      return Response.json({ error: 'Forbidden.' }, { status: 403 });
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
      .from('signatures')
      .select('*')
      .eq('study_id', studyId)
      .order('signed_at', { ascending: false });

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    console.error('GET /api/signatures error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
