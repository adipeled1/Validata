"use server";

import { verifySession } from '../../lib/auth-server';
import { createMeasurement, updateMeasurementValidity } from '../../lib/repositories/measurements';
import { createMeasurementSchema, updateMeasurementValiditySchema, formatValidationError } from '../../lib/schemas';

export async function createMeasurementAction(input) {
  const session = await verifySession();
  if (session.error) {
    throw new Error(session.error);
  }

  const parsed = createMeasurementSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  return createMeasurement(session, parsed.data);
}

export async function updateMeasurementValidityAction(input) {
  const session = await verifySession();
  if (session.error) {
    throw new Error(session.error);
  }

  const parsed = updateMeasurementValiditySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  return updateMeasurementValidity(session, parsed.data);
}
