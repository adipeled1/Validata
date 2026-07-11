import { describe, it, expect } from 'vitest';
import { formatDateForDisplay, sortMeasurementsDescending } from './service';

describe('formatDateForDisplay', () => {
  it('formats an ISO date as DD/MM/YYYY', () => {
    expect(formatDateForDisplay('2026-07-11')).toBe('11/07/2026');
  });

  it('returns "—" for null/undefined/empty', () => {
    expect(formatDateForDisplay(null)).toBe('—');
  });
});

describe('sortMeasurementsDescending', () => {
  it('sorts by timestamp descending (most recent first)', () => {
    const measurements = [
      { id: '1', timestamp: '10/07/2026 09:00' },
      { id: '2', timestamp: '11/07/2026 09:00' },
      { id: '3', timestamp: '09/07/2026 09:00' },
    ];
    const sorted = sortMeasurementsDescending(measurements);
    expect(sorted.map((m) => m.id)).toEqual(['2', '1', '3']);
  });

  it('breaks ties on identical timestamps by higher numeric id first', () => {
    const measurements = [
      { id: '1', timestamp: '10/07/2026 09:00' },
      { id: '5', timestamp: '10/07/2026 09:00' },
      { id: '3', timestamp: '10/07/2026 09:00' },
    ];
    const sorted = sortMeasurementsDescending(measurements);
    expect(sorted.map((m) => m.id)).toEqual(['5', '3', '1']);
  });

  it('does not mutate the original array', () => {
    const measurements = [{ id: '1', timestamp: '10/07/2026 09:00' }, { id: '2', timestamp: '11/07/2026 09:00' }];
    const original = [...measurements];
    sortMeasurementsDescending(measurements);
    expect(measurements).toEqual(original);
  });

  it('treats an unparseable timestamp as time 0 rather than throwing', () => {
    const measurements = [{ id: '1', timestamp: 'garbage' }, { id: '2', timestamp: '10/07/2026 09:00' }];
    expect(() => sortMeasurementsDescending(measurements)).not.toThrow();
  });
});
