// fable_system_review §4.3: the server computes analysis from the DB by
// studyId - participants/measurements are no longer sent from the client.
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
