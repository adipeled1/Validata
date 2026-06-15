import { useState, useEffect } from 'react';
import AnalysisDisplay from './display';
import {
  getProgressChartData,
  getStatusChartData,
  generateAnalysisText
} from './service';
import {
  normalizeRecord,
  calculateRMSE,
  calculateMAE,
  calculateBlandAltman,
  calculatePassRate,
} from '../../utils/statistics';
import analysisData from './analysisData';

// Controller component manages local state and processes data using service methods
const AnalysisControl = ({ participants, measurements, onGenerateReport, isDemoMode, threshold = 5 }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  // Raw records fetched directly from the API for the clinical accuracy charts
  const [dbMeasurements, setDbMeasurements] = useState(null); // null = still loading
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch fresh measurements from the API whenever the Analysis view is opened
  useEffect(() => {
    if (isDemoMode) {
      // Demo mode uses local data — mark as immediately ready
      setLastUpdated(new Date());
      return;
    }

    fetch('/api/measurements')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const normalized = data
            .map(normalizeRecord)
            .filter((m) => m.goniometerAngle > 0 && m.aiAngle > 0);
          setDbMeasurements(normalized);
        } else {
          setDbMeasurements([]);
        }
        setLastUpdated(new Date());
      })
      .catch(() => {
        setDbMeasurements([]);
        setLastUpdated(new Date());
      });
  }, [isDemoMode]);

  // Process data for existing participation/status charts
  const progressData = getProgressChartData(participants, measurements);
  const statusData = getStatusChartData(participants);

  const progressOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  const statusOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setAiResult(null);

    // Simulate API call delay
    setTimeout(() => {
      const analysisText = generateAnalysisText(participants, measurements);
      setAiResult(analysisText);
      setIsAnalyzing(false);
    }, 2500);
  };

  // Demo mode: use 50-record mock data so charts render without a DB connection.
  // Real mode: use data fetched directly from /api/measurements (null while loading).
  const statsData = isDemoMode ? analysisData : (dbMeasurements ?? []);
  const isLoadingCharts = !isDemoMode && dbMeasurements === null;

  // Summary stats for the accuracy cards
  const rmse = calculateRMSE(statsData);
  const mae = calculateMAE(statsData);
  const { meanDiff } = calculateBlandAltman(statsData);
  const { percentage: passRate } = calculatePassRate(statsData, threshold);

  return (
    <AnalysisDisplay
      progressData={progressData}
      progressOptions={progressOptions}
      statusData={statusData}
      statusOptions={statusOptions}
      isAnalyzing={isAnalyzing}
      aiResult={aiResult}
      onRunAnalysis={handleRunAnalysis}
      onGenerateReport={onGenerateReport}
      statsData={statsData}
      summaryStats={{ rmse, mae, meanBias: meanDiff, passRate }}
      threshold={threshold}
      isLoadingCharts={isLoadingCharts}
      lastUpdated={lastUpdated}
    />
  );
};

export default AnalysisControl;
