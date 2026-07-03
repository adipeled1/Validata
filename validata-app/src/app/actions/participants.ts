"use server";

import { verifySession } from '../../lib/auth-server';
import {
  createParticipant,
  updateParticipantStatus,
  type CreateParticipantInput,
  type UpdateParticipantStatusInput,
} from '../../lib/repositories/participants';
import {
  createParticipantSchema,
  updateParticipantStatusSchema,
  formatValidationError,
} from '../../lib/schemas';

export async function createParticipantAction(input: unknown) {
  const session = await verifySession();
  if ('error' in session) {
    throw new Error(session.error);
  }

  const parsed = createParticipantSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  return createParticipant(session, parsed.data as CreateParticipantInput);
}

export async function updateParticipantStatusAction(input: unknown) {
  const session = await verifySession();
  if ('error' in session) {
    throw new Error(session.error);
  }

  const parsed = updateParticipantStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  // ICH E6(R3) COR-01: reason flows from the UI through the schema into the
  // repository, where it is stored in status_reason and captured by the
  // audit trigger in old_value / new_value.
  return updateParticipantStatus(session, parsed.data as UpdateParticipantStatusInput);
}
