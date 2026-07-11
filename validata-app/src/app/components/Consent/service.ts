import * as clientDemoStore from '../../../lib/clientDemoStore';

// Shared demo/live branching for creating a consent record - used by both
// the Consent Records page and the Participants view, so the two entry
// points that render <ConsentForm /> don't each carry their own copy of
// this logic (see ConsentForm.tsx for why there are two entry points at all).
export type CreateConsentRecordInput = {
  studyId: string;
  participantId: string;
  formVersionId: number;
  method: string;
  copyDelivered: boolean;
  witnessedBy?: string;
  notes?: string;
  isDemoMode: boolean;
  currentUserEmail: string;
};

export async function createConsentRecord(input: CreateConsentRecordInput): Promise<void> {
  if (input.isDemoMode) {
    clientDemoStore.addConsentRecord({
      studyId: input.studyId,
      participantId: input.participantId,
      formVersionId: input.formVersionId,
      method: input.method,
      copyDelivered: input.copyDelivered,
      witnessedBy: input.witnessedBy || undefined,
      notes: input.notes || undefined,
      actorEmail: input.currentUserEmail,
    });
    return;
  }

  const res = await fetch('/api/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // POST /api/consent requires `action` to route the request - omitting
      // it hits the route's "Unknown action." 400 branch.
      action: 'record_consent',
      participantId: input.participantId,
      studyId: input.studyId,
      formVersionId: input.formVersionId,
      method: input.method,
      copyDelivered: input.copyDelivered,
      witnessedBy: input.witnessedBy || undefined,
      notes: input.notes || undefined,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
}

// Fetches both form versions and records for a study - shared by the
// Consent Records page and the Participants view's "consent on file"
// indicator, so both read the same shape the same way.
export async function fetchConsent(
  studyId: string,
  isDemoMode: boolean
): Promise<{ versions: { id: number; version: string; irb_approved_at: string | null; activated_at: string | null; content_hash: string | null }[]; records: { id: string; participant_id: string; form_version_id: number; method: string; copy_delivered: boolean; witnessed_by: string | null; notes: string | null; created_at: string }[] }> {
  if (isDemoMode) {
    return {
      versions: clientDemoStore.getConsentVersions(studyId) as any,
      records: clientDemoStore.getConsentRecords(studyId) as any,
    };
  }
  const res = await fetch(`/api/consent?studyId=${studyId}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { versions: data.versions || [], records: data.records || [] };
}
