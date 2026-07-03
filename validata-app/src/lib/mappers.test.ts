import { describe, it, expect } from 'vitest';
import { mapParticipants, mapMeasurements, withEnrollmentDates } from './mappers';

describe('mapParticipants', () => {
  it('passes demo-mode records through unchanged', () => {
    const demo = [{ id: 'P-1001', consent: true, status: 'Active', enrollmentDate: '2026-01-01' }];
    expect(mapParticipants(demo, true)).toBe(demo);
  });

  it('maps live Supabase rows (snake_case) to the frontend camelCase shape', () => {
    const raw = [{ id: 'P-1001', consent: true, status: 'Active', age: 30, gender: 'Female', health_status: 'Healthy', enrollment_date: '2026-01-01' }];
    expect(mapParticipants(raw, false)).toEqual([
      { id: 'P-1001', consent: true, status: 'Active', age: 30, gender: 'Female', healthStatus: 'Healthy', enrollmentDate: '2026-01-01' },
    ]);
  });
});

describe('mapMeasurements', () => {
  it('assigns descending ids in demo mode (newest gets the highest id)', () => {
    const demo = [
      { participant: 'P-1', goniometer: '10°', aiModel: '11°', notes: '', timestamp: 't1', isValid: true },
      { participant: 'P-2', goniometer: '20°', aiModel: '21°', notes: '', timestamp: 't2', isValid: true },
    ];
    const result = mapMeasurements(demo, true);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
  });

  it('maps live rows: formats the degree values and the timestamp', () => {
    const raw = [{
      id: 5,
      participant_id: 'P-1001',
      goniometer: 45,
      ai_model: 44.87,
      notes: 'ok',
      timestamp: '2026-05-12T14:30:00.000Z',
      test_date: '2026-05-12',
      is_valid: true,
    }];
    const [m] = mapMeasurements(raw, false);
    expect(m.participant).toBe('P-1001');
    expect(m.goniometer).toBe('45.0°');
    expect(m.aiModel).toBe('44.9°');
    expect(m.isValid).toBe(true);
    expect(m.timestamp).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it('treats is_valid: false as invalid, defaults missing is_valid to valid', () => {
    const raw = [
      { id: 1, participant_id: 'P-1', goniometer: 1, ai_model: 1, timestamp: '2026-01-01T00:00:00Z', is_valid: false },
      { id: 2, participant_id: 'P-1', goniometer: 1, ai_model: 1, timestamp: '2026-01-01T00:00:00Z' },
    ];
    const [invalid, defaultValid] = mapMeasurements(raw, false);
    expect(invalid.isValid).toBe(false);
    expect(defaultValid.isValid).toBe(true);
  });
});

describe('withEnrollmentDates', () => {
  it('joins each measurement to its participant enrollment date', () => {
    const measurements = [{ id: 1, participant: 'P-1' }, { id: 2, participant: 'P-2' }];
    const participants = [{ id: 'P-1', enrollmentDate: '2026-01-01' }];
    const result = withEnrollmentDates(measurements, participants);
    expect(result[0].enrollmentDate).toBe('2026-01-01');
    expect(result[1].enrollmentDate).toBeNull();
  });
});
