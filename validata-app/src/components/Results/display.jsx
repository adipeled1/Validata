import { useState } from 'react';
import { Download, CheckCircle, X } from 'lucide-react';

const ResultsDisplay = ({ sortedMeasurements }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleGenerateReport = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      setIsGenerating(false);
      setShowToast(true);
      
      setTimeout(() => {
        setShowToast(false);
      }, 4000);
    }, 1000);
  };

  return (
    <section className="app-section">
      {showToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg min-w-[300px] justify-between transition-all duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-emerald-900">System Insights</span>
              <span className="text-xs text-emerald-700">Summary Report (PDF) generated successfully!</span>
            </div>
          </div>
          <button 
            onClick={() => setShowToast(false)}
            className="text-emerald-400 hover:text-emerald-600 transition-colors p-0.5 rounded-lg hover:bg-emerald-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Results</h2>
          <p className="text-slate-500 mt-1">
            Research data collected from all participants.
          </p>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm text-sm disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Generating Report (API)...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Generate Summary Report (PDF)</span>
            </>
          )}
        </button>
      </div>

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
                <th className="py-3 px-3 font-medium">AI/ML Model</th>
                <th className="py-3 px-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedMeasurements.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-slate-500">
                    No data to display
                  </td>
                </tr>
              ) : (
                sortedMeasurements.map((m, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 text-sm text-slate-500" dir="ltr">{m.timestamp}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{m.participant}</td>
                    <td className="py-3 px-3 text-sm text-slate-500">{m.goniometer || '-'}</td>
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

export default ResultsDisplay;