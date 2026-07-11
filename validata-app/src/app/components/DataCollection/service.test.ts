import { describe, it, expect } from 'vitest';
import { getActiveParticipants, getTodayDateString } from './service';

describe('getActiveParticipants', () => {
  it('filters to status === "Active" only', () => {
    const result = getActiveParticipants([{ id: 1, status: 'Active' }, { id: 2, status: 'Completed' }]);
    expect(result).toEqual([{ id: 1, status: 'Active' }]);
  });
});

describe('getTodayDateString', () => {
  it('formats a given date as YYYY-MM-DD, zero-padded', () => {
    expect(getTodayDateString(new Date(2026, 11, 3))).toBe('2026-12-03');
  });
});
