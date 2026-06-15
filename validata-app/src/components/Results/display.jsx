import { useState } from 'react';
import { Download, CheckCircle, X } from 'lucide-react';

const ResultsDisplay = ({ sortedMeasurements }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setShowToast(true);
    
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');
      
      const element = document.getElementById('results-pdf-container');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save('validata-results.pdf');
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
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Results</h2>
          <p className="text-slate-500 mt-1">
            Research data collected from all participants.
          </p>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm text-sm"
        >
          <Download className="w-5 h-5" />
          <span>Generate Summary Report (PDF)</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200" id="results-pdf-container">
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