
// Pure presentational component
const ParticipantsDisplay = ({ 
  participants, 
  consent, 
  onConsentChange, 
  onSubmit, 
  onSuspend 
}) => {
  return (
    <section className="app-section">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Participant Management</h2>
        <p className="text-slate-500 mt-1">
          Registration, tracking, and consent management of study participants.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h3 className="text-xl font-semibold mb-4 text-slate-800 border-b pb-2">
            Register New Participant
          </h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
              <p className="text-sm text-slate-600">
                The system will automatically generate a unique, anonymous ID for the new participant to ensure privacy.
              </p>
            </div>

            {/* Consent Management */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => onConsentChange(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-slate-700 leading-tight">
                  <strong>Informed Consent:</strong> I confirm that the participant has read and signed the informed consent form to participate in the study.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Add Participant
            </button>
          </form>
        </div>

        {/* Tracking Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h3 className="text-xl font-semibold text-slate-800">Active Participants Tracking</h3>
            <span className="text-sm bg-blue-100 text-blue-800 py-1 px-3 rounded-full">
              Total: {participants.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-sm border-b border-slate-200">
                  <th className="py-3 px-2 font-medium">System ID</th>
                  <th className="py-3 px-2 font-medium">Consent</th>
                  <th className="py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2 font-medium text-slate-800">{p.id}</td>
                    <td className="py-3 px-2">
                      {p.consent ? (
                        <span className="text-green-600 font-bold">✓ Signed</span>
                      ) : (
                        <span className="text-red-500">Missing</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          p.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {p.status === 'Active' && (
                        <button
                          onClick={() => onSuspend(p.id)}
                          className="text-sm text-red-500 hover:text-red-700 hover:underline"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-slate-500">
                      No participants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ParticipantsDisplay;
