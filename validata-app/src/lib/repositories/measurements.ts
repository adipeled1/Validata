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
};

export type UpdateMeasurementValidityInput = {
  id?: string | number;
  isValid: boolean;
  participantId?: string;
  studyId?: string;
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

export async function createMeasurement(session: ResolvedSession, { participantId, goniometer, aiModel, notes, testDate, studyId }: CreateMeasurementInput) {
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
      test_date: testDate || new Date().toISOString().split('T')[0]
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
      test_date: testDate || new Date().toISOString().split('T')[0]
    })
    .select();

  if (error) throw error;
  return data[0];
}

// Toggle a measurement's valid/invalid flag, or bulk-invalidate every
// measurement for a participant (used when a participant is dropped).
export async function updateMeasurementValidity(session: ResolvedSession, { id, isValid, participantId, studyId }: UpdateMeasurementValidityInput) {
  if (session.isDemo) {
    return { id, participantId, is_valid: isValid };
  }

  if (participantId) {
    if (!studyId) {
      throw new Error('A study must be selected before updating measurements.');
    }

    const { data, error } = await session.supabaseClient!
      .from('measurements')
      .update({ is_valid: isValid })
      .eq('participant_id', participantId)
      .eq('study_id', studyId)
      .select();

    if (error) throw error;
    return data;
  }

  const { data, error } = await session.supabaseClient!
    .from('measurements')
    .update({ is_valid: isValid })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}
