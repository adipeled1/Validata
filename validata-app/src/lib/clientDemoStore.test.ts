import { describe, it, expect, beforeEach } from 'vitest';
import {
  addConsentVersion,
  getConsentVersions,
  addConsentRecord,
  getConsentRecords,
  setUserOverride,
  deleteUserOverride,
  getUserOverride,
  applyUserOverride,
} from './clientDemoStore';

// Every function here does load -> mutate -> save against sessionStorage
// directly (see clientDemoStore.ts's own comment on why there's no separate
// in-memory cache), so clearing it between tests is enough to get a clean
// initState() each time - no need to mock the module itself.
beforeEach(() => {
  window.sessionStorage.clear();
});

describe('consent form versions + records', () => {
  it('addConsentVersion is retrievable via getConsentVersions, scoped by studyId', () => {
    addConsentVersion({ studyId: 'study-A', version: 'v2.0', actorEmail: 'mentor@demo.com' });
    addConsentVersion({ studyId: 'study-B', version: 'v9.9', actorEmail: 'mentor@demo.com' });

    const versionsA = getConsentVersions('study-A');
    expect(versionsA.some((v) => v.version === 'v2.0')).toBe(true);
    expect(versionsA.some((v) => v.version === 'v9.9')).toBe(false);
  });

  it('addConsentRecord is retrievable via getConsentRecords, scoped by studyId', () => {
    const version = addConsentVersion({ studyId: 'study-A', version: 'v2.0', actorEmail: 'mentor@demo.com' });
    const record = addConsentRecord({
      studyId: 'study-A',
      participantId: 'P-9001',
      formVersionId: version.id,
      method: 'written',
      copyDelivered: true,
      actorEmail: 'mentor@demo.com',
    });

    expect(record.id).toMatch(/^CR-/);
    expect(record.form_version_id).toBe(version.id);

    const records = getConsentRecords('study-A');
    expect(records.find((r) => r.id === record.id)).toBeTruthy();
    expect(getConsentRecords('other-study').find((r) => r.id === record.id)).toBeUndefined();
  });
});

describe('user overrides (suspend/delete/reactivate)', () => {
  it('setUserOverride merges into whatever override already exists, rather than replacing it', () => {
    setUserOverride({ userId: 'u1', userEmail: 'a@demo.com', role: 'mentor', actorEmail: 'admin@demo.com' });
    setUserOverride({ userId: 'u1', userEmail: 'a@demo.com', status: 'suspended', actorEmail: 'admin@demo.com' });

    const override = getUserOverride('u1');
    expect(override?.role).toBe('mentor');
    expect(override?.status).toBe('suspended');
  });

  it('setting status to active clears any prior deleted_at', () => {
    deleteUserOverride('u1', 'a@demo.com', 'admin@demo.com');
    expect(getUserOverride('u1')?.deleted_at).toBeTruthy();

    setUserOverride({ userId: 'u1', userEmail: 'a@demo.com', status: 'active', actorEmail: 'admin@demo.com' });
    expect(getUserOverride('u1')?.status).toBe('active');
    expect(getUserOverride('u1')?.deleted_at).toBeNull();
  });

  it('deleteUserOverride sets status: "deleted" (not "suspended") plus a deleted_at timestamp - it does not remove the override', () => {
    deleteUserOverride('u2', 'b@demo.com', 'admin@demo.com');
    const override = getUserOverride('u2');
    expect(override?.status).toBe('deleted');
    expect(override?.deleted_at).toBeTruthy();
  });

  it('applyUserOverride merges the override onto a user object, leaving users with no override untouched', () => {
    setUserOverride({ userId: 'u3', userEmail: 'c@demo.com', status: 'suspended', actorEmail: 'admin@demo.com' });
    const base = { id: 'u3', role: 'team_member', status: 'active', deleted_at: null };
    const applied = applyUserOverride(base);
    expect(applied.status).toBe('suspended');

    const untouched = { id: 'u4', role: 'team_member', status: 'active', deleted_at: null };
    expect(applyUserOverride(untouched)).toEqual(untouched);
  });
});
