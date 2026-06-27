import React, { useState } from 'react';
import { Download, Sparkles, AlertCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import ChartCard from './ChartCard';
import AgreementScatter from './charts/AgreementScatter';
import BlandAltmanPlot from './charts/BlandAltmanPlot';
import ErrorHistogram from './charts/ErrorHistogram';
import PerformanceTrend from './charts/PerformanceTrend';
import ThresholdDonut from './charts/ThresholdDonut';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const INFO_SCATTER =
  'Each dot is one measurement. Points on the dashed diagonal line mean the AI agreed perfectly with the goniometer. The further a dot is from the line, the larger the error.';

const INFO_BLAND_ALTMAN =
  'Shows the difference (AI − goniometer) for each measurement. Points between the dashed red lines = clinically acceptable agreement. A Bland-Altman plot checks how well two measurement methods agree — if dots cluster within the ±1.96 SD limits, the methods agree well. A bias far from zero means the AI consistently over- or under-estimates.';

const INFO_HISTOGRAM =
  'How often each error size occurs. A narrow, centered peak means the AI is consistently close to the goniometer. A wide or off-center histogram indicates systematic errors.';

const INFO_TREND =
  'RMSE and MAE per participant. Each point uses that participant\'s average AI and goniometer readings. RMSE (Root Mean Square Error) penalises large errors more heavily. MAE (Mean Absolute Error) treats all errors equally. Both are in degrees — lower is better.';

const infoDonut = (threshold) =>
  `Percentage of measurements where the AI error was within the acceptable clinical threshold of ±${threshold}°. Green = pass, red = fail.`;

const INFO_DESCRIPTIVE =
  'Descriptive statistics of the AI − goniometer error across participants, after averaging each participant\'s own measurements. Mean shows the average error (bias); SD shows how spread out errors are between participants; SE shows how precisely the mean error is estimated from this sample size.';

// Pure presentational component
const AnalysisDisplay = ({
  progressData,
  progressOptions,
  statusData,
  statusOptions,
  isAnalyzing,
  aiResult,
  statsData,
  summaryStats,
  descriptiveStats,
  charts,
  threshold,
  onThresholdChange,
  isLoadingCharts,
  lastUpdated,
}) => {
  const { rmse, mae, meanBias, passRate } = summaryStats;
  const { n: descN, mean: descMean, sd: descSd, se: descSe } = descriptiveStats || { n: 0, mean: 0, sd: 0, se: 0 };
  const isEmpty = !isLoadingCharts && statsData.length === 0;

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(String(threshold));

  React.useEffect(() => {
    setThresholdInput(String(threshold));
  }, [threshold]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setShowToast(true);
    
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');
      
      const charts = document.querySelectorAll('.pdf-chart');
      if (!charts.length) return;
      
      const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'landscape' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      for (let i = 0; i < charts.length; i++) {
        const canvas = await html2canvas(charts[i], { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        
        const margin = 0.5;
        const maxPdfWidth = pdfWidth - margin * 2;
        const maxPdfHeight = pageHeight - margin * 2;
        
        const imgRatio = canvas.width / canvas.height;
        const pdfRatio = maxPdfWidth / maxPdfHeight;
        
        let renderWidth, renderHeight;
        if (imgRatio > pdfRatio) {
          renderWidth = maxPdfWidth;
          renderHeight = maxPdfWidth / imgRatio;
        } else {
          renderHeight = maxPdfHeight;
          renderWidth = maxPdfHeight * imgRatio;
        }
        
        if (i > 0) pdf.addPage();
        
        const xOffset = (pdfWidth - renderWidth) / 2;
        const yOffset = (pageHeight - renderHeight) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, renderWidth, renderHeight);
      }
      
      pdf.save('validata-analysis.pdf');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <section className="app-section">
      {showToast && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-50 flex items-center bg-[#10b981] text-white px-6 py-3 rounded shadow-lg transition-all duration-300">
          <span className="font-medium text-sm">Preparing PDF report... Download will begin shortly.</span>
        </div>
      )}
      <div className="flex justify-between items-end mb-8">
        <header>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Results View & Analysis</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Data visualization, report generation, and smart analysis using AI.
          </p>
        </header>
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm text-sm"
        >
          <Download className="w-5 h-5" />
          <span>Generate Summary Report (PDF)</span>
        </button>
      </div>

      <div id="analysis-pdf-container">
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Chart 1: Measurement Completion */}
        <div className="pdf-chart bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Measurement Progress</h3>
          <div className="relative h-64">
            <Bar data={progressData} options={progressOptions} />
          </div>
        </div>
        {/* Chart 2: Participant Status */}
        <div className="pdf-chart bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Participant Status Distribution
          </h3>
          <div className="relative h-64">
            <Doughnut data={statusData} options={statusOptions} />
          </div>
        </div>
      </div>

      {/* ── Clinical Accuracy Analysis header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Clinical Accuracy Analysis</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {isLoadingCharts
              ? 'Loading data from database…'
              : isEmpty
                ? 'No measurements available yet.'
                : `AI vs. goniometer agreement across ${statsData.length} measurements.`}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1 shrink-0">

          {/* Last-updated timestamp — Visibility of System Status (Nielsen heuristic #1) */}
          {formattedTime && (
            <span className="text-xs text-slate-400 dark:text-slate-400">Last updated: {formattedTime}</span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoadingCharts && (
        <div className="flex items-center justify-center py-20 text-slate-400 dark:text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3"></div>
          Fetching measurements from database…
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-16 text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-8">
          No measurements found in the database yet.
        </div>
      )}

      {/* ── Summary cards + charts — rendered only when data is ready ── */}
      {!isLoadingCharts && statsData.length > 0 && (
        <>
          {/* Summary Stats Cards — sticky above charts so numbers stay in view */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">RMSE</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{rmse.toFixed(2)}°</p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Root Mean Square Error</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">MAE</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{mae.toFixed(2)}°</p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Mean Absolute Error</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mean Bias</p>
              <p className={`text-3xl font-bold mt-1 ${meanBias >= 0 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {meanBias >= 0 ? '+' : ''}{meanBias.toFixed(2)}°
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Systematic AI offset</p>
            </div>
          </div>

          {/* Accuracy Charts — 2-column grid, 1 column on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <ChartCard
              title="Agreement Scatter"
              info={INFO_SCATTER}
              isEmpty={!statsData.length}
            >
              <AgreementScatter data={statsData} />
            </ChartCard>

            <ChartCard
              title="Bland-Altman Plot"
              info={INFO_BLAND_ALTMAN}
              isEmpty={!statsData.length}
            >
              <BlandAltmanPlot data={charts?.blandAltman} />
            </ChartCard>

            <ChartCard
              title="Error Distribution"
              info={INFO_HISTOGRAM}
              isEmpty={!statsData.length}
            >
              <ErrorHistogram data={charts?.errorHistogram} />
            </ChartCard>

            <ChartCard
              title="Performance Trend per Session"
              info={INFO_TREND}
              isEmpty={!statsData.length}
            >
              <PerformanceTrend data={charts?.performanceTrend} />
            </ChartCard>
          </div>

          {/* Threshold Donut — full row, centered */}
          <ChartCard
            title={
              <div className="flex items-center justify-center gap-2">
                <span>Pass / Fail Rate (±</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={thresholdInput}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                      setThresholdInput(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const num = parseFloat(thresholdInput);
                      if (!isNaN(num) && num >= 0) {
                        onThresholdChange?.(num);
                      }
                    }
                  }}
                  onBlur={() => {
                    const num = parseFloat(thresholdInput);
                    if (!isNaN(num) && num >= 0) {
                      onThresholdChange?.(num);
                    }
                  }}
                  className="w-20 px-2 py-1 text-sm border border-slate-300 dark:border-slate-700 rounded text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal m-0 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
                <span>° threshold)</span>
              </div>
            }
            info={infoDonut(threshold)}
            isEmpty={!statsData.length}
            center
          >
            <div className="max-w-sm mx-auto">
              <ThresholdDonut data={charts?.thresholdDonut} threshold={threshold} />
            </div>
          </ChartCard>

          {/* Descriptive Statistics — mean/SD/SE of the AI-goniometer error across participants */}
          <ChartCard title="Descriptive Statistics" info={INFO_DESCRIPTIVE} isEmpty={descN === 0}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">N</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{descN}</p>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Participants</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mean Error</p>
                <p className={`text-2xl font-bold mt-1 ${descMean >= 0 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  {descMean >= 0 ? '+' : ''}{descMean.toFixed(2)}°
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Average bias</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">SD</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{descSd.toFixed(2)}°</p>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Standard Deviation</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">SE</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{descSe.toFixed(2)}°</p>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Standard Error</p>
              </div>
            </div>
          </ChartCard>
        </>
      )}
      </div>
    </section>
  );
};

export default AnalysisDisplay;
