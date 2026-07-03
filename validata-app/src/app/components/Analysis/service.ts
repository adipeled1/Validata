export const fetchAnalysisData = async (localThreshold: number, participants: any[], measurements: any[]): Promise<any> => {
  const res = await fetch(`/api/measurements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'analysis',
      threshold: localThreshold,
      participants,
      measurements
    })
  });

  return res.json();
};
