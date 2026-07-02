// Maps DB/mock participant and measurement rows to the frontend's expected
// camelCase shape. Used both server-side (the initial load in
// (dashboard)/layout.js) and client-side (StudyContext.js's SWR fetchers) so
// there's exactly one place that knows how to translate either shape,
// instead of the client and server each carrying their own copy.

export function mapParticipants(rawParticipants, isDemoMode) {
  if (isDemoMode) return rawParticipants;

  return rawParticipants.map((p) => ({
    id: p.id,
    consent: p.consent,
    status: p.status,
    age: p.age,
    gender: p.gender,
    healthStatus: p.health_status,
    enrollmentDate: p.enrollment_date || p.enrollmentDate || null
  }));
}

export function mapMeasurements(rawMeasurements, isDemoMode) {
  if (isDemoMode) {
    return rawMeasurements.map((m, idx) => ({
      id: rawMeasurements.length - idx,
      participant: m.participant,
      goniometer: m.goniometer,
      aiModel: m.aiModel,
      notes: m.notes,
      timestamp: m.timestamp,
      testDate: m.testDate || m.test_date || null,
      isValid: m.isValid !== false
    }));
  }

  return rawMeasurements.map((m) => {
    let formattedDate = m.timestamp;
    try {
      const d = new Date(m.timestamp);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch { }

    return {
      id: m.id,
      participant: m.participant_id,
      goniometer: `${parseFloat(m.goniometer).toFixed(1)}°`,
      aiModel: `${parseFloat(m.ai_model).toFixed(1)}°`,
      notes: m.notes,
      timestamp: formattedDate,
      testDate: m.test_date || m.testDate || null,
      isValid: m.is_valid !== false
    };
  });
}

// Joins each measurement's participant's enrollmentDate onto it (by
// participant id) - kept as a separate step since it depends on the
// participants list, not just the raw measurement row.
export function withEnrollmentDates(measurements, participants) {
  return measurements.map((m) => {
    const participantRecord = participants.find((p) => p.id === m.participant);
    return { ...m, enrollmentDate: participantRecord?.enrollmentDate || null };
  });
}
