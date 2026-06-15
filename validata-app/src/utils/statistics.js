// Parse numeric angle from a string like "45.0°" or pass through if already a number
const parseAngle = (value) => {
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/[°\s]/g, '')) || 0;
};

// Normalize a raw measurement record to the { aiAngle, goniometerAngle, sessionId, date } shape.
// Handles: the DB snake_case response (participant_id, ai_model), the frontend camelCase shape
// (participant, aiModel), string angles ("45.0°"), and the numeric analysisData format.
export const normalizeRecord = (m) => ({
  id: String(m.id || ''),
  sessionId: m.sessionId || m.participant_id || m.participant || m.participantId || '',
  participantId: m.participantId || m.participant_id || m.participant || '',
  date: m.date || m.timestamp || '',
  aiAngle: parseAngle(m.aiAngle ?? m.ai_model ?? m.aiModel),
  goniometerAngle: parseAngle(m.goniometerAngle ?? m.goniometer),
});

// Adds { mean: (ai+gonio)/2, diff: ai-gonio } to each record — required for Bland-Altman
export const getDifferences = (data) =>
  data.map((d) => ({
    ...d,
    mean: (d.aiAngle + d.goniometerAngle) / 2,
    diff: d.aiAngle - d.goniometerAngle,
  }));

export const calculateRMSE = (data) => {
  if (!data.length) return 0;
  const mse = data.reduce((acc, d) => acc + (d.aiAngle - d.goniometerAngle) ** 2, 0) / data.length;
  return Math.sqrt(mse);
};

export const calculateMAE = (data) => {
  if (!data.length) return 0;
  return data.reduce((acc, d) => acc + Math.abs(d.aiAngle - d.goniometerAngle), 0) / data.length;
};

// Returns { meanDiff, upperLimit, lowerLimit } — 95% limits of agreement (mean diff ± 1.96 SD)
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

// Returns histogram bins [{ range, count }] over error distribution (ai - gonio)
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

// Returns { pass, fail, percentage } — pass if |ai - gonio| <= threshold degrees
export const calculatePassRate = (data, threshold) => {
  if (!data.length) return { pass: 0, fail: 0, percentage: 0 };
  const pass = data.filter((d) => Math.abs(d.aiAngle - d.goniometerAngle) <= threshold).length;
  const fail = data.length - pass;
  return { pass, fail, percentage: (pass / data.length) * 100 };
};

// Returns [{ sessionId, date, rmse, mae }] grouped by sessionId and sorted by date
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
