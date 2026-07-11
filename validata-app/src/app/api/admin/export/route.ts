import { verifySession, isMentor } from '@/lib/auth-server';
import { createHash } from 'crypto';

// GET /api/admin/export?studyId=
// Produces a JSON archival export of all study data with a SHA-256 integrity hash
// and generation timestamp (ICH E6(R3) RET-01, RET-03).
// Restricted to mentor.
//
// The response is streamed rather than built as one in-memory JSON string:
// for a study with a large audit log, holding the whole archive in memory
// (and JSON.stringify-ing it twice - once to hash, once to embed the hash)
// risks the lambda's memory ceiling and/or wall-clock timeout.
//
// The body is built incrementally as a sequence of JSON fragments; each
// fragment is fed into a running SHA-256 hash as it's enqueued, then a final
// `,"sha256":"<hash>"}` fragment closes the object - so the hash covers
// exactly the same `payload` (everything except the sha256 field itself)
// without ever holding the full JSON string in memory at once. The hash
// can't also be exposed as a response header (HTTP headers must be sent
// before the body, and the digest isn't final until the body is) - it's
// only available inside the JSON body's trailing "sha256" field, which is
// the one place a consumer needs it to verify the archive anyway.
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!isMentor(session)) return Response.json({ error: 'Forbidden. Mentor or admin role required.' }, { status: 403 });

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

    const sections: Array<[string, unknown[]]> = [
      ['participants', participantsRes.data ?? []],
      ['measurements', measurementsRes.data ?? []],
      ['audit_log', auditRes.data ?? []],
      ['signatures', signaturesRes.data ?? []],
      ['queries', queriesRes.data ?? []],
      ['adverse_events', aeRes.data ?? []],
    ];

    const hash = createHash('sha256');
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const emit = (chunk: string) => {
          hash.update(chunk);
          controller.enqueue(encoder.encode(chunk));
        };

        emit('{"export_version":"1.0"');
        emit(`,"generated_at":${JSON.stringify(new Date().toISOString())}`);
        emit(`,"generated_by":${JSON.stringify(session.user.email)}`);
        emit(`,"study":${JSON.stringify(studyRes.data)}`);

        for (const [key, rows] of sections) {
          emit(`,"${key}":[`);
          rows.forEach((row, i) => {
            emit((i > 0 ? ',' : '') + JSON.stringify(row));
          });
          emit(']');
        }

        // Everything up to here is exactly `payload` from the pre-streaming
        // version - the digest is final now, computed without ever building
        // the whole JSON string in memory.
        const digest = hash.digest('hex');
        controller.enqueue(encoder.encode(`,"sha256":${JSON.stringify(digest)}}`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="validata-export-${studyId}-${Date.now()}.json"`,
      },
    });
  } catch (e) {
    console.error('GET /api/admin/export error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
