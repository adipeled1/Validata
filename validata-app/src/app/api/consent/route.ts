import { verifySession, canEditData, canReadOnly } from '@/lib/auth-server';
import {
  createConsentRecordSchema,
  createConsentFormVersionSchema,
  formatValidationError,
} from '@/lib/schemas';
import { CONSENT_VERSION_ROLES, hasRole } from '@/lib/permissions';
import { addConsentVersion, addConsentRecord, getConsentVersions, getConsentRecords } from '@/lib/demoStore';

// GET /api/consent?studyId=&participantId=
// Returns consent form versions and consent records (ICH E6(R3) CONSENT-01 to CONSENT-04).
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });
    if (!canReadOnly(session)) return Response.json({ error: 'Forbidden.' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');
    const participantId = searchParams.get('participantId');

    if (!studyId) return Response.json({ error: 'studyId is required.' }, { status: 400 });
    if (session.isDemo) {
      const records = participantId
        ? getConsentRecords(studyId).filter((r) => r.participant_id === participantId)
        : getConsentRecords(studyId);
      return Response.json({ versions: getConsentVersions(studyId), records });
    }

    const [versionsRes, recordsQuery] = await Promise.all([
      session.supabaseClient!.from('consent_form_versions').select('*').eq('study_id', studyId).order('created_at'),
      participantId
        ? session.supabaseClient!.from('consent_records').select('*').eq('study_id', studyId).eq('participant_id', participantId)
        : session.supabaseClient!.from('consent_records').select('*').eq('study_id', studyId),
    ]);

    if (versionsRes.error) throw versionsRes.error;
    if (recordsQuery.error) throw recordsQuery.error;

    return Response.json({ versions: versionsRes.data, records: recordsQuery.data });
  } catch (e) {
    console.error('GET /api/consent error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/consent
// Two sub-actions driven by body.action:
//   'create_version'  — add a new IRB-approved consent form version
//   'record_consent'  — record a participant's consent event
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) return Response.json({ error: session.error }, { status: session.status });

    const body = await request.json();

    if (body.action === 'create_version') {
      // Consent FORM VERSIONING is protocol-level document control
      // (mentor/admin), distinct from recording an individual participant's
      // consent below, so it's checked against the narrower
      // CONSENT_VERSION_ROLES rather than the general canEditData().
      if (!hasRole(session.profile.role, CONSENT_VERSION_ROLES)) {
        return Response.json({ error: 'Forbidden. Mentor or admin role required to create a consent form version.' }, { status: 403 });
      }
      const parsed = createConsentFormVersionSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
      const { studyId, version, irbApprovedAt, activatedAt, contentHash } = parsed.data;
      if (session.isDemo) {
        const row = addConsentVersion({ studyId, version, irbApprovedAt, activatedAt, contentHash, actorEmail: session.user.email });
        return Response.json(row, { status: 201 });
      }
      const { data, error } = await session.supabaseClient!.from('consent_form_versions').insert({
        study_id: studyId, version,
        irb_approved_at: irbApprovedAt ?? null,
        activated_at: activatedAt ?? null,
        content_hash: contentHash ?? null,
        created_by: session.user.id,
      }).select().single();
      if (error) throw error;
      return Response.json(data, { status: 201 });
    }

    if (body.action === 'record_consent') {
      if (!canEditData(session)) return Response.json({ error: 'Forbidden.' }, { status: 403 });
      const parsed = createConsentRecordSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
      const { participantId, studyId, formVersionId, method, copyDelivered, witnessedBy, notes } = parsed.data;
      if (session.isDemo) {
        const row = addConsentRecord({ studyId, participantId, formVersionId, method, copyDelivered, witnessedBy, notes, actorEmail: session.user.email });
        return Response.json(row, { status: 201 });
      }
      const { data, error } = await session.supabaseClient!.from('consent_records').insert({
        participant_id: participantId, study_id: studyId, form_version_id: formVersionId,
        method, copy_delivered: copyDelivered,
        witnessed_by: witnessedBy ?? null,
        recorded_by: session.user.id,
        notes: notes ?? null,
        consented_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      return Response.json(data, { status: 201 });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e) {
    console.error('POST /api/consent error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
