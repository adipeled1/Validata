import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStudies, listDeletedStudies, createStudy, updateStudyGoal, softDeleteStudy } from './studies';
import * as demoStore from '@/lib/demoStore';
import type { ResolvedSession } from '@/lib/auth-server';

const demoSession: ResolvedSession = {
  user: { id: 'demo-user', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

// File-wide, not per-describe - see measurements.test.ts for why a
// per-describe hook isn't enough to stop a spy leaking into later blocks.
beforeEach(() => vi.restoreAllMocks());

describe('listStudies (demo mode)', () => {
  it('merges in a lock override when one is on record', async () => {
    vi.spyOn(demoStore, 'getStudyLockOverride').mockImplementation((id: string) =>
      id === 'demo-study-1' ? { lock_state: 'locked' } as any : null
    );
    const result = await listStudies(demoSession);
    const study1 = result.find((s: any) => s.id === 'demo-study-1');
    expect(study1?.lock_state).toBe('locked');
  });
});

describe('listDeletedStudies (demo mode)', () => {
  it('always returns [] - demo mode has no soft-delete workflow', async () => {
    expect(await listDeletedStudies(demoSession)).toEqual([]);
  });
});

describe('createStudy (demo mode)', () => {
  it('defaults recruitment_goal to 50 when not a valid number', async () => {
    vi.spyOn(demoStore, 'addAuditEntry').mockImplementation(() => ({} as any));
    const result = await createStudy(demoSession, { name: 'New Study' });
    expect(result.recruitment_goal).toBe(50);
    expect(result.name).toBe('New Study');
  });

  it('rejects a blank/whitespace-only name', async () => {
    await expect(createStudy(demoSession, { name: '' })).rejects.toThrow(/name is required/i);
    await expect(createStudy(demoSession, { name: '   ' })).rejects.toThrow(/name is required/i);
  });
});

describe('updateStudyGoal (demo mode)', () => {
  it('echoes back the id/goal without touching Supabase', async () => {
    expect(await updateStudyGoal(demoSession, { id: 's1', recruitmentGoal: 75 })).toEqual({ id: 's1', recruitment_goal: 75 });
  });
});

describe('softDeleteStudy (demo mode)', () => {
  it('rejects a missing id even in demo mode', async () => {
    await expect(softDeleteStudy(demoSession, { id: '' })).rejects.toThrow(/id is required/i);
  });

  it('returns just the id in demo mode (no real retention-hold check)', async () => {
    expect(await softDeleteStudy(demoSession, { id: 's1' })).toEqual({ id: 's1' });
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

  it('softDeleteStudy blocks deletion when the study has an active retention hold', async () => {
    const single = vi.fn().mockResolvedValue({ data: { retention_hold: true, name: 'Held Study' }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    await expect(softDeleteStudy(fakeSession({ from }), { id: 's1' })).rejects.toThrow(/retention hold/i);
  });

  it('softDeleteStudy proceeds (sets deleted_at/deleted_by) when there is no retention hold', async () => {
    const single = vi.fn().mockResolvedValue({ data: { retention_hold: false, name: 'Free Study' }, error: null });
    const selectEq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq: selectEq });

    const updateSelect = vi.fn().mockResolvedValue({ data: [{ id: 's1' }], error: null });
    const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    const from = vi.fn().mockReturnValue({ select, update });

    const result = await softDeleteStudy(fakeSession({ from }), { id: 's1', reason: 'no longer needed' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ deleted_by: 'live-user' }));
    expect(result).toEqual({ id: 's1' });
  });

  it('listStudies only returns non-deleted studies (filters deleted_at IS NULL)', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const is = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ is });
    const from = vi.fn().mockReturnValue({ select });

    await listStudies(fakeSession({ from }));
    expect(is).toHaveBeenCalledWith('deleted_at', null);
  });
});
