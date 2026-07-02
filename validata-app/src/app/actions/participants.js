"use server";

import { verifySession } from '../../lib/auth-server';
import { createParticipant, updateParticipantStatus } from '../../lib/repositories/participants';
import { createParticipantSchema, updateParticipantStatusSchema, formatValidationError } from '../../lib/schemas';

export async function createParticipantAction(input) {
  const session = await verifySession();
  if (session.error) {
    throw new Error(session.error);
  }

  const parsed = createParticipantSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  return createParticipant(session, parsed.data);
}

export async function updateParticipantStatusAction(input) {
  const session = await verifySession();
  if (session.error) {
    throw new Error(session.error);
  }

  const parsed = updateParticipantStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  return updateParticipantStatus(session, parsed.data);
}
