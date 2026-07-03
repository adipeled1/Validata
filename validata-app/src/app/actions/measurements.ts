"use server";

import { verifySession } from '../../lib/auth-server';
import {
  createMeasurement,
  createMeasurementsBatch,
  updateMeasurementValidity,
  type CreateMeasurementInput,
  type UpdateMeasurementValidityInput,
} from '../../lib/repositories/measurements';
import {
  createMeasurementSchema,
  createMeasurementsBatchSchema,
  updateMeasurementValiditySchema,
  formatValidationError,
} from '../../lib/schemas';

export async function createMeasurementAction(input: unknown) {
  const session = await verifySession();
  if ('error' in session) {
    throw new Error(session.error);
  }

  const parsed = createMeasurementSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  // ICH E6(R3) INT-02: inject the authenticated user's ID so the measurement
  // row is attributable to a specific individual — the client must not supply this.
  return createMeasurement(session, {
    ...(parsed.data as CreateMeasurementInput),
    createdBy: session.user.id,
    captureMethod: parsed.data.captureMethod ?? 'manual_entry',
  });
}

export async function createMeasurementsBatchAction(input: unknown) {
  const session = await verifySession();
  if ('error' in session) {
    throw new Error(session.error);
  }

  const parsed = createMeasurementsBatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  // ICH E6(R3) INT-02 + CAP-07: batch import is tagged as file_import so
  // the capture method is distinguishable from manual entry in the audit trail.
  const rows = (parsed.data as CreateMeasurementInput[]).map((row) => ({
    ...row,
    createdBy: session.user.id,
    captureMethod: 'file_import' as const,
  }));

  return createMeasurementsBatch(session, rows);
}

export async function updateMeasurementValidityAction(input: unknown) {
  const session = await verifySession();
  if ('error' in session) {
    throw new Error(session.error);
  }

  const parsed = updateMeasurementValiditySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatValidationError(parsed.error));
  }

  return updateMeasurementValidity(session, parsed.data as UpdateMeasurementValidityInput);
}
