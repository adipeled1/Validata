import { verifySession } from '@/lib/auth-server';
import mockData from '@/mockData.json';
import analysisData from './analysisData';
import {
  normalizeRecord,
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

// GET: Fetch measurements data from Supabase
export async function GET(request) {
  try {
    const session = await verifySession();
    if (session.error) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (session.isDemo) {
      return Response.json(mockData.measurements);
    }

    const { data, error } = await session.supabaseClient
      .from('measurements')
      .select('*')
      .order('timestamp', { ascending: false });

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

      let statsData = [];
      if (session.isDemo && (!rawMeasurements.length || rawMeasurements === mockData.measurements)) {
         statsData = analysisData;
      } else {
         statsData = rawMeasurements
           .map(normalizeRecord)
           .filter((m) => m.goniometerAngle > 0 && m.aiAngle > 0);
      }

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
        charts: {
          blandAltman: { plotData: getDifferences(statsData), meanDiff, upperLimit, lowerLimit },
          errorHistogram: { bins: binDifferences(statsData) },
          performanceTrend: { sessions: calculateRMSEPerSession(statsData) },
          thresholdDonut: { pass, fail, percentage, threshold }
        }
      });
    }

    // Otherwise, this is a standard measurement insertion
    const { participantId, goniometer, aiModel, notes, testDate } = body;

    const parsedGoniometer = parseFloat(goniometer.toString().replace('°', '')) || 0.0;
    const parsedAiModel = parseFloat(aiModel.toString().replace('°', '')) || 0.0;

    if (session.isDemo) {
      return Response.json({
        participant_id: participantId,
        goniometer: parsedGoniometer,
        ai_model: parsedAiModel,
        notes,
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

