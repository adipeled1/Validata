import mockData from '@/mockData.json';
import type { ResolvedSession } from '@/lib/auth-server';

// Single source of truth for the demo/live branching on measurements -
// shared by the GET route (src/app/api/measurements/route.js) and the
// mutation Server Actions (src/app/actions/measurements.js), which used to
// each duplicate this logic independently.

export type CreateMeasurementInput = {
  participantId: string;
  goniometer: string | number;
  aiModel: string | number;
  notes?: string;
  testDate?: string;
  studyId: string;
  // ICH E6(R3) INT-02 / CAP-02: attribution and capture-method metadata
  createdBy?: string;
  captureMethod?: 'manual_entry' | 'file_import';
};

export type UpdateMeasurementValidityInput = {
  id?: string | number;
  isValid: boolean;
  participantId?: string;
  studyId: string;
  // ICH E6(R3) COR-01: reason for every data correction must be captured
  reason?: string;
};

// session.supabaseClient is only null in demo mode (see resolveSession in
// auth-server.ts) - the `!` below is safe once the `session.isDemo` branch
// has already returned.

export async function listMeasurements(session: ResolvedSession, studyId?: string | null) {
  if (session.isDemo) {
    return studyId
      ? mockData.measurements.filter((m) => m.study_id === studyId)
      : mockData.measurements;
  }

  let query = session.supabaseClient!
    .from('measurements')
    .select('*')
    .order('timestamp', { ascending: false });

  if (studyId) query = query.eq('study_id', studyId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createMeasurement(
  session: ResolvedSession,
  { participantId, goniometer, aiModel, notes, testDate, studyId, createdBy, captureMethod }: CreateMeasurementInput
) {
  if (!studyId) {
    throw new Error('A study must be selected before logging a measurement.');
  }

  const parsedGoniometer = parseFloat(goniometer.toString().replace('°', '')) || 0.0;
  const parsedAiModel = parseFloat(aiModel.toString().replace('°', '')) || 0.0;

  if (session.isDemo) {
    return {
      participant_id: participantId,
      goniometer: parsedGoniometer,
      ai_model: parsedAiModel,
      notes,
      study_id: studyId,
      is_valid: true,
      timestamp: new Date().toISOString(),
      test_date: testDate || new Date().toISOString().split('T')[0],
      created_by: createdBy ?? null,
      capture_method: captureMethod ?? 'manual_entry',
    };
  }

  const { data, error } = await session.supabaseClient!
    .from('measurements')
    .insert({
      participant_id: participantId,
      goniometer: parsedGoniometer,
      ai_model: parsedAiModel,
      notes,
      study_id: studyId,
      timestamp: new Date().toISOString(),
      test_date: testDate || new Date().toISOString().split('T')[0],
      // ICH E6(R3) INT-02: store who entered this measurement and how
      created_by: createdBy ?? session.user.id,
      capture_method: captureMethod ?? 'manual_entry',
    })
    .select();

  if (error) throw error;
  return data[0];
}

// Toggle a measurement's valid/invalid flag, or bulk-invalidate every
// measurement for a participant (used when a participant is dropped).
// ICH E6(R3) COR-01: reason is captured and flows to the audit_log trigger.
// Only is_valid/validity_reason may ever be written here — this is now also
// enforced at the DB level by enforce_measurements_immutability() in
// supabase_setup.sql, which rejects any UPDATE touching another column.
export async function updateMeasurementValidity(
  session: ResolvedSession,
  { id, isValid, participantId, studyId, reason }: UpdateMeasurementValidityInput
) {
  if (session.isDemo) {
    return { id, participantId, is_valid: isValid };
  }

  if (participantId) {
    if (!studyId) {
      throw new Error('A study must be selected before updating measurements.');
    }

    const { data, error } = await session.supabaseClient!
      .from('measurements')
      .update({
        is_valid: isValid,
        // Store the reason in a dedicated column so the audit trigger picks
        // it up in new_value; a separate audit_log.reason column is written
        // by the application-level audit helper (see API/action layers).
        ...(reason ? { validity_reason: reason } : {}),
      })
      .eq('participant_id', participantId)
      .eq('study_id', studyId)
      .select();

    if (error) throw error;
    return data;
  }

  if (!studyId) {
    throw new Error('A study must be selected before updating measurements.');
  }

  const { data, error } = await session.supabaseClient!
    .from('measurements')
    .update({
      is_valid: isValid,
      ...(reason ? { validity_reason: reason } : {}),
    })
    .eq('id', id)
    .eq('study_id', studyId)
    .select();

  if (error) throw error;
  return data[0];
}

export async function createMeasurementsBatch(session: ResolvedSession, measurements: CreateMeasurementInput[]) {
  if (!measurements.length) return [];

  if (session.isDemo) {
    return measurements.map((m) => ({
      participant_id: m.participantId,
      goniometer: parseFloat(m.goniometer.toString().replace('°', '')) || 0.0,
      ai_model: parseFloat(m.aiModel.toString().replace('°', '')) || 0.0,
      notes: m.notes,
      study_id: m.studyId,
      is_valid: true,
      timestamp: new Date().toISOString(),
      test_date: m.testDate || new Date().toISOString().split('T')[0],
      created_by: m.createdBy ?? null,
      capture_method: m.captureMethod ?? 'file_import',
    }));
  }

  const rows = measurements.map((m) => ({
    participant_id: m.participantId,
    goniometer: parseFloat(m.goniometer.toString().replace('°', '')) || 0.0,
    ai_model: parseFloat(m.aiModel.toString().replace('°', '')) || 0.0,
    notes: m.notes || '',
    study_id: m.studyId,
    timestamp: new Date().toISOString(),
    test_date: m.testDate || new Date().toISOString().split('T')[0],
    created_by: m.createdBy ?? session.user.id,
    capture_method: m.captureMethod ?? 'file_import',
  }));

  const { data, error } = await session.supabaseClient!
    .from('measurements')
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}
