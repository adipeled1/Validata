"use server";

import { verifySession } from '../../lib/auth-server';
import { createStudy, updateStudyGoal, deleteStudy } from '../../lib/repositories/studies';
import { createStudySchema, updateStudyGoalSchema, deleteStudySchema, formatValidationError } from '../../lib/schemas';

export async function createStudyAction(input) {
  const session = await verifySession();
  if (session.error) {
    throw new Error(session.error);
  }
  if (session.profile.role !== 'mentor') {
    throw new Error('Forbidden. Only mentors can create studies.');
  }

  const parsed = createStudySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  return createStudy(session, parsed.data);
}

export async function updateStudyGoalAction(input) {
  const session = await verifySession();
  if (session.error) {
    throw new Error(session.error);
  }
  if (session.profile.role !== 'mentor') {
    throw new Error('Forbidden. Only mentors can update studies.');
  }

  const parsed = updateStudyGoalSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  return updateStudyGoal(session, parsed.data);
}

export async function deleteStudyAction(id) {
  const session = await verifySession();
  if (session.error) {
    throw new Error(session.error);
  }
  if (session.profile.role !== 'mentor') {
    throw new Error('Forbidden. Only mentors can delete studies.');
  }

  const parsed = deleteStudySchema.safeParse(id);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  return deleteStudy(session, parsed.data);
}
