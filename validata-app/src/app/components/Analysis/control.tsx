import { useState, useEffect } from 'react';
import AnalysisDisplay from './display';
import EndorseDataModal from '../common/EndorseDataModal';
import { fetchAnalysisData } from './service';
import { SIGNING_ROLES, hasRole } from '../../../lib/permissions';

interface AnalysisControlProps {
  isDemoMode: boolean;
  threshold?: number;
  studyId?: string;
  currentUserEmail?: string;
  userRole?: string;
}

// Controller component manages local state and fetches processed data from the API
const AnalysisControl = ({
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

  const canSign = hasRole(userRole, SIGNING_ROLES);

  // Analysis uses client-side fetch-on-mount by design — the server computes
  // the analysis from the DB by studyId (fable_system_review §4.3), and it
  // re-fetches whenever threshold/study changes, so a Server Component
  // initial load would not help here. This is an intentional exception to
  // the Server Component pattern used elsewhere.
  useEffect(() => {
    if (!studyId) return;

    // We fetch even in demo mode because the server handles demo data calculation too
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalysisData(null); // Set to null to indicate loading

    fetchAnalysisData(localThreshold, studyId)
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
  }, [localThreshold, isDemoMode, studyId]);

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
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--status-active)', background: 'rgba(78, 201, 176, 0.1)', border: '1px solid var(--status-active)', padding: '3px 8px' }}>
              Endorsed {new Date(lastSignedAt).toUTCString()}
            </span>
          )}
          <button
            onClick={() => setShowEndorseModal(true)}
            style={{ padding: '5px 14px', fontSize: 'var(--font-size-md)', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
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
    </>
  );
};

export default AnalysisControl;
