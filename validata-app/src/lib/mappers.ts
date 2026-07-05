// Maps DB/mock participant and measurement rows to the frontend's expected
// camelCase shape. Used both server-side (the initial load in
// (dashboard)/layout.tsx) and client-side (StudyContext.tsx's SWR fetchers) so
// there's exactly one place that knows how to translate either shape,
// instead of the client and server each carrying their own copy.
//
// fable_system_review §4.2: these used to take an `isDemoMode` flag and run
// an entirely separate mapping branch for demo data, because mockData.json
// stored participants/measurements in a different, already-"mapped" shape
// (camelCase, pre-formatted "45.0°" strings) than the raw DB rows this file
// otherwise expects. That meant demo and live data could describe the same
// concept with different keys/formats and silently drift (e.g. a repository
// mutation's demo branch returning `goniometer` as a raw number while this
// file's demo branch expected an already-formatted string) - the exact
// sprawl the review flagged. mockData.json now stores raw DB-shaped rows
// (snake_case, unformatted numbers) just like a live Supabase query would
// return, so a single mapping path handles both.

export function mapParticipants(rawParticipants: any[]): any[] {
  return rawParticipants.map((p) => ({
    id: p.id,
    consent: p.consent,
    status: p.status,
    age: p.age,
    gender: p.gender,
    healthStatus: p.health_status,
    enrollmentDate: p.enrollment_date || null
  }));
}

export function mapMeasurements(rawMeasurements: any[]): any[] {
  return rawMeasurements.map((m) => {
    let formattedDate = m.timestamp;
    try {
      const d = new Date(m.timestamp);
      // Use UTC getters so the displayed value is unambiguous regardless of
      // the server's or client's local timezone — satisfies AUDIT-06.
      const day = d.getUTCDate().toString().padStart(2, '0');
      const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = d.getUTCFullYear();
      const hours = d.getUTCHours().toString().padStart(2, '0');
      const minutes = d.getUTCMinutes().toString().padStart(2, '0');
      formattedDate = `${day}/${month}/${year} ${hours}:${minutes} UTC`;
    } catch { }

    return {
      id: m.id,
      participant: m.participant_id,
      goniometer: `${parseFloat(m.goniometer).toFixed(1)}°`,
      aiModel: `${parseFloat(m.ai_model).toFixed(1)}°`,
      notes: m.notes,
      timestamp: formattedDate,
      timestampUtc: m.timestamp, // ISO 8601 UTC — preserved for audit trail
      testDate: m.test_date || null,
      isValid: m.is_valid !== false,
      createdBy: m.created_by ?? null,
      captureMethod: m.capture_method ?? null,
    };
  });
}

// Joins each measurement's participant's enrollmentDate onto it (by
// participant id) - kept as a separate step since it depends on the
// participants list, not just the raw measurement row.
// fable_system_review §5.6: this used to call participants.find() inside the
// measurements.map(), an O(n*m) scan re-run on every render via useMemo.
// Building the lookup Map once first makes each join O(1).
export function withEnrollmentDates(measurements: any[], participants: any[]): any[] {
  const enrollmentDateById = new Map(participants.map((p) => [p.id, p.enrollmentDate]));
  return measurements.map((m) => ({
    ...m,
    enrollmentDate: enrollmentDateById.get(m.participant) || null,
  }));
}
