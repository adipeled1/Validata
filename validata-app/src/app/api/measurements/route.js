import { verifySession } from '@/lib/auth-server';
import { listMeasurements } from '@/lib/repositories/measurements';
import { analysisRequestSchema, formatValidationError } from '@/lib/schemas';
import mockData from '@/mockData.json';
import analysisData from './analysisData';
import {
  normalizeRecord,
  aggregateByParticipant,
  calculateDescriptiveStats,
  calculateRMSE,
  calculateMAE,
  calculateBlandAltman,
  calculatePassRate,
  binDifferences,
  calculateRMSEPerSession,
  getDifferences,
  getProgressChartData,
  getStatusChartData,
  generateAnalysisText
} from './statistics';

// GET: Fetch measurements for a given study from Supabase
export async function GET(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('study_id');

    const measurements = await listMeasurements(session, studyId);
    return Response.json(measurements);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Calculate analysis (measurement mutations moved to Server Actions -
// see src/app/actions/measurements.js)
export async function POST(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const body = await request.json();
    const parsed = analysisRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }

    const threshold = parseFloat(parsed.data.threshold) || 5;
    const rawMeasurements = parsed.data.measurements;
    const participants = parsed.data.participants;

    const progressData = getProgressChartData(participants, rawMeasurements);
    const statusData = getStatusChartData(participants);
    const aiResult = generateAnalysisText(participants, rawMeasurements);

    let normalizedData = [];
    if (session.isDemo && (!rawMeasurements.length || rawMeasurements === mockData.measurements)) {
       normalizedData = analysisData;
    } else {
       // Measurements flagged invalid are excluded from every statistic/chart.
       normalizedData = rawMeasurements
         .filter((m) => m.isValid !== false)
         .map(normalizeRecord)
         .filter((m) => m.goniometerAngle > 0 && m.aiAngle > 0);
    }

    // Each test involves multiple measurements per participant - average
    // AI/goniometer readings per participant first, then compare error on
    // those per-participant averages (rather than on raw individual rows).
    const statsData = aggregateByParticipant(normalizedData);
    const descriptiveStats = calculateDescriptiveStats(statsData);

    const rmse = calculateRMSE(statsData);
    const mae = calculateMAE(statsData);
    const { meanDiff, upperLimit, lowerLimit } = calculateBlandAltman(statsData);
    const { pass, fail, percentage } = calculatePassRate(statsData, threshold);

    return Response.json({
      progressData,
      statusData,
      aiResult,
      statsData,
      summaryStats: { rmse, mae, meanBias: meanDiff, passRate: percentage },
      descriptiveStats,
      charts: {
        blandAltman: { plotData: getDifferences(statsData), meanDiff, upperLimit, lowerLimit },
        errorHistogram: { bins: binDifferences(statsData) },
        performanceTrend: { sessions: calculateRMSEPerSession(statsData) },
        thresholdDonut: { pass, fail, percentage, threshold }
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
