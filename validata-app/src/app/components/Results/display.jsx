import { useState } from 'react';
import { FileSpreadsheet, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const ResultsDisplay = ({ sortedMeasurements }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleExportToExcel = () => {
    setIsExporting(true);
    setShowToast(true);
    
    try {
      // Map measurements to Excel-friendly headers and values
      const worksheetData = sortedMeasurements.map(m => ({
        'Date & Time': m.timestamp,
        'Participant': m.participant,
        'Goniometer': m.goniometer || '-',
        'AI/ML Model': m.aiModel || '-',
        'Notes': m.notes || '-'
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

      // Download the Excel file
      XLSX.writeFile(workbook, 'validata-results.xlsx');
    } catch (err) {
      console.error('Failed to export to Excel:', err);
    } finally {
      setIsExporting(false);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  return (
    <section className="app-section">
      {showToast && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-50 flex items-center bg-[#10b981] text-white px-6 py-3 rounded shadow-lg transition-all duration-300">
          <span className="font-medium text-sm">Preparing Excel report... Download will begin shortly.</span>
        </div>
      )}

      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Results</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Research data collected from all participants.
          </p>
        </div>

        <button
          onClick={handleExportToExcel}
          disabled={isExporting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm text-sm"
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>Export Results to Excel</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800" id="results-pdf-container">
        <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Research Data View
        </h3>
        {/* Mobile cards — replaces the table below md; Notes gets a full-width
            line instead of a cramped cell since it's free text */}
        <div className="md:hidden space-y-3">
          {sortedMeasurements.length === 0 ? (
            <p className="text-center py-6 text-slate-500 dark:text-slate-400">No data to display</p>
          ) : (
            sortedMeasurements.map((m, index) => (
              <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{m.participant}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">{m.timestamp}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>Goniometer: {m.goniometer || '-'}</span>
                  <span>AI/ML Model: {m.aiModel || '-'}</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Notes: {m.notes || '-'}</p>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-3 font-medium">Date & Time</th>
                <th className="py-3 px-3 font-medium">Participant</th>
                <th className="py-3 px-3 font-medium">Goniometer</th>
                <th className="py-3 px-3 font-medium">AI/ML Model</th>
                <th className="py-3 px-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedMeasurements.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-slate-500 dark:text-slate-400">
                    No data to display
                  </td>
                </tr>
              ) : (
                sortedMeasurements.map((m, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400" dir="ltr">{m.timestamp}</td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-100">{m.participant}</td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{m.goniometer || '-'}</td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{m.aiModel || '-'}</td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{m.notes || '-'}</td>
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

export default ResultsDisplay;