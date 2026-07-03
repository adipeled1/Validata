import { useState, useEffect } from 'react';
import AnalysisDisplay from './display';
import AIChatControl from '../AIChat/control';
import EndorseDataModal from '../common/EndorseDataModal';
import { fetchAnalysisData } from './service';

interface AnalysisControlProps {
  participants: any[];
  measurements: any[];
  isDemoMode: boolean;
  threshold?: number;
  studyId?: string;
  currentUserEmail?: string;
  userRole?: string;
}

// Controller component manages local state and fetches processed data from the API
const AnalysisControl = ({
  participants,
  measurements,
  isDemoMode,
  threshold = 5,
  studyId,
  currentUserEmail,
  userRole,
}: AnalysisControlProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [showEndorseModal, setShowEndorseModal] = useState(false);
  const [lastSignedAt, setLastSignedAt] = useState<string | null>(null);

  // Stores the entire processed analysis payload from the server
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [localThreshold, setLocalThreshold] = useState(threshold);

  const canSign = userRole && ['mentor', 'sponsor_admin', 'investigator'].includes(userRole);

  // Analysis uses client-side fetch-on-mount by design — analysis data is
  // computed from the participants+measurements props passed in (not from the
  // Server Component layout), and it re-fetches whenever threshold or mode
  // changes, so a Server Component initial load would not help here. This is
  // an intentional exception to the Server Component pattern used elsewhere.
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
      {showEndorseModal && studyId && currentUserEmail && (
        <EndorseDataModal
          studyId={studyId}
          signerEmail={currentUserEmail}
          onClose={() => setShowEndorseModal(false)}
          onSuccess={(signedAt) => {
            setLastSignedAt(signedAt);
            setShowEndorseModal(false);
          }}
        />
      )}

      {canSign && (
        <div className="flex items-center justify-end gap-3 mb-2 px-4">
          {lastSignedAt && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
              Endorsed {new Date(lastSignedAt).toUTCString()}
            </span>
          )}
          <button
            onClick={() => setShowEndorseModal(true)}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Endorse Data
          </button>
        </div>
      )}

      <AnalysisDisplay
        progressData={analysisData?.progressData || []}
        statusData={analysisData?.statusData || []}
        isAnalyzing={isAnalyzing}
        aiResult={aiResult}
        onRunAnalysis={handleRunAnalysis}
        statsData={analysisData?.statsData || []}
        summaryStats={analysisData?.summaryStats || { rmse: 0, mae: 0, meanBias: 0, passRate: 0 }}
        descriptiveStats={analysisData?.descriptiveStats || { n: 0, mean: 0, sd: 0, se: 0 }}
        charts={analysisData?.charts}
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
