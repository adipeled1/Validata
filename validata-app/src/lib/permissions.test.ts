import { describe, it, expect } from 'vitest';
import { hasRole, canAccessPage, EDIT_ROLES, ADMIN_ROLES } from './permissions';

describe('hasRole', () => {
  it('returns true when the role is in the allowed set', () => {
    expect(hasRole('mentor', ADMIN_ROLES)).toBe(true);
  });

  it('returns false when the role is not in the allowed set', () => {
    expect(hasRole('team_member', ADMIN_ROLES)).toBe(false);
  });

  it('returns false for null/undefined/empty role', () => {
    expect(hasRole(null, ADMIN_ROLES)).toBe(false);
    expect(hasRole(undefined, ADMIN_ROLES)).toBe(false);
    expect(hasRole('', ADMIN_ROLES)).toBe(false);
  });
});

describe('canAccessPage', () => {
  it('requires both an active status and a sufficient role', () => {
    expect(canAccessPage('mentor', 'active', ADMIN_ROLES)).toBe(true);
  });

  it('rejects a sufficient role with a non-active status (suspended, deleted, or onboarding)', () => {
    expect(canAccessPage('mentor', 'suspended', ADMIN_ROLES)).toBe(false);
    expect(canAccessPage('mentor', 'deleted', ADMIN_ROLES)).toBe(false);
    expect(canAccessPage('mentor', 'wait_approval', ADMIN_ROLES)).toBe(false);
  });

  it('rejects an active status with an insufficient role', () => {
    expect(canAccessPage('team_member', 'active', EDIT_ROLES)).toBe(false);
  });

  it('rejects when both status and role are wrong', () => {
    expect(canAccessPage('team_member', 'suspended', EDIT_ROLES)).toBe(false);
  });
});
