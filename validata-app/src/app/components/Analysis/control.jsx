import { useState, useEffect } from 'react';
import AnalysisDisplay from './display';
import AIChatControl from '../AIChat/control';
import { fetchAnalysisData } from './service';

// Controller component manages local state and fetches processed data from the API
const AnalysisControl = ({ participants, measurements, isDemoMode, threshold = 5 }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  
  // Stores the entire processed analysis payload from the server
  const [analysisData, setAnalysisData] = useState(null); 
  const [lastUpdated, setLastUpdated] = useState(null);
  const [localThreshold, setLocalThreshold] = useState(threshold);

  // Fetch pre-computed charts and stats from the API
  // TODO(architecture-plan Phase 1/2): this client-side fetch-on-mount will
  // be replaced by a Server Component initial load + Context, which removes
  // this pattern entirely rather than patching it here.
  useEffect(() => {
    // We fetch even in demo mode because the server handles demo data calculation too
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalysisData(null); // Set to null to indicate loading

    fetchAnalysisData(localThreshold, participants, measurements)
      .then((data) => {
        if (!data.error) {
          setAnalysisData(data);
        } else {
          setAnalysisData({
             progressData: [],
             statusData: [],
             statsData: [],
             summaryStats: { rmse: 0, mae: 0, meanBias: 0, passRate: 0 },
             descriptiveStats: { n: 0, mean: 0, sd: 0, se: 0 },
             charts: null
          });
        }
        setLastUpdated(new Date());
      })
      .catch((err) => {
        console.error('Error fetching analysis data:', err);
        setAnalysisData({
           progressData: [],
           statusData: [],
           statsData: [],
           summaryStats: { rmse: 0, mae: 0, meanBias: 0, passRate: 0 },
           descriptiveStats: { n: 0, mean: 0, sd: 0, se: 0 },
           charts: null
        });
        setLastUpdated(new Date());
      });
  }, [localThreshold, isDemoMode]); // Re-fetch if threshold or mode changes

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setAiResult(null);

    // Simulate AI generation delay, then use the result from the server
    setTimeout(() => {
      setAiResult(analysisData?.aiResult || 'Analysis complete. No anomalies detected.');
      setIsAnalyzing(false);
    }, 2500);
  };

  const isLoadingCharts = analysisData === null;

  return (
    <>
      <AnalysisDisplay
        progressData={analysisData?.progressData || []}
        statusData={analysisData?.statusData || []}
        isAnalyzing={isAnalyzing}
        aiResult={aiResult}
        onRunAnalysis={handleRunAnalysis}
        statsData={analysisData?.statsData || []}
        summaryStats={analysisData?.summaryStats || { rmse: 0, mae: 0, meanBias: 0, passRate: 0 }}
        descriptiveStats={analysisData?.descriptiveStats || { n: 0, mean: 0, sd: 0, se: 0 }}
        charts={analysisData?.charts} // We pass the pre-calculated charts object down
        threshold={localThreshold}
        onThresholdChange={setLocalThreshold}
        isLoadingCharts={isLoadingCharts}
        lastUpdated={lastUpdated}
      />
      <AIChatControl participants={participants} measurements={measurements} />
    </>
  );
};

export default AnalysisControl;
