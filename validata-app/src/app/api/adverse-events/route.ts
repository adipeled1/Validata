import { verifySession, canEditData, canReadOnly } from '@/lib/auth-server';
import { createAdverseEventSchema, updateAdverseEventSchema, formatValidationError } from '@/lib/schemas';

// Authority reporting deadlines per ICH E6(R3) SAFETY-03 and E2A:
// - SAE/SUSAR fatal or life-threatening, unexpected: 7 calendar days
// - SAE/SUSAR other unexpected: 15 calendar days
function calculateDeadline(aeType: string, severity: string, expectedness: string, reportDate: string): string | null {
  if (aeType === 'ae') return null; // non-serious AEs have no expedited reporting deadline
  const isFatal = severity === 'fatal' || severity === 'life_threatening';
  const isUnexpected = expectedness === 'unexpected';
  if (!isUnexpected) return null;
  const days = isFatal ? 7 : 15;
  // fable_system_review §8.12: reportDate is a bare YYYY-MM-DD. `new
  // Date(reportDate)` parses that as UTC midnight, but setDate()/getDate()
  // operate in the server's LOCAL timezone - for a server west of UTC this
  // silently reads back the previous day before adding `days`, shifting the
  // regulatory deadline by a day. Do the arithmetic in UTC throughout.
  const d = new Date(reportDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

// GET /api/adverse-events?studyId=
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!canReadOnly(session)) return Response.json({ error: 'Forbidden.' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');
    if (!studyId) return Response.json({ error: 'studyId is required.' }, { status: 400 });
    if (session.isDemo) return Response.json([]);

    const { data, error } = await session.supabaseClient!
      .from('adverse_events')
      .select('*')
      .eq('study_id', studyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    console.error('GET /api/adverse-events error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/adverse-events — report a new AE/SAE (ICH E6(R3) SAFETY-01, SAFETY-02)
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!canEditData(session)) return Response.json({ error: 'Forbidden.' }, { status: 403 });

    const body = await request.json();
    const parsed = createAdverseEventSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });

    const { studyId, participantId, aeType, description, severity, causality, expectedness, onsetDate, reportDate, notes } = parsed.data;
    const deadline = calculateDeadline(aeType, severity, expectedness, reportDate);

    if (session.isDemo) {
      return Response.json({ id: 1, study_id: studyId, ae_type: aeType, authority_deadline: deadline }, { status: 201 });
    }

    const { data, error } = await session.supabaseClient!
      .from('adverse_events')
      .insert({
        study_id: studyId,
        participant_id: participantId,
        ae_type: aeType,
        description,
        severity,
        causality,
        expectedness,
        onset_date: onsetDate ?? null,
        report_date: reportDate,
        authority_deadline: deadline,
        reported_by: session.user.id,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (e) {
    console.error('POST /api/adverse-events error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
