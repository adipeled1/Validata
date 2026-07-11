import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listMeasurements, createMeasurement, updateMeasurementValidity, createMeasurementsBatch } from './measurements';
import * as demoStore from '@/lib/demoStore';
import type { ResolvedSession } from '@/lib/auth-server';

const demoSession: ResolvedSession = {
  user: { id: 'demo-user', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

// File-wide, not per-describe - a spy left mocked in one describe block
// would otherwise leak its mock (and accumulated call history) into the
// next describe block's tests, since vi.spyOn re-wraps an already-spied
// function instead of creating a fresh one.
beforeEach(() => vi.restoreAllMocks());

describe('listMeasurements (demo mode)', () => {
  it('filters mockData.json measurements by studyId when given', async () => {
    const result = await listMeasurements(demoSession, 'demo-study-1');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((m: any) => m.study_id === 'demo-study-1')).toBe(true);
  });
});

describe('createMeasurement (demo mode)', () => {
  it('strips a trailing ° from goniometer/aiModel and defaults is_valid to true', async () => {
    vi.spyOn(demoStore, 'addAuditEntry').mockImplementation(() => ({} as any));
    const result = await createMeasurement(demoSession, {
      participantId: 'P-1001',
      goniometer: '45.0°',
      aiModel: '44.9°',
      studyId: 'demo-study-1',
    });
    expect(result.goniometer).toBe(45.0);
    expect(result.ai_model).toBe(44.9);
    expect(result.is_valid).toBe(true);
    expect(result.capture_method).toBe('manual_entry');
  });

  it('rejects when no study is selected', async () => {
    await expect(createMeasurement(demoSession, {
      participantId: 'P-1001', goniometer: 45, aiModel: 44, studyId: '',
    })).rejects.toThrow(/study must be selected/i);
  });
});

describe('updateMeasurementValidity (demo mode)', () => {
  it('always sets is_valid: false (one-way invalidation, no way to mark valid again)', async () => {
    vi.spyOn(demoStore, 'addAuditEntry').mockImplementation(() => ({} as any));
    const result = await updateMeasurementValidity(demoSession, { id: 5, studyId: 'demo-study-1' });
    expect(result.is_valid).toBe(false);
  });
});

describe('createMeasurementsBatch (demo mode)', () => {
  it('returns [] for an empty batch without touching demoStore', async () => {
    const spy = vi.spyOn(demoStore, 'addAuditEntry');
    expect(await createMeasurementsBatch(demoSession, [])).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('tags every row with capture_method: file_import by default', async () => {
    const result = await createMeasurementsBatch(demoSession, [
      { participantId: 'P-1001', goniometer: 45, aiModel: 44, studyId: 'demo-study-1' },
      { participantId: 'P-1002', goniometer: 50, aiModel: 49, studyId: 'demo-study-1' },
    ]);
    expect(result).toHaveLength(2);
    expect(result.every((r: any) => r.capture_method === 'file_import')).toBe(true);
  });
});

describe('live mode (Supabase-backed)', () => {
  function fakeSession(client: any): ResolvedSession {
    return {
      user: { id: 'live-user', email: 'mentor@live.com' },
      profile: { role: 'mentor', status: 'active' },
      isDemo: false,
      supabaseClient: client,
    };
  }

  it('createMeasurement inserts with the current user as created_by when none is supplied', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });

    await createMeasurement(fakeSession({ from }), {
      participantId: 'P-1001', goniometer: 45, aiModel: 44, studyId: 'study-1',
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ created_by: 'live-user' }));
  });

  it('updateMeasurementValidity scopes by participant_id + study_id when participantId is given (bulk-invalidate)', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], error: null });
    const eq2 = vi.fn().mockReturnValue({ select });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    const from = vi.fn().mockReturnValue({ update });

    const result = await updateMeasurementValidity(fakeSession({ from }), {
      participantId: 'P-1001', studyId: 'study-1', reason: 'dropped',
    });

    expect(eq1).toHaveBeenCalledWith('participant_id', 'P-1001');
    expect(eq2).toHaveBeenCalledWith('study_id', 'study-1');
    expect(result).toHaveLength(2);
  });

  it('updateMeasurementValidity requires a studyId when bulk-invalidating by participantId', async () => {
    await expect(updateMeasurementValidity(fakeSession({ from: vi.fn() }), {
      participantId: 'P-1001', studyId: '',
    })).rejects.toThrow(/study must be selected/i);
  });

  it('createMeasurementsBatch inserts every row in one call and returns them', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], error: null });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });

    const result = await createMeasurementsBatch(fakeSession({ from }), [
      { participantId: 'P-1001', goniometer: 45, aiModel: 44, studyId: 'study-1' },
      { participantId: 'P-1002', goniometer: 50, aiModel: 49, studyId: 'study-1' },
    ]);

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toHaveLength(2);
    expect(result).toHaveLength(2);
  });
});
