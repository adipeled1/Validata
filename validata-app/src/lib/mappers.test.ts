import { describe, it, expect } from 'vitest';
import { mapParticipants, mapMeasurements, withEnrollmentDates } from './mappers';

// fable_system_review §4.2: mapParticipants/mapMeasurements no longer take an
// isDemoMode flag or run a separate demo-mode branch - mockData.json now
// stores raw DB-shaped rows (snake_case, unformatted numbers), so the same
// single mapping path handles both demo and live data. These tests exercise
// that one path with both a demo-shaped row and a live-shaped row to confirm
// they produce the same output shape.

describe('mapParticipants', () => {
  it('maps raw DB-shaped rows (snake_case) to the frontend camelCase shape', () => {
    const raw = [{ id: 'P-1001', consent: true, status: 'Active', age: 30, gender: 'Female', health_status: 'Healthy', enrollment_date: '2026-01-01' }];
    expect(mapParticipants(raw)).toEqual([
      { id: 'P-1001', consent: true, status: 'Active', age: 30, gender: 'Female', healthStatus: 'Healthy', enrollmentDate: '2026-01-01' },
    ]);
  });

  it('defaults a missing enrollment_date to null', () => {
    const raw = [{ id: 'P-1001', consent: true, status: 'Active', age: 30, gender: 'Female', health_status: 'Healthy' }];
    expect(mapParticipants(raw)[0].enrollmentDate).toBeNull();
  });
});

describe('mapMeasurements', () => {
  it('maps raw rows: formats the degree values and the timestamp', () => {
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
    const [m] = mapMeasurements(raw);
    expect(m.participant).toBe('P-1001');
    expect(m.goniometer).toBe('45.0°');
    expect(m.aiModel).toBe('44.9°');
    expect(m.isValid).toBe(true);
    expect(m.timestamp).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} UTC$/);
  });

  it('treats is_valid: false as invalid, defaults missing is_valid to valid', () => {
    const raw = [
      { id: 1, participant_id: 'P-1', goniometer: 1, ai_model: 1, timestamp: '2026-01-01T00:00:00Z', is_valid: false },
      { id: 2, participant_id: 'P-1', goniometer: 1, ai_model: 1, timestamp: '2026-01-01T00:00:00Z' },
    ];
    const [invalid, defaultValid] = mapMeasurements(raw);
    expect(invalid.isValid).toBe(false);
    expect(defaultValid.isValid).toBe(true);
  });

  it('maps mockData.json-shaped demo rows the same way as a live row', () => {
    const demoShaped = [{
      id: 1,
      participant_id: 'P-1001',
      goniometer: 45.0,
      ai_model: 44.9,
      notes: 'Session completed successfully',
      timestamp: '2026-05-12T14:30:00.000Z',
      test_date: '2026-05-12',
      is_valid: true,
    }];
    const [m] = mapMeasurements(demoShaped);
    expect(m.participant).toBe('P-1001');
    expect(m.goniometer).toBe('45.0°');
    expect(m.aiModel).toBe('44.9°');
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
