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
  }, [localThreshold, isDemoMode, participants, measurements]);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '8px' }}>
          {lastSignedAt && (
            <span style={{ fontSize: '11px', color: 'var(--status-active)', background: 'rgba(78, 201, 176, 0.1)', border: '1px solid var(--status-active)', padding: '3px 8px' }}>
              Endorsed {new Date(lastSignedAt).toUTCString()}
            </span>
          )}
          <button
            onClick={() => setShowEndorseModal(true)}
            style={{ padding: '5px 14px', fontSize: '12px', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Endorse Data
          </button>
        </div>
      )}

      <AnalysisDisplay
        progressData={analysisData?.progressData || []}
        statusData={analysisData?.statusData || []}
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
