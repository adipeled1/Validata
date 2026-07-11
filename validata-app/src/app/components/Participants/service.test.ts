import { describe, it, expect } from 'vitest';
import { countActiveParticipants, countRecruitedParticipants, getTodayDateString, formatDateForDisplay } from './service';

describe('countActiveParticipants', () => {
  it('counts only status === "Active"', () => {
    expect(countActiveParticipants([{ status: 'Active' }, { status: 'Completed' }, { status: 'Dropped' }])).toBe(1);
  });
});

describe('countRecruitedParticipants', () => {
  it('counts Active and Completed, excludes Dropped', () => {
    expect(countRecruitedParticipants([
      { status: 'Active' }, { status: 'Active' }, { status: 'Completed' }, { status: 'Dropped' },
    ])).toBe(3);
  });
});

describe('getTodayDateString', () => {
  it('formats a given date as YYYY-MM-DD, zero-padded', () => {
    expect(getTodayDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatDateForDisplay', () => {
  it('formats an ISO date as DD/MM/YYYY', () => {
    expect(formatDateForDisplay('2026-07-11')).toBe('11/07/2026');
  });

  it('returns "—" for null/undefined/empty', () => {
    expect(formatDateForDisplay(null)).toBe('—');
    expect(formatDateForDisplay(undefined)).toBe('—');
    expect(formatDateForDisplay('')).toBe('—');
  });

  it('returns the raw value unchanged when it is not a parseable date', () => {
    expect(formatDateForDisplay('not-a-date')).toBe('not-a-date');
  });
});
