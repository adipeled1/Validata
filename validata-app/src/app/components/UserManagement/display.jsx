import React from 'react';
import { UserCheck, Shield, Trash2, ShieldAlert, AlertCircle, RefreshCw, UserMinus } from 'lucide-react';

const UserManagementDisplay = ({
  users,
  isLoading,
  error,
  currentUserEmail,
  onRoleChange,
  onStatusChange,
  onDelete,
  onRefresh
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden font-sans">

      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">User Access Control</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage system access, roles, and approval status for all researchers.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6">
        
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 rounded-xl flex items-start gap-3 text-sm text-rose-800 dark:text-rose-300">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Failed to load users</span>
              {error}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Fetching registered profiles...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-semibold text-lg">No profiles found</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">No other users have registered on this platform yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-medium">
                  <th className="pb-3 font-semibold text-slate-600 dark:text-slate-300">Email address</th>
                  <th className="pb-3 font-semibold text-slate-600 dark:text-slate-300">Role</th>
                  <th className="pb-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="pb-3 font-semibold text-slate-600 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => {
                  const isSelf = user.email === currentUserEmail;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/60 transition-colors">
                      {/* Email */}
                      <td className="py-4 pr-4 font-medium text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2.5">
                          <span className="block truncate max-w-xs">{user.email}</span>
                          {isSelf && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 pr-4">
                        {user.role === 'mentor' ? (
                          <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            <Shield className="h-3 w-3" />
                            Mentor
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            Team Member
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 pr-4">
                        {user.status === 'active' && (
                          <span className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                        {user.status === 'pending' && (
                          <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            Pending Approval
                          </span>
                        )}
                        {user.status === 'suspended' && (
                          <span className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Approve (Pending -> Active) */}
                          {user.status === 'pending' && (
                            <button
                              onClick={() => onStatusChange(user.id, 'active')}
                              title="Approve researcher account"
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}

                          {/* Role Toggle (Mentor <-> Team Member) */}
                          {!isSelf && (
                            <button
                              onClick={() => onRoleChange(user.id, user.role === 'mentor' ? 'team_member' : 'mentor')}
                              title={`Switch role to ${user.role === 'mentor' ? 'Team Member' : 'Mentor'}`}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                          )}

                          {/* Suspend / Unsuspend */}
                          {!isSelf && user.status === 'active' && (
                            <button
                              onClick={() => onStatusChange(user.id, 'suspended')}
                              title="Suspend researcher access"
                              className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}
                          {!isSelf && user.status === 'suspended' && (
                            <button
                              onClick={() => onStatusChange(user.id, 'active')}
                              title="Activate researcher access"
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}

                          {/* Delete Account */}
                          {!isSelf && (
                            <button
                              onClick={() => onDelete(user.id)}
                              title="Delete researcher profile"
                              className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserManagementDisplay;
