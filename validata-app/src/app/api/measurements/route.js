import { verifySession } from '@/lib/auth-server';
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

    if (session.isDemo) {
      const measurements = studyId
        ? mockData.measurements.filter((m) => m.study_id === studyId)
        : mockData.measurements;
      return Response.json(measurements);
    }

    let query = session.supabaseClient
      .from('measurements')
      .select('*')
      .order('timestamp', { ascending: false });

    if (studyId) query = query.eq('study_id', studyId);

    const { data, error } = await query;

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add a new measurement log OR calculate analysis
export async function POST(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const body = await request.json();

    // If this is an analysis calculation request
    if (body.type === 'analysis') {
      const threshold = parseFloat(body.threshold) || 5;
      const rawMeasurements = body.measurements || [];
      const participants = body.participants || [];

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
    }

    // Otherwise, this is a standard measurement insertion
    const { participantId, goniometer, aiModel, notes, testDate, studyId } = body;

    if (!studyId) {
      return Response.json({ error: 'A study must be selected before logging a measurement.' }, { status: 400 });
    }

    const parsedGoniometer = parseFloat(goniometer.toString().replace('°', '')) || 0.0;
    const parsedAiModel = parseFloat(aiModel.toString().replace('°', '')) || 0.0;

    if (session.isDemo) {
      return Response.json({
        participant_id: participantId,
        goniometer: parsedGoniometer,
        ai_model: parsedAiModel,
        notes,
        study_id: studyId,
        is_valid: true,
        timestamp: new Date().toISOString(),
        test_date: testDate || new Date().toISOString().split('T')[0]
      });
    }

    const { data, error } = await session.supabaseClient
      .from('measurements')
      .insert({
        participant_id: participantId,
        goniometer: parsedGoniometer,
        ai_model: parsedAiModel,
        notes,
        study_id: studyId,
        timestamp: new Date().toISOString(),
        test_date: testDate || new Date().toISOString().split('T')[0]
      })
      .select();

    if (error) throw error;
    return Response.json(data[0]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Toggle a measurement's valid/invalid flag. The goniometer/ai_model
// values themselves are never edited once written - only this flag changes.
export async function PATCH(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const body = await request.json();
    const { id, isValid } = body;

    if (session.isDemo) {
      return Response.json({ id, is_valid: isValid });
    }

    const { data, error } = await session.supabaseClient
      .from('measurements')
      .update({ is_valid: isValid })
      .eq('id', id)
      .select();

    if (error) throw error;
    return Response.json(data[0]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
