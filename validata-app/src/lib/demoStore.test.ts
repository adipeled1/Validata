import { describe, it, expect } from 'vitest';
import {
  addConsentVersion,
  getConsentVersions,
  addConsentRecord,
  getConsentRecords,
  setUserOverride,
  deleteUserOverride,
  getUserOverride,
  applyUserOverride,
  addAuditEntry,
  getAuditLog,
  getStudyLockOverride,
  setStudyLock,
} from './demoStore';

// Unlike clientDemoStore.ts (sessionStorage, reset via clear() per test),
// demoStore.ts keeps its state on globalThis for the lifetime of the process
// (see AGENTS.md's "one shared object per running process" note) - there's
// no per-call load/save to reset between tests. So every test here uses a
// unique-per-test id/studyId instead of relying on a clean slate, the same
// way this module's real callers already must (a running process never
// resets it either).
let counter = 0;
const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`;

describe('demoStore/clientDemoStore parity: consent versions + records', () => {
  it('addConsentVersion is retrievable via getConsentVersions, scoped by studyId', () => {
    const studyId = uniqueId('study');
    addConsentVersion({ studyId, version: 'v2.0', actorEmail: 'mentor@demo.com' });
    addConsentVersion({ studyId: uniqueId('other-study'), version: 'v9.9', actorEmail: 'mentor@demo.com' });

    const versions = getConsentVersions(studyId);
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe('v2.0');
  });

  it('addConsentRecord is retrievable via getConsentRecords, scoped by studyId', () => {
    const studyId = uniqueId('study');
    const version = addConsentVersion({ studyId, version: 'v2.0', actorEmail: 'mentor@demo.com' });
    const record = addConsentRecord({
      studyId,
      participantId: 'P-9001',
      formVersionId: version.id,
      method: 'written',
      copyDelivered: true,
      actorEmail: 'mentor@demo.com',
    });

    expect(record.id).toMatch(/^CR-/);
    const records = getConsentRecords(studyId);
    expect(records.find((r) => r.id === record.id)).toBeTruthy();
  });
});

describe('demoStore/clientDemoStore parity: user overrides (suspend/delete/reactivate)', () => {
  it('setUserOverride merges rather than replaces an existing override', () => {
    const userId = uniqueId('u');
    setUserOverride({ userId, userEmail: 'a@demo.com', role: 'mentor', actorEmail: 'admin@demo.com' });
    setUserOverride({ userId, userEmail: 'a@demo.com', status: 'suspended', actorEmail: 'admin@demo.com' });

    const override = getUserOverride(userId);
    expect(override?.role).toBe('mentor');
    expect(override?.status).toBe('suspended');
  });

  it('deleteUserOverride sets status: "deleted" (not "suspended") plus deleted_at, without removing the override', () => {
    const userId = uniqueId('u');
    deleteUserOverride(userId, 'b@demo.com', 'admin@demo.com');
    const override = getUserOverride(userId);
    expect(override?.status).toBe('deleted');
    expect(override?.deleted_at).toBeTruthy();
  });

  it('reactivating (status: active) clears deleted_at', () => {
    const userId = uniqueId('u');
    deleteUserOverride(userId, 'c@demo.com', 'admin@demo.com');
    setUserOverride({ userId, userEmail: 'c@demo.com', status: 'active', actorEmail: 'admin@demo.com' });
    const override = getUserOverride(userId);
    expect(override?.status).toBe('active');
    expect(override?.deleted_at).toBeNull();
  });

  it('applyUserOverride merges the override onto a user object', () => {
    const userId = uniqueId('u');
    setUserOverride({ userId, userEmail: 'd@demo.com', status: 'suspended', actorEmail: 'admin@demo.com' });
    const base = { id: userId, role: 'team_member', status: 'active', deleted_at: null };
    expect(applyUserOverride(base).status).toBe('suspended');
  });
});

describe('audit log', () => {
  it('addAuditEntry is retrievable via getAuditLog, filtered by studyId', () => {
    const studyId = uniqueId('study');
    addAuditEntry({ actorEmail: 'a@demo.com', tableName: 'participants', recordId: 'P-1', action: 'INSERT', studyId });
    const log = getAuditLog({ studyId });
    expect(log.some((e) => e.study_id === studyId)).toBe(true);
  });
});

describe('study lock overrides', () => {
  it('setStudyLock is retrievable via getStudyLockOverride, for both locking and unlocking', () => {
    const studyId = uniqueId('study');
    expect(getStudyLockOverride(studyId)).toBeNull();

    setStudyLock({ studyId, studyName: 'Test Study', locked: true, reason: 'audit', actorEmail: 'mentor@demo.com' });
    expect(getStudyLockOverride(studyId)?.lock_state).toBe('locked');

    setStudyLock({ studyId, studyName: 'Test Study', locked: false, reason: 'resolved', actorEmail: 'mentor@demo.com' });
    expect(getStudyLockOverride(studyId)?.lock_state).toBe('open');
  });
});
