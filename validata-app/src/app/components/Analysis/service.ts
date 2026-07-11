// The server computes analysis from the DB by studyId - participants/
// measurements are not sent from the client, so the numbers can't be spoofed.
export const fetchAnalysisData = async (localThreshold: number, studyId: string): Promise<any> => {
  const res = await fetch(`/api/measurements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'analysis',
      threshold: localThreshold,
      studyId
    })
  });

  return res.json();
};
