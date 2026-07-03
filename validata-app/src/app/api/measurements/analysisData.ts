// 50 sample dorsiflexion measurement records for chart development and demo mode.
// 10 participants × 5 sessions; AI noise is deterministic (not random) for reproducibility.

type AnalysisRecord = {
  id: string;
  sessionId: string;
  participantId: string;
  date: string;
  goniometerAngle: number;
  aiAngle: number;
};

const PARTICIPANTS = [
  { id: 'P-1001', base: 22 },
  { id: 'P-1002', base: 35 },
  { id: 'P-1004', base: 18 },
  { id: 'P-1005', base: 28 },
  { id: 'P-1006', base: 15 },
  { id: 'P-1008', base: 30 },
  { id: 'P-1009', base: 42 },
  { id: 'P-1010', base: 12 },
  { id: 'P-1011', base: 25 },
  { id: 'P-1012', base: 38 },
];

const SESSIONS = [
  { id: 'S-01', date: '2026-05-01', variation: 0.5 },
  { id: 'S-02', date: '2026-05-08', variation: -0.3 },
  { id: 'S-03', date: '2026-05-15', variation: 1.1 },
  { id: 'S-04', date: '2026-05-22', variation: -0.8 },
  { id: 'S-05', date: '2026-05-29', variation: 0.2 },
];

// Pre-computed noise offsets (ai - goniometer) in degrees, one per record
const AI_NOISE = [
   0.8, -1.2,  2.1, -0.5,  1.7, -2.3,  0.4, -1.8,  1.1, -0.9,
   2.5, -1.5,  0.7, -2.1,  1.3, -0.3,  1.9, -1.1,  2.8, -0.7,
   1.4, -2.4,  0.6, -1.6,  1.8, -0.2,  2.3, -1.3,  0.9, -1.9,
   1.5, -0.8,  2.0, -1.4,  0.5, -2.2,  1.6, -0.4,  2.7, -1.0,
   1.2, -2.0,  0.3, -1.7,  2.4, -0.6,  1.0, -1.1,  0.8, -2.5,
];

let idx = 0;
const analysisData: AnalysisRecord[] = [];

PARTICIPANTS.forEach((p) => {
  SESSIONS.forEach((s) => {
    const goniometerAngle = parseFloat((p.base + s.variation).toFixed(1));
    const aiAngle = parseFloat((goniometerAngle + AI_NOISE[idx]).toFixed(1));
    analysisData.push({
      id: `M-${String(idx + 1).padStart(3, '0')}`,
      sessionId: s.id,
      participantId: p.id,
      date: s.date,
      goniometerAngle,
      aiAngle,
    });
    idx++;
  });
});

export default analysisData;
