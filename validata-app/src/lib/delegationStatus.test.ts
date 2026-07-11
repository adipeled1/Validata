import { describe, it, expect } from 'vitest';
import { getDelegationStatus, isDelegationOpen } from './delegationStatus';

const base = { revoked_at: null, completed_at: null, effective_to: null };

describe('getDelegationStatus', () => {
  it('revoked takes priority over everything else', () => {
    expect(getDelegationStatus({ ...base, revoked_at: '2026-01-01', completed_at: '2026-01-02' })).toBe('revoked');
  });

  it('completed takes priority over expiry', () => {
    expect(getDelegationStatus({ ...base, completed_at: '2026-01-01', effective_to: '2020-01-01' })).toBe('completed');
  });

  it('a past effective_to with no revoke/complete is expired', () => {
    expect(getDelegationStatus({ ...base, effective_to: '2000-01-01' })).toBe('expired');
  });

  it('a future effective_to with no revoke/complete is active', () => {
    expect(getDelegationStatus({ ...base, effective_to: '2999-01-01' })).toBe('active');
  });

  it('no dates at all is active', () => {
    expect(getDelegationStatus(base)).toBe('active');
  });
});

describe('isDelegationOpen', () => {
  it('is true only when status is active', () => {
    expect(isDelegationOpen(base)).toBe(true);
    expect(isDelegationOpen({ ...base, completed_at: '2026-01-01' })).toBe(false);
    expect(isDelegationOpen({ ...base, revoked_at: '2026-01-01' })).toBe(false);
    expect(isDelegationOpen({ ...base, effective_to: '2000-01-01' })).toBe(false);
  });
});
