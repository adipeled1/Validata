// Service file for Participants component
// Contains business logic separated from the UI and React state

export const countActiveParticipants = (participants) => {
  return participants.filter((p) => p.status === 'Active').length;
};

export const getTodayDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateForDisplay = (value) => {
  if (!value) return '—';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = parsedDate.getFullYear();

  return `${day}/${month}/${year}`;
};

const parseAngleValue = (value) => {
  if (value === null || value === undefined || value === '') return null;

  const normalized = String(value).trim().replace('°', '');
  const parsed = parseFloat(normalized);

  return Number.isNaN(parsed) ? null : parsed;
};

export const hasCompleteMeasurement = (measurement) => {
  const goniometer = parseAngleValue(measurement?.goniometer);
  const aiModel = parseAngleValue(measurement?.aiModel);

  return goniometer !== null && aiModel !== null && goniometer > 0 && aiModel > 0;
};

export const shouldCompleteParticipant = (participant, measurements = []) => {
  if (!participant) return false;

  const normalizedStatus = String(participant.status || '').toLowerCase();
  if (normalizedStatus === 'completed' || normalizedStatus === 'dropped') {
    return false;
  }

  const completedMeasurements = measurements.filter((measurement) => {
    if (measurement?.participant !== participant.id) return false;
    return hasCompleteMeasurement(measurement);
  });

  return completedMeasurements.length >= 1;
};

export const getUpdatedParticipantsForMeasurements = (participants = [], measurements = []) => {
  return participants.map((participant) => {
    if (shouldCompleteParticipant(participant, measurements)) {
      return { ...participant, status: 'Completed' };
    }

    return participant;
  });
};
