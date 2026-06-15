const ResultsDisplay = ({ sortedMeasurements }) => {
  return (
    <section className="app-section">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Results</h2>
        <p className="text-slate-500 mt-1">
          Research data collected from all participants.
        </p>
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
