import HoverTooltip from '../common/HoverTooltip';

interface ParticipantsDisplayProps {
  participants: any[];
  age: string;
  onAgeChange: (v: string) => void;
  gender: string;
  onGenderChange: (v: string) => void;
  healthStatus: string;
  onHealthStatusChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDrop: (id: string) => void;
  onToggleCompleted: (id: string) => void;
  recruitedCount: number;
  recruitmentGoal: number | null;
  isMentor: boolean;
  goalInput: string;
  onGoalInputChange: (v: string) => void;
  onGoalSubmit: (e: React.FormEvent) => void;
}

// Pure presentational component
const ParticipantsDisplay = ({
  participants,
  age,
  onAgeChange,
  gender,
  onGenderChange,
  healthStatus,
  onHealthStatusChange,
  onSubmit,
  onDrop,
  onToggleCompleted,
  recruitedCount,
  recruitmentGoal,
  isMentor,
  goalInput,
  onGoalInputChange,
  onGoalSubmit
}: ParticipantsDisplayProps) => {
  const goalPercent = recruitmentGoal
    ? Math.min(100, Math.round((recruitedCount / recruitmentGoal) * 100))
    : 0;
  // Dropped participants count toward neither side of this ratio - they were
  // never recruited to completion, same reasoning as the recruitment widget.
  const nonDroppedParticipants = participants.filter((p) => String(p.status || '').toLowerCase() !== 'dropped');
  const completedCount = nonDroppedParticipants.filter((p) => String(p.status || '').toLowerCase() === 'completed').length;

  return (
    <section className="app-section">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Participant Management</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Registration, tracking, and consent management of study participants.
        </p>
      </header>

      {/* Recruitment Progress */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recruitment Progress</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {recruitmentGoal
                ? `${recruitedCount} of ${recruitmentGoal} participants recruited (Active + Completed)`
                : 'Recruitment goal not set yet.'}
            </p>
          </div>

          {isMentor && (
            <form onSubmit={onGoalSubmit} className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                placeholder={recruitmentGoal ? String(recruitmentGoal) : 'Set goal'}
                value={goalInput}
                onChange={(e) => onGoalInputChange(e.target.value)}
                className="w-28 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Set Goal
              </button>
            </form>
          )}
        </div>

        {recruitmentGoal && (
          <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
        )}
      </div>

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
              <label htmlFor="participant-age" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Age
              </label>
              <input
                id="participant-age"
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
              <label htmlFor="participant-gender" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Gender
              </label>
              <select
                id="participant-gender"
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
              <label htmlFor="participant-health-status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Health Status
              </label>
              <select
                id="participant-health-status"
                required
                value={healthStatus}
                onChange={(e) => onHealthStatusChange(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="Healthy">Healthy</option>
                <option value="Ankle Injured">Ankle Injured</option>
              </select>
            </div>

            {/* ICH E6(R3) CONSENT-01: Formal consent is recorded via the eConsent
                workflow (POST /api/consent). Enrollment does not itself constitute
                consent — the consent record must be created separately. */}
            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-lg border border-amber-200 dark:border-amber-900 mt-2">
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-tight">
                <strong>Informed Consent (ICH E6(R3)):</strong> After enrolling this participant, please create a formal consent record via the Consent section. A separate consent record is required per the study protocol.
              </p>
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Completed: <span className="font-semibold text-slate-700 dark:text-slate-300">{completedCount}/{nonDroppedParticipants.length}</span>
              </span>
              <span className="text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 py-1 px-3 rounded-full">
                Total: {participants.length}
              </span>
            </div>
          </div>
          {/* Mobile cards — replaces the table below md, where horizontal
              scrolling a 4-column table is uncomfortable */}
          <div className="md:hidden space-y-3">
            {participants.length === 0 && (
              <p className="text-center py-6 text-slate-500 dark:text-slate-400">No participants found.</p>
            )}
            {participants.map((p) => {
              const normalizedStatus = String(p.status || '').toLowerCase();
              return (
                <div key={p.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{p.id}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${p.status === 'Active'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : normalizedStatus === 'completed'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">Consent: see records</span>
                    <span className="text-slate-500 dark:text-slate-400">Enrolled: {p.enrollmentDateDisplay || '—'}</span>
                  </div>
                  {normalizedStatus !== 'dropped' && (
                    // No HoverTooltip here: touch has no hover, so it would
                    // rarely surface. The permanence warning is carried by
                    // the confirm() dialog instead (see handleDropParticipant).
                    // Fixed-width pills so "Mark Complete"/"Mark Not Completed"
                    // toggling doesn't shift the Drop button's position.
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onToggleCompleted(p.id)}
                        className={`w-36 text-center text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                          normalizedStatus === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/70'
                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/70'
                        }`}
                      >
                        {normalizedStatus === 'completed' ? 'Mark Not Completed' : 'Mark Complete'}
                      </button>
                      <button
                        onClick={() => onDrop(p.id)}
                        className="w-16 text-center text-xs font-semibold px-2.5 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/70 transition-colors cursor-pointer"
                      >
                        Drop
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-2 font-medium">System ID</th>
                  <th className="py-3 px-2 font-medium">Consent</th>
                  {/* Consent is now tracked via consent_records table (ICH E6(R3) CONSENT-01) */}
                  <th className="py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2 font-medium">Enrollment Date</th>
                  <th className="py-3 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const normalizedStatus = String(p.status || '').toLowerCase();
                  const statusLabel = normalizedStatus === 'completed' ? 'Completed' : p.status;

                  return (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3 px-2 font-medium text-slate-800 dark:text-slate-100">{p.id}</td>
                      <td className="py-3 px-2 text-xs text-slate-400 dark:text-slate-500">
                        See consent records
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`w-24 inline-block text-center text-xs px-2 py-1 rounded-full ${p.status === 'Active'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                            : normalizedStatus === 'completed'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-slate-600 dark:text-slate-300">
                        {p.enrollmentDateDisplay || '—'}
                      </td>
                      <td className="py-3 px-2">
                        {normalizedStatus !== 'dropped' && (
                          // Fixed-width pills so "Mark Complete"/"Mark Not
                          // Completed" toggling doesn't shift Drop's position.
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onToggleCompleted(p.id)}
                              className={`w-36 text-center text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                                normalizedStatus === 'completed'
                                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/70'
                                  : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/70'
                              }`}
                            >
                              {normalizedStatus === 'completed' ? 'Mark Not Completed' : 'Mark Complete'}
                            </button>
                            <HoverTooltip text="Permanently removes this participant from active tracking and marks all of their measurements as invalid. This action cannot be undone.">
                              <button
                                onClick={() => onDrop(p.id)}
                                className="w-16 text-center text-xs font-semibold px-2.5 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/70 transition-colors cursor-pointer"
                              >
                                Drop
                              </button>
                            </HoverTooltip>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {participants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500 dark:text-slate-400">
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
