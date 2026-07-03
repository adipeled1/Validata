"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';

// ICH E6(R3) AUDIT-05: Audit trail viewer.
// Restricted to mentor, sponsor_admin, monitor, and auditor roles.
const AUDIT_VIEWER_ROLES = ['mentor', 'sponsor_admin', 'monitor', 'auditor'];

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  SOFT_DELETE: 'bg-orange-100 text-orange-800',
  ROLE_CHANGE: 'bg-purple-100 text-purple-800',
  STATUS_CHANGE: 'bg-yellow-100 text-yellow-800',
  SIGN_OFF: 'bg-teal-100 text-teal-800',
  LOCK: 'bg-gray-200 text-gray-800',
  UNLOCK: 'bg-gray-100 text-gray-700',
};

export default function AuditLogPage() {
  const { userRole } = useSession();
  const { currentStudyId } = useStudy();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const canView = AUDIT_VIEWER_ROLES.includes(userRole);

  const loadLogs = useCallback(async () => {
    if (!currentStudyId) return;
    setLoading(true);
    const params = new URLSearchParams({ studyId: currentStudyId });
    if (actionFilter) params.set('action', actionFilter);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    const res = await fetch(`/api/audit-log?${params}`);
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }, [currentStudyId, actionFilter, fromDate, toDate]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const downloadCsv = () => {
    if (!currentStudyId) return;
    const params = new URLSearchParams({ studyId: currentStudyId, format: 'csv' });
    if (actionFilter) params.set('action', actionFilter);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    window.open(`/api/audit-log?${params}`, '_blank');
  };

  if (!canView) {
    return <p className="p-6 text-gray-500">You do not have access to the audit trail.</p>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Audit Trail</h1>
        <button
          onClick={downloadCsv}
          className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Immutable, system-generated audit trail for this study. Every data creation, modification, and
        deletion is recorded with actor identity and UTC timestamp. (ICH E6(R3) AUDIT-01 to AUDIT-08)
      </p>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="">All actions</option>
            {['INSERT','UPDATE','DELETE','SOFT_DELETE','ROLE_CHANGE','STATUS_CHANGE','LOCK','UNLOCK','SIGN_OFF'].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">From (UTC)</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">To (UTC)</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={loadLogs}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
          Refresh
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && !currentStudyId && (
        <p className="text-sm text-gray-400">No study selected.</p>
      )}

      {!loading && logs.length === 0 && currentStudyId && (
        <p className="text-sm text-gray-400">No audit entries match the current filters.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2">Timestamp (UTC)</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Table</th>
              <th className="px-3 py-2">Record</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">
                  {new Date(row.occurred_at).toUTCString()}
                </td>
                <td className="px-3 py-2 text-xs">{row.actor_email ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.table_name}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.record_id}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[row.action] ?? 'bg-gray-100 text-gray-700'}`}>
                    {row.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{row.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
