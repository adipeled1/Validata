import React, { useState } from 'react';
import AnalysisDisplay from './display';
import { 
  sortMeasurementsDescending, 
  getProgressChartData, 
  getStatusChartData, 
  generateAnalysisText 
} from './service';

// Controller component manages local state and processes data using service methods
const AnalysisControl = ({ participants, measurements, onGenerateReport }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Process data for charts
  const progressData = getProgressChartData(participants, measurements);
  const statusData = getStatusChartData(participants);
  
  // Sort measurements newest to oldest
  const sortedMeasurements = sortMeasurementsDescending(measurements);

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

  return (
    <AnalysisDisplay
      progressData={progressData}
      progressOptions={progressOptions}
      statusData={statusData}
      statusOptions={statusOptions}
      sortedMeasurements={sortedMeasurements}
      isAnalyzing={isAnalyzing}
      aiResult={aiResult}
      onRunAnalysis={handleRunAnalysis}
      onGenerateReport={onGenerateReport}
    />
  );
};

export default AnalysisControl;
