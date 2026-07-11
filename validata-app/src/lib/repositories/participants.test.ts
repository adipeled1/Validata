import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listParticipants, createParticipant, updateParticipantStatus } from './participants';
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

describe('listParticipants (demo mode)', () => {
  it('filters mockData.json participants by studyId when given', async () => {
    const result = await listParticipants(demoSession, 'demo-study-1');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p: any) => p.study_id === 'demo-study-1')).toBe(true);
  });

  it('returns every participant when no studyId is given', async () => {
    const filtered = await listParticipants(demoSession, 'demo-study-1');
    const unfiltered = await listParticipants(demoSession, null);
    expect(unfiltered.length).toBeGreaterThanOrEqual(filtered.length);
  });
});

describe('createParticipant (demo mode)', () => {
  it('generates an id, logs an audit entry, and returns a live-DB-shaped row', async () => {
    const auditSpy = vi.spyOn(demoStore, 'addAuditEntry').mockImplementation(() => ({} as any));

    const result = await createParticipant(demoSession, {
      gender: 'Female',
      healthStatus: 'Healthy',
      studyId: 'demo-study-1',
    });

    expect(result.id).toMatch(/^P-/);
    expect(result.status).toBe('Active');
    expect(result.health_status).toBe('Healthy');
    expect(result.study_id).toBe('demo-study-1');
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'INSERT', tableName: 'participants' }));
  });

  it('rejects when no study is selected', async () => {
    await expect(createParticipant(demoSession, {
      gender: 'Female',
      healthStatus: 'Healthy',
      studyId: '',
    })).rejects.toThrow(/study must be selected/i);
  });
});

describe('updateParticipantStatus (demo mode)', () => {
  it('logs a STATUS_CHANGE audit entry and returns the new status', async () => {
    const auditSpy = vi.spyOn(demoStore, 'addAuditEntry').mockImplementation(() => ({} as any));

    const result = await updateParticipantStatus(demoSession, {
      id: 'P-1001',
      status: 'Dropped',
      studyId: 'demo-study-1',
      reason: 'Withdrew consent',
    });

    expect(result).toEqual({ id: 'P-1001', status: 'Dropped' });
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'STATUS_CHANGE',
      recordId: 'P-1001',
      reason: 'Withdrew consent',
    }));
  });

  it('rejects when no study is selected', async () => {
    await expect(updateParticipantStatus(demoSession, {
      id: 'P-1001',
      status: 'Dropped',
      studyId: '',
    })).rejects.toThrow(/study must be selected/i);
  });
});

describe('live mode (Supabase-backed)', () => {
  function fakeSession(chain: any): ResolvedSession {
    return {
      user: { id: 'live-user', email: 'mentor@live.com' },
      profile: { role: 'mentor', status: 'active' },
      isDemo: false,
      supabaseClient: chain,
    };
  }

  it('createParticipant calls next_participant_id() when no id is supplied, then inserts with it', async () => {
    const insertedRow = { id: 'P-2001', status: 'Active' };
    const rpc = vi.fn().mockResolvedValue({ data: 'P-2001', error: null });
    const select = vi.fn().mockResolvedValue({ data: [insertedRow], error: null });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const client = { rpc, from };

    const result = await createParticipant(fakeSession(client), {
      gender: 'Male',
      healthStatus: 'Healthy',
      studyId: 'study-1',
    });

    expect(rpc).toHaveBeenCalledWith('next_participant_id', { p_study_id: 'study-1' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ id: 'P-2001' }));
    expect(result).toEqual(insertedRow);
  });

  it('createParticipant propagates a Supabase error instead of swallowing it', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('rpc failed') });
    const client = { rpc, from: vi.fn() };

    await expect(createParticipant(fakeSession(client), {
      gender: 'Male',
      healthStatus: 'Healthy',
      studyId: 'study-1',
    })).rejects.toThrow('rpc failed');
  });

  it('updateParticipantStatus scopes the update by both id and study_id', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: 'P-1001', status: 'Dropped' }], error: null });
    const eq2 = vi.fn().mockReturnValue({ select });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    const from = vi.fn().mockReturnValue({ update });
    const client = { from };

    await updateParticipantStatus(fakeSession(client), { id: 'P-1001', status: 'Dropped', studyId: 'study-1', reason: 'left' });

    expect(from).toHaveBeenCalledWith('participants');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'Dropped', status_reason: 'left' }));
    expect(eq1).toHaveBeenCalledWith('id', 'P-1001');
    expect(eq2).toHaveBeenCalledWith('study_id', 'study-1');
  });
});
