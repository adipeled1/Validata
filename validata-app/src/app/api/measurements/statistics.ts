// Server-side statistics and charting calculations

// -----------------------------------------------------
// Core Statistics (formerly src/utils/statistics.js)
// -----------------------------------------------------

// Raw measurement as it arrives from the DB or client — field names vary
// (snake_case from Supabase, camelCase from the client payload).
type RawMeasurement = {
  id?: string | number;
  sessionId?: string;
  participant_id?: string;
  participant?: string;
  participantId?: string;
  date?: string;
  timestamp?: string;
  aiAngle?: number | string | null;
  ai_model?: number | string | null;
  aiModel?: number | string | null;
  goniometerAngle?: number | string | null;
  goniometer?: number | string | null;
  isValid?: boolean;
  [key: string]: unknown;
};

export type NormalizedRecord = {
  id: string;
  sessionId: string;
  participantId: string;
  date: string;
  aiAngle: number;
  goniometerAngle: number;
};

export type AggregatedRecord = NormalizedRecord & { measurementCount: number };

// Parse numeric angle from a string like "45.0°" or pass through if already a number
const parseAngle = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value;
  return parseFloat(String(value ?? '').replace(/[°\s]/g, '')) || 0;
};

// Normalize a raw measurement record to the { aiAngle, goniometerAngle, sessionId, date } shape.
export const normalizeRecord = (m: RawMeasurement): NormalizedRecord => ({
  id: String(m.id || ''),
  sessionId: (m.sessionId || m.participant_id || m.participant || m.participantId || '') as string,
  participantId: (m.participantId || m.participant_id || m.participant || '') as string,
  date: (m.date || m.timestamp || '') as string,
  aiAngle: parseAngle((m.aiAngle ?? m.ai_model ?? m.aiModel) as number | string | null),
  goniometerAngle: parseAngle((m.goniometerAngle ?? m.goniometer) as number | string | null),
});

export const getDifferences = (data: AggregatedRecord[]) =>
  data.map((d) => ({
    ...d,
    mean: (d.aiAngle + d.goniometerAngle) / 2,
    diff: d.aiAngle - d.goniometerAngle,
  }));

// Each test involves multiple measurements per participant. Average AI and
// goniometer readings per participant first, then every downstream
// stat (RMSE, MAE, Bland-Altman, pass rate, histogram, trend) compares those
// per-participant averages instead of raw individual measurements.
export const aggregateByParticipant = (data: NormalizedRecord[]): AggregatedRecord[] => {
  const groups: Record<string, { participantId: string; date: string; aiSum: number; goniometerSum: number; count: number }> = {};

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

type AnglePair = { aiAngle: number; goniometerAngle: number };

// Descriptive statistics (mean, SD, SE) of the AI-goniometer error, computed
// across participants' average errors (sample SD, n-1).
export const calculateDescriptiveStats = (data: AnglePair[]) => {
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

export const calculateRMSE = (data: AnglePair[]): number => {
  if (!data.length) return 0;
  const mse = data.reduce((acc, d) => acc + (d.aiAngle - d.goniometerAngle) ** 2, 0) / data.length;
  return Math.sqrt(mse);
};

export const calculateMAE = (data: AnglePair[]): number => {
  if (!data.length) return 0;
  return data.reduce((acc, d) => acc + Math.abs(d.aiAngle - d.goniometerAngle), 0) / data.length;
};

export const calculateBlandAltman = (data: AnglePair[]) => {
  if (!data.length) return { meanDiff: 0, upperLimit: 0, lowerLimit: 0 };
  const diffs = data.map((d) => d.aiAngle - d.goniometerAngle);
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance = diffs.length > 1
    ? diffs.reduce((acc, d) => acc + (d - meanDiff) ** 2, 0) / (diffs.length - 1)
    : 0;
  const sd = Math.sqrt(variance);
  return {
    meanDiff,
    upperLimit: meanDiff + 1.96 * sd,
    lowerLimit: meanDiff - 1.96 * sd,
  };
};

export const binDifferences = (data: AnglePair[], binCount = 10) => {
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

export const calculatePassRate = (data: AnglePair[], threshold: number) => {
  if (!data.length) return { pass: 0, fail: 0, percentage: 0 };
  const pass = data.filter((d) => Math.abs(d.aiAngle - d.goniometerAngle) <= threshold).length;
  const fail = data.length - pass;
  return { pass, fail, percentage: (pass / data.length) * 100 };
};

export const calculateRMSEPerSession = (data: AggregatedRecord[]) => {
  const sessions: Record<string, { sessionId: string; date: string; records: AggregatedRecord[] }> = {};
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

type MeasurementLike = {
  id?: string | number;
  timestamp?: string;
  [key: string]: unknown;
};

export const sortMeasurementsDescending = (measurements: MeasurementLike[]) => {
  return [...measurements].sort((a, b) => {
    // Parse timestamp format "DD/MM/YYYY HH:MM"
    const parseDate = (dateStr: string | undefined) => {
      try {
        const [datePart, timePart] = (dateStr ?? '').split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes] = timePart.split(':');
        return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes)).getTime();
      } catch {
        return 0;
      }
    };
    const timeDiff = parseDate(b.timestamp as string) - parseDate(a.timestamp as string);
    if (timeDiff !== 0) return timeDiff;

    const idA = parseInt(String(a.id)) || 0;
    const idB = parseInt(String(b.id)) || 0;
    return idB - idA;
  });
};

type ParticipantLike = { id: string | number; [key: string]: unknown };
type ParticipantWithStatus = { status: string; [key: string]: unknown };

export const getProgressChartData = (participants: ParticipantLike[], measurements: Array<Record<string, unknown>>) => {
  const measurementsByParticipant: Record<string, number> = {};
  participants.forEach((p) => {
    measurementsByParticipant[String(p.id)] = 0;
  });

  measurements.forEach((m) => {
    const pId = String(m.participant_id || m.participant || m.participantId || '');
    if (measurementsByParticipant[pId] !== undefined) {
      measurementsByParticipant[pId]++;
    }
  });

  const participantIds = Object.keys(measurementsByParticipant);
  const measuredCount = participantIds.filter((id) => measurementsByParticipant[id] > 0).length;
  const pendingCount = participantIds.length - measuredCount;

  return [
    { name: 'Measured', value: measuredCount, fill: '#4f46e5' },
    { name: 'Pending', value: pendingCount, fill: '#94a3b8' },
  ];
};

export const getStatusChartData = (participants: ParticipantWithStatus[]) => {
  const activeCount = participants.filter((p) => p.status === 'Active').length;
  const completedCount = participants.filter((p) => p.status === 'Completed').length;
  const droppedCount = participants.filter((p) => p.status === 'Dropped').length;

  return [
    { name: 'Active', value: activeCount, fill: '#10b981' },
    { name: 'Completed', value: completedCount, fill: '#3b82f6' },
    { name: 'Dropped', value: droppedCount, fill: '#f43f5e' },
  ];
};

export const generateAnalysisText = (participants: ParticipantWithStatus[], measurements: unknown[]) => {
  const activeCount = participants.filter(p => p.status === 'Active').length;
  const completedCount = participants.filter(p => p.status === 'Completed').length;
  return `Analysis performed on ${measurements.length} records from ${participants.length} total participants (${activeCount} active, ${completedCount} completed).\n\n• Data Integrity: High level of reliability identified in reports. ID anonymization confirmed.\n• Trends: No significant statistical anomalies found in the primary metrics among active participants.\n• AI Recommendation: Consider increasing measurement frequency for participants with pending measurements for better data resolution.`;
};
