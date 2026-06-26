import HoverTooltip from '../common/HoverTooltip';

// Pure presentational component
const ParticipantsDisplay = ({
  participants,
  consent,
  onConsentChange,
  age,
  onAgeChange,
  gender,
  onGenderChange,
  healthStatus,
  onHealthStatusChange,
  onSubmit,
  onDrop
}) => {
  return (
    <section className="app-section">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Participant Management</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Registration, tracking, and consent management of study participants.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
          <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
            Register New Participant
          </h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                The system will automatically generate a unique, anonymous ID for the new participant to ensure privacy.
              </p>
            </div>

            {/* Age Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Age
              </label>
              <input
                type="number"
                required
                min="18"
                max="120"
                placeholder="e.g. 35"
                value={age}
                onChange={(e) => onAgeChange(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Gender Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Gender
              </label>
              <select
                required
                value={gender}
                onChange={(e) => onGenderChange(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Health Status Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Health Status
              </label>
              <select
                required
                value={healthStatus}
                onChange={(e) => onHealthStatusChange(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="Healthy">Healthy</option>
                <option value="Ankle Injury">Ankle Injury</option>
              </select>
            </div>

            {/* Consent Management */}
            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-lg border border-blue-100 dark:border-blue-900 mt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => onConsentChange(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 leading-tight">
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
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Active Participants Tracking</h3>
            <span className="text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 py-1 px-3 rounded-full">
              Total: {participants.length}
            </span>
          </div>
          {/* Mobile cards — replaces the table below md, where horizontal
              scrolling a 4-column table is uncomfortable */}
          <div className="md:hidden space-y-3">
            {participants.length === 0 && (
              <p className="text-center py-6 text-slate-500 dark:text-slate-400">No participants found.</p>
            )}
            {participants.map((p) => (
              <div key={p.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{p.id}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${p.status === 'Active'
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  {p.consent ? (
                    <span className="text-green-600 dark:text-green-400 font-bold">✓ Signed</span>
                  ) : (
                    <span className="text-red-500 dark:text-red-400">Missing</span>
                  )}
                  <span className="text-slate-500 dark:text-slate-400">Enrolled: {p.enrollmentDateDisplay || '—'}</span>
                </div>
                <div className="flex items-center justify-end text-sm">
                  {p.status === 'Active' && (
                    // No HoverTooltip here: touch has no hover, so it would
                    // rarely surface. The permanence warning is carried by
                    // the confirm() dialog instead (see handleDropParticipant).
                    <button
                      onClick={() => onDrop(p.id)}
                      className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                    >
                      Drop
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-2 font-medium">System ID</th>
                  <th className="py-3 px-2 font-medium">Consent</th>
                  <th className="py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2 font-medium">Enrollment Date</th>
                  <th className="py-3 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 px-2 font-medium text-slate-800 dark:text-slate-100">{p.id}</td>
                    <td className="py-3 px-2">
                      {p.consent ? (
                        <span className="text-green-600 dark:text-green-400 font-bold">✓ Signed</span>
                      ) : (
                        <span className="text-red-500 dark:text-red-400">Missing</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${p.status === 'Active'
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-600 dark:text-slate-300">
                      {p.enrollmentDateDisplay || '—'}
                    </td>
                    <td className="py-3 px-2">
                      {p.status === 'Active' && (
                        <HoverTooltip text="Permanently removes this participant from active tracking. This action cannot be undone.">
                          <button
                            onClick={() => onDrop(p.id)}
                            className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                          >
                            Drop
                          </button>
                        </HoverTooltip>
                      )}
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-slate-500 dark:text-slate-400">
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
