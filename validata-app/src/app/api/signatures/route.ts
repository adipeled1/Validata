import { verifySession } from '@/lib/auth-server';
import { createSignatureSchema, formatValidationError } from '@/lib/schemas';

const SIGNING_ROLES = ['mentor', 'sponsor_admin', 'investigator'];

// POST /api/signatures
// Records an electronic signature for a data milestone (ICH E6(R3) SIG-01, SIG-02, SIG-03).
// The caller must have already passed re-authentication via POST /api/auth/verify-credentials
// before calling this endpoint. Signatures are append-only (no UPDATE/DELETE RLS policy).
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!SIGNING_ROLES.includes(session.profile.role)) {
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
    const { studyId, recordType, recordId, milestone, meaning } = parsed.data;

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
