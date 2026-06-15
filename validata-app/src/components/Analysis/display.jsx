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
  'RMSE and MAE over time. Decreasing values indicate the AI model is improving across sessions. RMSE (Root Mean Square Error) penalises large errors more heavily. MAE (Mean Absolute Error) treats all errors equally. Both are in degrees — lower is better.';

const infoDonut = (threshold) =>
  `Percentage of measurements where the AI error was within the acceptable clinical threshold of ±${threshold}°. Green = pass, red = fail.`;

// Pure presentational component
const AnalysisDisplay = ({
  progressData,
  progressOptions,
  statusData,
  statusOptions,
  isAnalyzing,
  aiResult,
  onRunAnalysis,
  onGenerateReport,
  statsData,
  summaryStats,
  threshold,
  isLoadingCharts,
  lastUpdated,
}) => {
  const { rmse, mae, meanBias, passRate } = summaryStats;
  const isEmpty = !isLoadingCharts && statsData.length === 0;

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <section className="app-section">
      <div className="flex justify-between items-end mb-8">
        <header>
          <h2 className="text-3xl font-bold text-slate-800">Results View & Analysis</h2>
          <p className="text-slate-500 mt-1">
            Data visualization, report generation, and smart analysis using AI.
          </p>
        </header>
        <button
          onClick={onGenerateReport}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          <Download className="w-5 h-5" />
          Generate Summary Report (PDF)
        </button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Chart 1: Measurement Completion */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Measurement Progress</h3>
          <div className="relative h-64">
            <Bar data={progressData} options={progressOptions} />
          </div>
        </div>
        {/* Chart 2: Participant Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
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
          <h3 className="text-xl font-bold text-slate-800">Clinical Accuracy Analysis</h3>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoadingCharts
              ? 'Loading data from database…'
              : isEmpty
                ? 'No measurements available yet.'
                : `AI vs. goniometer agreement across ${statsData.length} measurements.`}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1 shrink-0">
          {/* Threshold badge — always visible so users never have to recall it */}
          <span className="text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1">
            Pass threshold: ±{threshold}°
          </span>
          {/* Last-updated timestamp — Visibility of System Status (Nielsen heuristic #1) */}
          {formattedTime && (
            <span className="text-xs text-slate-400">Last updated: {formattedTime}</span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoadingCharts && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3"></div>
          Fetching measurements from database…
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200 mb-8">
          No measurements found in the database yet.
        </div>
      )}

      {/* ── Summary cards + charts — rendered only when data is ready ── */}
      {!isLoadingCharts && statsData.length > 0 && (
        <>
          {/* Summary Stats Cards — sticky above charts so numbers stay in view */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">RMSE</p>
              <p className="text-3xl font-bold text-indigo-600 mt-1">{rmse.toFixed(2)}°</p>
              <p className="text-xs text-slate-400 mt-1">Root Mean Square Error</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">MAE</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{mae.toFixed(2)}°</p>
              <p className="text-xs text-slate-400 mt-1">Mean Absolute Error</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mean Bias</p>
              <p className={`text-3xl font-bold mt-1 ${meanBias >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                {meanBias >= 0 ? '+' : ''}{meanBias.toFixed(2)}°
              </p>
              <p className="text-xs text-slate-400 mt-1">Systematic AI offset</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pass Rate</p>
              <p className={`text-3xl font-bold mt-1 ${passRate >= 80 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {passRate.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Within ±{threshold}° threshold</p>
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
              <BlandAltmanPlot data={statsData} />
            </ChartCard>

            <ChartCard
              title="Error Distribution"
              info={INFO_HISTOGRAM}
              isEmpty={!statsData.length}
            >
              <ErrorHistogram data={statsData} />
            </ChartCard>

            <ChartCard
              title="Performance Trend per Session"
              info={INFO_TREND}
              isEmpty={!statsData.length}
            >
              <PerformanceTrend data={statsData} />
            </ChartCard>
          </div>

          {/* Threshold Donut — full row, centered */}
          <ChartCard
            title={`Pass / Fail Rate (±${threshold}° threshold)`}
            info={infoDonut(threshold)}
            isEmpty={!statsData.length}
            center
          >
            <div className="max-w-sm mx-auto">
              <ThresholdDonut data={statsData} threshold={threshold} />
            </div>
          </ChartCard>
        </>
      )}

    </section>
  );
};

export default AnalysisDisplay;
