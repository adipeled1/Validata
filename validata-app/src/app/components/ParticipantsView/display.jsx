import { Users, Heart, ShieldAlert, Activity } from 'lucide-react';

const ParticipantsViewDisplay = ({
  participants,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  stats
}) => {
  return (
    <section className="app-section">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Participants List & Details</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Detailed medical overview, demographic distribution, and health status indicators.
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Average Age</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.avgAge} years</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Healthy Participants</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.healthyCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ankle Injured Participants</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.ankleInjuredCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Table Filters */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by ID..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Health Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="All">All Statuses</option>
              <option value="Healthy">Healthy</option>
              <option value="Ankle Injured">Ankle Injured</option>
            </select>
          </div>
        </div>

        {/* Mobile cards — replaces the table below md */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {participants.length === 0 ? (
            <p className="text-center py-10 text-slate-500 dark:text-slate-400">No participants match the criteria</p>
          ) : (
            participants.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100 mb-2">
                  <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  {p.id}
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>Age: {p.age || 'N/A'}</span>
                  <span>Gender: {p.gender || 'N/A'}</span>
                </div>
                <div className="mt-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      p.healthStatus === 'Healthy'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                        : p.healthStatus === 'Sick'
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {p.healthStatus || 'N/A'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Participants Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-6 font-medium">Participant ID</th>
                <th className="py-4 px-6 font-medium">Age</th>
                <th className="py-4 px-6 font-medium">Gender</th>
                <th className="py-4 px-6 font-medium">Health Status</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-slate-500 dark:text-slate-400">
                    No participants match the criteria
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      {p.id}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{p.age || 'N/A'}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{p.gender || 'N/A'}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          p.healthStatus === 'Healthy'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                            : p.healthStatus === 'Ankle Injured'
                            ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {p.healthStatus || 'N/A'}
                      </span>
                    </td>
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

export default ParticipantsViewDisplay;
