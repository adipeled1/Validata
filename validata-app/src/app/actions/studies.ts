"use server";

import { verifySession, isMentor } from '../../lib/auth-server';
import {
  createStudy,
  updateStudyGoal,
  softDeleteStudy,
  type CreateStudyInput,
  type UpdateStudyGoalInput,
} from '../../lib/repositories/studies';
import {
  createStudySchema,
  updateStudyGoalSchema,
  deleteStudySchema,
  formatValidationError,
} from '../../lib/schemas';

export async function createStudyAction(input: unknown) {
  const session = await verifySession();
  if ('error' in session) throw new Error(session.error);
  if (!isMentor(session)) throw new Error('Forbidden. Only mentors can create studies.');

  const parsed = createStudySchema.safeParse(input);
  if (!parsed.success) throw new Error(formatValidationError(parsed.error));

  return createStudy(session, parsed.data as CreateStudyInput);
}

export async function updateStudyGoalAction(input: unknown) {
  const session = await verifySession();
  if ('error' in session) throw new Error(session.error);
  if (!isMentor(session)) throw new Error('Forbidden. Only mentors can update studies.');

  const parsed = updateStudyGoalSchema.safeParse(input);
  if (!parsed.success) throw new Error(formatValidationError(parsed.error));

  return updateStudyGoal(session, parsed.data as UpdateStudyGoalInput);
}

// ICH E6(R3) RET-01, RET-02: renamed from deleteStudyAction to make the
// soft-delete behaviour explicit. The study is marked deleted_at but all
// clinical data is retained in the database.
export async function deleteStudyAction(id: unknown, reason?: string) {
  const session = await verifySession();
  if ('error' in session) throw new Error(session.error);
  if (!isMentor(session)) throw new Error('Forbidden. Only mentors can delete studies.');

  const parsed = deleteStudySchema.safeParse(id);
  if (!parsed.success) throw new Error(formatValidationError(parsed.error));

  return softDeleteStudy(session, { id: parsed.data, reason });
}
