import { describe, it, expect } from 'vitest';
import {
  normalizeRecord,
  aggregateByParticipant,
  calculateDescriptiveStats,
  calculateRMSE,
  calculateMAE,
  calculateBlandAltman,
  calculatePassRate,
  binDifferences,
  getProgressChartData,
  getStatusChartData,
} from './statistics';

describe('normalizeRecord', () => {
  it('parses degree-suffixed string angles into numbers', () => {
    const result = normalizeRecord({ id: '1', participant: 'P-1001', aiModel: '44.9°', goniometer: '45.0°' });
    expect(result.aiAngle).toBeCloseTo(44.9);
    expect(result.goniometerAngle).toBeCloseTo(45.0);
    expect(result.participantId).toBe('P-1001');
  });

  it('passes through numeric angles unchanged', () => {
    const result = normalizeRecord({ ai_model: 10, goniometer: 12 });
    expect(result.aiAngle).toBe(10);
    expect(result.goniometerAngle).toBe(12);
  });
});

describe('aggregateByParticipant', () => {
  it('averages multiple sessions for the same participant', () => {
    const data = [
      { id: '1', sessionId: 'P-1', participantId: 'P-1', date: '2026-05-02', aiAngle: 10, goniometerAngle: 12 },
      { id: '2', sessionId: 'P-1', participantId: 'P-1', date: '2026-05-01', aiAngle: 20, goniometerAngle: 20 },
      { id: '3', sessionId: 'P-2', participantId: 'P-2', date: '2026-05-01', aiAngle: 5, goniometerAngle: 5 },
    ];
    const result = aggregateByParticipant(data);
    const p1 = result.find((r) => r.participantId === 'P-1')!;
    expect(p1.aiAngle).toBeCloseTo(15);
    expect(p1.goniometerAngle).toBeCloseTo(16);
    expect(p1.measurementCount).toBe(2);
    expect(p1.date).toBe('2026-05-01');
    expect(result).toHaveLength(2);
  });

  it('returns an empty array for empty input', () => {
    expect(aggregateByParticipant([])).toEqual([]);
  });
});

describe('calculateRMSE / calculateMAE', () => {
  it('returns 0 for perfectly matching measurements', () => {
    const data = [{ aiAngle: 10, goniometerAngle: 10 }, { aiAngle: 20, goniometerAngle: 20 }];
    expect(calculateRMSE(data)).toBe(0);
    expect(calculateMAE(data)).toBe(0);
  });

  it('computes RMSE and MAE for known differences', () => {
    const data = [{ aiAngle: 12, goniometerAngle: 10 }, { aiAngle: 8, goniometerAngle: 10 }];
    // errors: +2, -2 -> RMSE = sqrt((4+4)/2) = 2, MAE = (2+2)/2 = 2
    expect(calculateRMSE(data)).toBeCloseTo(2);
    expect(calculateMAE(data)).toBeCloseTo(2);
  });

  it('returns 0 for empty input rather than NaN', () => {
    expect(calculateRMSE([])).toBe(0);
    expect(calculateMAE([])).toBe(0);
  });
});

describe('calculateDescriptiveStats', () => {
  it('returns zeroed stats for empty input', () => {
    expect(calculateDescriptiveStats([])).toEqual({ n: 0, mean: 0, sd: 0, se: 0 });
  });

  it('computes mean/sd/se across participant errors', () => {
    const data = [
      { aiAngle: 12, goniometerAngle: 10 },
      { aiAngle: 8, goniometerAngle: 10 },
    ];
    const stats = calculateDescriptiveStats(data);
    expect(stats.n).toBe(2);
    expect(stats.mean).toBeCloseTo(0);
    expect(stats.sd).toBeGreaterThan(0);
  });
});

describe('calculateBlandAltman', () => {
  it('computes mean bias and 1.96 SD limits', () => {
    const data = [{ aiAngle: 12, goniometerAngle: 10 }, { aiAngle: 10, goniometerAngle: 10 }];
    const { meanDiff, upperLimit, lowerLimit } = calculateBlandAltman(data);
    expect(meanDiff).toBeCloseTo(1);
    expect(upperLimit).toBeGreaterThan(meanDiff);
    expect(lowerLimit).toBeLessThan(meanDiff);
  });
});

describe('calculatePassRate', () => {
  it('classifies measurements within/outside the threshold', () => {
    const data = [
      { aiAngle: 10.5, goniometerAngle: 10 },
      { aiAngle: 15, goniometerAngle: 10 },
    ];
    const { pass, fail, percentage } = calculatePassRate(data, 1);
    expect(pass).toBe(1);
    expect(fail).toBe(1);
    expect(percentage).toBe(50);
  });
});

describe('binDifferences', () => {
  it('bins differences into the requested number of buckets', () => {
    const data = [{ aiAngle: 10, goniometerAngle: 10 }, { aiAngle: 12, goniometerAngle: 10 }];
    const bins = binDifferences(data, 5);
    expect(bins).toHaveLength(5);
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(2);
  });

  it('returns an empty array for empty input', () => {
    expect(binDifferences([])).toEqual([]);
  });
});

describe('getProgressChartData', () => {
  it('splits participants into measured vs pending', () => {
    const participants = [{ id: 'P-1' }, { id: 'P-2' }, { id: 'P-3' }];
    const measurements = [{ participant_id: 'P-1' }, { participant: 'P-2' }];
    const result = getProgressChartData(participants, measurements);
    expect(result).toEqual([
      { name: 'Measured', value: 2, fill: '#4f46e5' },
      { name: 'Pending', value: 1, fill: '#94a3b8' },
    ]);
  });
});

describe('getStatusChartData', () => {
  it('counts participants by status', () => {
    const participants = [
      { status: 'Active' }, { status: 'Active' }, { status: 'Completed' }, { status: 'Dropped' },
    ];
    const result = getStatusChartData(participants);
    expect(result).toEqual([
      { name: 'Active', value: 2, fill: '#10b981' },
      { name: 'Completed', value: 1, fill: '#3b82f6' },
      { name: 'Dropped', value: 1, fill: '#f43f5e' },
    ]);
  });
});
