import React from 'react';
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

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// Pure presentational component
const AnalysisDisplay = ({
  progressData,
  progressOptions,
  statusData,
  statusOptions,
  sortedMeasurements,
  isAnalyzing,
  aiResult,
  onRunAnalysis,
  onGenerateReport
}) => {
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

      {/* AI Analysis Module */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              AI Analysis Module (OpenAI)
            </h3>
            <p className="text-slate-600 mt-1 text-sm">
              Use artificial intelligence to identify trends, anomalies, and patterns in the
              collected data.
            </p>
          </div>
          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className={`bg-indigo-900 hover:bg-indigo-800 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-md flex items-center gap-2 ${
              isAnalyzing ? 'opacity-80 cursor-not-allowed' : ''
            }`}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing (API)...
              </>
            ) : (
              'Run Data Analysis'
            )}
          </button>
        </div>

        {/* AI Result Display */}
        {aiResult && (
          <div className="mt-4 bg-white p-4 rounded-lg border border-indigo-100 shadow-inner">
            <div className="flex items-center gap-2 mb-2 text-indigo-700 font-semibold">
              <AlertCircle className="w-5 h-5" />
              System Insights:
            </div>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
              {aiResult}
            </p>
          </div>
        )}
      </div>

      {/* Research Data View */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-semibold mb-4 text-slate-800 border-b pb-2">
          Research Data View
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="py-3 px-3 font-medium">Date & Time</th>
                <th className="py-3 px-3 font-medium">Participant</th>
                <th className="py-3 px-3 font-medium">Goniometer</th>
                <th className="py-3 px-3 font-medium">Protractor</th>
                <th className="py-3 px-3 font-medium">AI/ML Model</th>
                <th className="py-3 px-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedMeasurements.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-slate-500">
                    No data to display
                  </td>
                </tr>
              ) : (
                sortedMeasurements.map((m, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-3 text-sm text-slate-500" dir="ltr">
                      {m.timestamp}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{m.participant}</td>
                    <td className="py-3 px-3 text-sm text-slate-500">{m.goniometer || '-'}</td>
                    <td className="py-3 px-3 text-sm text-slate-500">{m.protractor || '-'}</td>
                    <td className="py-3 px-3 text-sm text-slate-500">{m.aiModel || '-'}</td>
                    <td className="py-3 px-3 text-sm text-slate-500">{m.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default AnalysisDisplay;
