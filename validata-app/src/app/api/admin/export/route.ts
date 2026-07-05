import { verifySession, isMentor } from '@/lib/auth-server';
import { createHash } from 'crypto';

// GET /api/admin/export?studyId=
// Produces a JSON archival export of all study data with a SHA-256 integrity hash
// and generation timestamp (ICH E6(R3) RET-01, RET-03).
// Restricted to mentor.
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!isMentor(session)) return Response.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');
    if (!studyId) return Response.json({ error: 'studyId is required.' }, { status: 400 });

    if (session.isDemo) {
      return Response.json({ study_id: studyId, participants: [], measurements: [], audit_log: [], generated_at: new Date().toISOString(), sha256: '' });
    }

    const [studyRes, participantsRes, measurementsRes, auditRes, signaturesRes, queriesRes, aeRes] =
      await Promise.all([
        session.supabaseClient!.from('studies').select('*').eq('id', studyId).single(),
        session.supabaseClient!.from('participants').select('*').eq('study_id', studyId),
        session.supabaseClient!.from('measurements').select('*').eq('study_id', studyId),
        session.supabaseClient!.from('audit_log').select('*').eq('study_id', studyId).order('occurred_at'),
        session.supabaseClient!.from('signatures').select('*').eq('study_id', studyId),
        session.supabaseClient!.from('queries').select('*').eq('study_id', studyId),
        session.supabaseClient!.from('adverse_events').select('*').eq('study_id', studyId),
      ]);

    const payload = {
      export_version: '1.0',
      generated_at: new Date().toISOString(),
      generated_by: session.user.email,
      study: studyRes.data,
      participants: participantsRes.data ?? [],
      measurements: measurementsRes.data ?? [],
      audit_log: auditRes.data ?? [],
      signatures: signaturesRes.data ?? [],
      queries: queriesRes.data ?? [],
      adverse_events: aeRes.data ?? [],
    };

    const json = JSON.stringify(payload, null, 2);
    const hash = createHash('sha256').update(json).digest('hex');
    const envelope = { ...payload, sha256: hash };
    const envelopeJson = JSON.stringify(envelope, null, 2);

    return new Response(envelopeJson, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="validata-export-${studyId}-${Date.now()}.json"`,
        'X-Content-SHA256': hash,
      },
    });
  } catch (e) {
    console.error('GET /api/admin/export error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
