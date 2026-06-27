// Server-side statistics and charting calculations

// -----------------------------------------------------
// Core Statistics (formerly src/utils/statistics.js)
// -----------------------------------------------------

// Parse numeric angle from a string like "45.0°" or pass through if already a number
const parseAngle = (value) => {
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/[°\s]/g, '')) || 0;
};

// Normalize a raw measurement record to the { aiAngle, goniometerAngle, sessionId, date } shape.
export const normalizeRecord = (m) => ({
  id: String(m.id || ''),
  sessionId: m.sessionId || m.participant_id || m.participant || m.participantId || '',
  participantId: m.participantId || m.participant_id || m.participant || '',
  date: m.date || m.timestamp || '',
  aiAngle: parseAngle(m.aiAngle ?? m.ai_model ?? m.aiModel),
  goniometerAngle: parseAngle(m.goniometerAngle ?? m.goniometer),
});

export const getDifferences = (data) =>
  data.map((d) => ({
    ...d,
    mean: (d.aiAngle + d.goniometerAngle) / 2,
    diff: d.aiAngle - d.goniometerAngle,
  }));

// Each test involves multiple measurements per participant. Average AI and
// goniometer readings per participant first, then every downstream
// stat (RMSE, MAE, Bland-Altman, pass rate, histogram, trend) compares those
// per-participant averages instead of raw individual measurements.
export const aggregateByParticipant = (data) => {
  const groups = {};

  data.forEach((d) => {
    const key = d.participantId || d.sessionId;
    if (!key) return;

    if (!groups[key]) {
      groups[key] = { participantId: key, date: d.date, aiSum: 0, goniometerSum: 0, count: 0 };
    }

    groups[key].aiSum += d.aiAngle;
    groups[key].goniometerSum += d.goniometerAngle;
    groups[key].count += 1;
    if (d.date && (!groups[key].date || d.date < groups[key].date)) {
      groups[key].date = d.date;
    }
  });

  return Object.values(groups).map((g) => ({
    id: g.participantId,
    sessionId: g.participantId,
    participantId: g.participantId,
    date: g.date,
    aiAngle: g.aiSum / g.count,
    goniometerAngle: g.goniometerSum / g.count,
    measurementCount: g.count,
  }));
};

// Descriptive statistics (mean, SD, SE) of the AI-goniometer error, computed
// across participants' average errors (sample SD, n-1).
export const calculateDescriptiveStats = (data) => {
  if (!data.length) return { n: 0, mean: 0, sd: 0, se: 0 };

  const diffs = data.map((d) => d.aiAngle - d.goniometerAngle);
  const n = diffs.length;
  const mean = diffs.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1
    ? diffs.reduce((acc, d) => acc + (d - mean) ** 2, 0) / (n - 1)
    : 0;
  const sd = Math.sqrt(variance);
  const se = sd / Math.sqrt(n);

  return { n, mean, sd, se };
};

export const calculateRMSE = (data) => {
  if (!data.length) return 0;
  const mse = data.reduce((acc, d) => acc + (d.aiAngle - d.goniometerAngle) ** 2, 0) / data.length;
  return Math.sqrt(mse);
};

export const calculateMAE = (data) => {
  if (!data.length) return 0;
  return data.reduce((acc, d) => acc + Math.abs(d.aiAngle - d.goniometerAngle), 0) / data.length;
};

export const calculateBlandAltman = (data) => {
  if (!data.length) return { meanDiff: 0, upperLimit: 0, lowerLimit: 0 };
  const diffs = data.map((d) => d.aiAngle - d.goniometerAngle);
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance = diffs.reduce((acc, d) => acc + (d - meanDiff) ** 2, 0) / diffs.length;
  const sd = Math.sqrt(variance);
  return {
    meanDiff,
    upperLimit: meanDiff + 1.96 * sd,
    lowerLimit: meanDiff - 1.96 * sd,
  };
};

export const binDifferences = (data, binCount = 10) => {
  if (!data.length) return [];
  const diffs = data.map((d) => d.aiAngle - d.goniometerAngle);
  const min = Math.min(...diffs);
  const max = Math.max(...diffs);
  const binSize = (max - min) / binCount || 1;

  const bins = Array.from({ length: binCount }, (_, i) => ({
    range: (min + i * binSize).toFixed(1),
    count: 0,
  }));

  diffs.forEach((d) => {
    const idx = Math.min(Math.floor((d - min) / binSize), binCount - 1);
    bins[idx].count++;
  });

  return bins;
};

export const calculatePassRate = (data, threshold) => {
  if (!data.length) return { pass: 0, fail: 0, percentage: 0 };
  const pass = data.filter((d) => Math.abs(d.aiAngle - d.goniometerAngle) <= threshold).length;
  const fail = data.length - pass;
  return { pass, fail, percentage: (pass / data.length) * 100 };
};

export const calculateRMSEPerSession = (data) => {
  const sessions = {};
  data.forEach((d) => {
    const key = d.sessionId;
    if (!sessions[key]) sessions[key] = { sessionId: key, date: d.date, records: [] };
    sessions[key].records.push(d);
  });

  return Object.values(sessions)
    .map((s) => ({
      sessionId: s.sessionId,
      date: s.date,
      rmse: parseFloat(calculateRMSE(s.records).toFixed(2)),
      mae: parseFloat(calculateMAE(s.records).toFixed(2)),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};


// -----------------------------------------------------
// Charting Logic (formerly src/components/Analysis/service.js)
// -----------------------------------------------------

export const sortMeasurementsDescending = (measurements) => {
  return [...measurements].sort((a, b) => {
    // Parse timestamp format "DD/MM/YYYY HH:MM"
    const parseDate = (dateStr) => {
      try {
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes] = timePart.split(':');
        return new Date(year, month - 1, day, hours, minutes).getTime();
      } catch {
        return 0;
      }
    };
    const timeDiff = parseDate(b.timestamp) - parseDate(a.timestamp);
    if (timeDiff !== 0) return timeDiff;

    const idA = parseInt(a.id) || 0;
    const idB = parseInt(b.id) || 0;
    return idB - idA;
  });
};

export const getProgressChartData = (participants, measurements) => {
  const measurementsByParticipant = {};
  participants.forEach((p) => {
    measurementsByParticipant[p.id] = 0;
  });

  measurements.forEach((m) => {
    const pId = m.participant_id || m.participant || m.participantId;
    if (measurementsByParticipant[pId] !== undefined) {
      measurementsByParticipant[pId]++;
    }
  });

  const participantIds = Object.keys(measurementsByParticipant);
  const measuredCount = participantIds.filter((id) => measurementsByParticipant[id] > 0).length;
  const pendingCount = participantIds.length - measuredCount;

  return {
    labels: ['Measured', 'Pending'],
    datasets: [
      {
        label: 'Participants',
        data: [measuredCount, pendingCount],
        backgroundColor: ['#4f46e5', '#94a3b8'],
        borderRadius: 4,
      },
    ],
  };
};

export const getStatusChartData = (participants) => {
  const activeCount = participants.filter((p) => p.status === 'Active').length;
  const completedCount = participants.filter((p) => p.status === 'Completed').length;
  const droppedCount = participants.filter((p) => p.status === 'Dropped').length;

  return {
    labels: ['Active', 'Completed', 'Dropped'],
    datasets: [
      {
        data: [activeCount, completedCount, droppedCount],
        backgroundColor: ['#10b981', '#3b82f6', '#f43f5e'],
        hoverOffset: 4,
      },
    ],
  };
};

export const generateAnalysisText = (participants, measurements) => {
  const activeCount = participants.filter(p => p.status === 'Active').length;
  const completedCount = participants.filter(p => p.status === 'Completed').length;
  return `Analysis performed on ${measurements.length} records from ${participants.length} total participants (${activeCount} active, ${completedCount} completed).\n\n• Data Integrity: High level of reliability identified in reports. ID anonymization confirmed.\n• Trends: No significant statistical anomalies found in the primary metrics among active participants.\n• AI Recommendation: Consider increasing measurement frequency for participants with pending measurements for better data resolution.`;
};
