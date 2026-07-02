import { z } from 'zod';

// Validation schemas for every Server Action / API route input boundary.
// Centralized here so the shape of what the client is allowed to send is
// defined once, not re-derived ad hoc at each call site.

const idOrNumber = z.union([z.string(), z.number()]);

export const createParticipantSchema = z.object({
  id: z.string().min(1),
  consent: z.boolean(),
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
});

export const createMeasurementSchema = z.object({
  participantId: z.string().min(1),
  goniometer: idOrNumber,
  aiModel: idOrNumber,
  notes: z.string().optional().default(''),
  testDate: z.string().optional(),
  studyId: z.string().min(1),
});

export const updateMeasurementValiditySchema = z.object({
  id: idOrNumber.optional(),
  isValid: z.boolean(),
  participantId: z.string().optional(),
  studyId: z.string().optional(),
});

export const createStudySchema = z.object({
  name: z.string().min(1),
  recruitmentGoal: idOrNumber.optional(),
});

export const updateStudyGoalSchema = z.object({
  id: z.string().min(1),
  recruitmentGoal: idOrNumber,
});

export const deleteStudySchema = z.string().min(1);

export const updateProfileSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['mentor', 'team_member']).optional(),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
});

export const analysisRequestSchema = z.object({
  threshold: idOrNumber.optional(),
  measurements: z.array(z.record(z.string(), z.any())).optional().default([]),
  participants: z.array(z.record(z.string(), z.any())).optional().default([]),
});

// Formats a ZodError into a single readable message for toasts/API responses,
// instead of leaking the raw Zod issue array to the client.
export function formatValidationError(zodError: z.ZodError): string {
  const first = zodError.issues[0];
  const path = first.path.join('.');
  return path ? `Invalid ${path}: ${first.message}` : first.message;
}
