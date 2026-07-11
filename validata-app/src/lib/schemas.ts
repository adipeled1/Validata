import { z } from 'zod';

// Validation schemas for every Server Action / API route input boundary.
// Centralized here so the shape of what the client is allowed to send is
// defined once, not re-derived ad hoc at each call site.

const idOrNumber = z.union([z.string(), z.number()]);

// ICH E6(R3): expanded role set (AUTH-02).
// 'admin' is the highest role — separation of duties above 'mentor' so that no
// mentor can change or remove another mentor's account (avoids mutual lockout).
// 'mentor' covers the professor/PI, scoped globally across all studies same as admin.
export const roleSchema = z.enum([
  'admin',
  'mentor',
  'investigator',
  'site_coordinator',
  'data_manager',
  'monitor',
  'auditor',
  'irb_reviewer',
  'team_member',
]);

export const createParticipantSchema = z.object({
  id: z.string().optional(),
  age: idOrNumber.nullish(),
  gender: z.string().min(1),
  healthStatus: z.enum(['Healthy', 'Ankle Injured']),
  enrollmentDate: z.string().optional(),
  studyId: z.string().min(1),
});

export const updateParticipantStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['Active', 'Completed', 'Dropped']),
  studyId: z.string().min(1),
  // ICH E6(R3) COR-01: reason is required when dropping a participant
  reason: z.string().optional(),
});

export const createMeasurementSchema = z.object({
  participantId: z.string().min(1),
  goniometer: idOrNumber,
  aiModel: idOrNumber,
  notes: z.string().optional().default(''),
  testDate: z.string().optional(),
  studyId: z.string().min(1),
  // ICH E6(R3) CAP-02 / INT-02: attribution metadata
  captureMethod: z.enum(['manual_entry', 'file_import']).optional().default('manual_entry'),
});

// Invalidation is one-way (see FEATURES.md/MENTOR.md/INVESTIGATOR.md) - there
// is no "mark valid again" path, so this only ever sets is_valid to false.
export const updateMeasurementValiditySchema = z.object({
  id: idOrNumber.optional(),
  participantId: z.string().optional(),
  studyId: z.string().min(1),
  // ICH E6(R3) COR-01: reason for the invalidation
  reason: z.string().optional(),
});

export const createMeasurementsBatchSchema = z.array(createMeasurementSchema);

export const createStudySchema = z.object({
  name: z.string().min(1),
  recruitmentGoal: idOrNumber.optional(),
});

export const updateStudyGoalSchema = z.object({
  id: z.string().min(1),
  recruitmentGoal: idOrNumber,
});

export const deleteStudySchema = z.string().min(1);

// role/status here are deliberately narrower than the full profiles.status
// enum: 'applicant' is not in roleSchema and 'wait_email_confirm' /
// 'wait_approval' are not in this status enum, because this endpoint is for
// mentor-driven changes to an already-reviewed account (approve/suspend/
// reactivate, or change an operational role) - the applicant statuses are
// only ever set by the DB triggers (handle_new_user / handle_email_confirmed),
// never directly by application code. Approving a wait_approval applicant
// sets role + status together in one call (e.g. role: 'team_member',
// status: 'active'); the profiles_applicant_status_exclusive CHECK
// constraint would reject setting only one of the two.
// 'deleted' is also deliberately excluded here - it's only ever set by the
// dedicated DELETE handler (a soft-delete, distinct from suspend), not this
// generic PATCH, so this endpoint can never accidentally delete an account
// by being passed the wrong status string.
export const updateProfileSchema = z.object({
  id: z.string().min(1),
  role: roleSchema.optional(),
  status: z.enum(['active', 'suspended']).optional(),
  // ICH E6(R3) COR-01: reason for role/status change captured and stored in the audit trail
  reason: z.string().optional(),
});

export const lockStudySchema = z.object({
  studyId: z.string().min(1),
  reason: z.string().min(1, 'Lock reason is required'),
});

export const unlockStudySchema = z.object({
  studyId: z.string().min(1),
  reason: z.string().min(1, 'Unlock reason is required'),
});

export const createQuerySchema = z.object({
  studyId: z.string().min(1),
  recordTable: z.enum(['measurements', 'participants']),
  recordId: z.string().min(1),
  fieldName: z.string().min(1),
  severity: z.enum(['minor', 'major', 'critical']).default('minor'),
  queryText: z.string().min(1),
});

export const updateQuerySchema = z.object({
  status: z.enum(['answered', 'resolved', 'closed']),
  answerText: z.string().optional(),
});

export const createSignatureSchema = z.object({
  studyId: z.string().min(1),
  recordType: z.string().min(1),
  recordId: z.string().min(1),
  milestone: z.string().min(1),
  meaning: z.string().min(1),
  // Binds this request to a prior, successful POST /api/auth/verify-credentials
  // call - see signing-tokens.ts.
  signingToken: z.string().min(1),
});

// Phase 2 schemas

export const createConsentRecordSchema = z.object({
  participantId: z.string().min(1),
  studyId: z.string().min(1),
  formVersionId: z.number().int().positive(),
  method: z.enum(['written', 'electronic', 'verbal_with_witness']).default('written'),
  copyDelivered: z.boolean().default(false),
  witnessedBy: z.string().optional(),
  notes: z.string().optional(),
});

export const createConsentFormVersionSchema = z.object({
  studyId: z.string().min(1),
  version: z.string().min(1),
  irbApprovedAt: z.string().optional(),
  activatedAt: z.string().optional(),
  contentHash: z.string().optional(),
});

export const createAdverseEventSchema = z.object({
  studyId: z.string().min(1),
  participantId: z.string().min(1),
  aeType: z.enum(['ae', 'sae', 'susar']).default('ae'),
  description: z.string().min(1),
  severity: z.enum(['mild', 'moderate', 'severe', 'life_threatening', 'fatal']),
  causality: z.enum(['unrelated', 'unlikely', 'possible', 'probable', 'definite']),
  expectedness: z.enum(['expected', 'unexpected']).default('unexpected'),
  onsetDate: z.string().optional(),
  reportDate: z.string().min(1),
  notes: z.string().optional(),
});

export const updateAdverseEventSchema = z.object({
  resolutionDate: z.string().optional(),
  outcome: z.enum(['recovered', 'recovering', 'not_recovered', 'recovered_with_sequelae', 'fatal', 'unknown']).optional(),
  authoritySubmittedAt: z.string().optional(),
  notes: z.string().optional(),
});

export const createDestructionRequestSchema = z.object({
  studyId: z.string().min(1),
  reason: z.string().min(1, 'Destruction reason is required (ICH E6(R3) RET-02)'),
});

// Analysis is computed from the DB by studyId, not from client-submitted
// participants/measurements arrays - trusting client-supplied data here
// would let a caller POST arbitrary numbers and get back an "official"
// analysis computed on them.
export const analysisRequestSchema = z.object({
  studyId: z.string().min(1),
  threshold: idOrNumber.optional(),
});

// Formats a ZodError into a single readable message for toasts/API responses,
// instead of leaking the raw Zod issue array to the client.
export function formatValidationError(zodError: z.ZodError): string {
  const first = zodError.issues[0];
  const path = first.path.join('.');
  return path ? `Invalid ${path}: ${first.message}` : first.message;
}
