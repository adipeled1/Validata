import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  roleSchema,
  createParticipantSchema,
  updateParticipantStatusSchema,
  updateProfileSchema,
  createConsentRecordSchema,
  createAdverseEventSchema,
  formatValidationError,
} from './schemas';

describe('roleSchema', () => {
  it('accepts every operational role', () => {
    for (const role of ['admin', 'mentor', 'investigator', 'site_coordinator', 'data_manager', 'monitor', 'auditor', 'irb_reviewer', 'team_member']) {
      expect(roleSchema.safeParse(role).success).toBe(true);
    }
  });

  it('rejects "applicant" - it is deliberately excluded (only ever set by DB triggers)', () => {
    expect(roleSchema.safeParse('applicant').success).toBe(false);
  });

  it('rejects an unknown role', () => {
    expect(roleSchema.safeParse('superadmin').success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('accepts active/suspended', () => {
    expect(updateProfileSchema.safeParse({ id: 'u1', status: 'active' }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ id: 'u1', status: 'suspended' }).success).toBe(true);
  });

  it('rejects "deleted" - only the dedicated DELETE handler may set it', () => {
    expect(updateProfileSchema.safeParse({ id: 'u1', status: 'deleted' }).success).toBe(false);
  });

  it('rejects the applicant-only onboarding statuses', () => {
    expect(updateProfileSchema.safeParse({ id: 'u1', status: 'wait_email_confirm' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ id: 'u1', status: 'wait_approval' }).success).toBe(false);
  });

  it('requires a non-empty id', () => {
    expect(updateProfileSchema.safeParse({ id: '', status: 'active' }).success).toBe(false);
  });
});

describe('createParticipantSchema', () => {
  it('accepts a valid payload', () => {
    const result = createParticipantSchema.safeParse({
      gender: 'Female',
      healthStatus: 'Healthy',
      studyId: 'study-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid healthStatus', () => {
    const result = createParticipantSchema.safeParse({
      gender: 'Female',
      healthStatus: 'Sick',
      studyId: 'study-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing studyId', () => {
    const result = createParticipantSchema.safeParse({ gender: 'Female', healthStatus: 'Healthy' });
    expect(result.success).toBe(false);
  });

  it('accepts age as either a string or a number, and allows it to be omitted', () => {
    expect(createParticipantSchema.safeParse({ gender: 'M', healthStatus: 'Healthy', studyId: 's1', age: '35' }).success).toBe(true);
    expect(createParticipantSchema.safeParse({ gender: 'M', healthStatus: 'Healthy', studyId: 's1', age: 35 }).success).toBe(true);
    expect(createParticipantSchema.safeParse({ gender: 'M', healthStatus: 'Healthy', studyId: 's1' }).success).toBe(true);
  });
});

describe('updateParticipantStatusSchema', () => {
  it('accepts the three valid statuses', () => {
    for (const status of ['Active', 'Completed', 'Dropped']) {
      expect(updateParticipantStatusSchema.safeParse({ id: 'P-1', status, studyId: 's1' }).success).toBe(true);
    }
  });

  it('rejects a lowercase status - the enum is case-sensitive', () => {
    expect(updateParticipantStatusSchema.safeParse({ id: 'P-1', status: 'active', studyId: 's1' }).success).toBe(false);
  });
});

describe('createConsentRecordSchema', () => {
  it('accepts a minimal valid payload and defaults method/copyDelivered', () => {
    const result = createConsentRecordSchema.safeParse({
      participantId: 'P-1001',
      studyId: 'study-1',
      formVersionId: 301,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.method).toBe('written');
      expect(result.data.copyDelivered).toBe(false);
    }
  });

  it('rejects a non-positive formVersionId', () => {
    expect(createConsentRecordSchema.safeParse({
      participantId: 'P-1001', studyId: 'study-1', formVersionId: 0,
    }).success).toBe(false);
    expect(createConsentRecordSchema.safeParse({
      participantId: 'P-1001', studyId: 'study-1', formVersionId: -1,
    }).success).toBe(false);
  });

  it('rejects an unknown method', () => {
    expect(createConsentRecordSchema.safeParse({
      participantId: 'P-1001', studyId: 'study-1', formVersionId: 301, method: 'telepathic',
    }).success).toBe(false);
  });
});

describe('createAdverseEventSchema', () => {
  it('accepts a valid payload and defaults aeType/expectedness', () => {
    const result = createAdverseEventSchema.safeParse({
      studyId: 'study-1',
      participantId: 'P-1001',
      description: 'Mild headache',
      severity: 'mild',
      causality: 'possible',
      reportDate: '2026-07-11',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aeType).toBe('ae');
      expect(result.data.expectedness).toBe('unexpected');
    }
  });

  it('rejects a missing severity/causality', () => {
    const result = createAdverseEventSchema.safeParse({
      studyId: 'study-1',
      participantId: 'P-1001',
      description: 'Mild headache',
      reportDate: '2026-07-11',
    });
    expect(result.success).toBe(false);
  });
});

describe('formatValidationError', () => {
  it('includes the field path when one exists', () => {
    const result = createParticipantSchema.safeParse({ gender: 'F', healthStatus: 'Sick', studyId: 's1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatValidationError(result.error)).toMatch(/^Invalid healthStatus:/);
    }
  });

  it('falls back to the bare message when there is no path (root-level schema)', () => {
    const rootSchema = z.string().min(1);
    const result = rootSchema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatValidationError(result.error)).not.toMatch(/^Invalid /);
    }
  });
});
