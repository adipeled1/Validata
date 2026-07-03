"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';

// ICH E6(R3) CAP-04, COR-01, COR-02: Query management page.
// Accessible to data_manager, monitor, investigator, sponsor_admin, mentor.
const QUERY_ROLES = [
  'mentor', 'sponsor_admin', 'investigator',
  'data_manager', 'monitor',
];

const SEVERITY_COLORS: Record<string, string> = {
  minor: 'bg-yellow-100 text-yellow-800',
  major: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  answered: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-700',
};

export default function QueriesPage() {
  const { userRole } = useSession();
  const { currentStudyId } = useStudy();
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [answerText, setAnswerText] = useState<Record<number, string>>({});

  const canRaiseQuery = QUERY_ROLES.includes(userRole);

  const loadQueries = useCallback(async () => {
    if (!currentStudyId) return;
    setLoading(true);
    const res = await fetch(`/api/queries?studyId=${currentStudyId}`);
    if (res.ok) setQueries(await res.json());
    setLoading(false);
  }, [currentStudyId]);

  useEffect(() => { loadQueries(); }, [loadQueries]);

  if (!canRaiseQuery) {
    return <p className="p-6 text-gray-500">You do not have access to query management.</p>;
  }

  const advance = async (id: number, status: string) => {
    const body: Record<string, string> = { status };
    if (status === 'answered' && answerText[id]) body.answerText = answerText[id];
    await fetch(`/api/queries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    loadQueries();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Query Management</h1>
      <p className="text-sm text-gray-500">
        Queries are raised against specific data fields. Each query must be answered by site staff and
        resolved by the monitor before the study can be locked. (ICH E6(R3) CAP-04)
      </p>

      {!currentStudyId && (
        <p className="text-sm text-gray-400">No study selected.</p>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && queries.length === 0 && currentStudyId && (
        <p className="text-sm text-gray-400">No queries for this study.</p>
      )}

      <div className="space-y-3">
        {queries.map((q) => (
          <div key={q.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium text-sm text-gray-900">
                {q.record_table} / {q.record_id} — <span className="font-mono">{q.field_name}</span>
              </span>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[q.severity] ?? ''}`}>
                  {q.severity}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[q.status] ?? ''}`}>
                  {q.status}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-700">{q.query_text}</p>

            {q.answer_text && (
              <p className="text-sm text-blue-800 bg-blue-50 rounded p-2">
                <span className="font-medium">Answer:</span> {q.answer_text}
              </p>
            )}

            <div className="flex gap-2 flex-wrap items-end">
              {q.status === 'open' && (
                <>
                  <input
                    type="text"
                    placeholder="Answer text…"
                    value={answerText[q.id] ?? ''}
                    onChange={(e) => setAnswerText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => advance(q.id, 'answered')}
                    disabled={!answerText[q.id]}
                    className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Answer
                  </button>
                </>
              )}
              {q.status === 'answered' && (
                <button
                  onClick={() => advance(q.id, 'resolved')}
                  className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Resolve
                </button>
              )}
              {q.status === 'resolved' && (
                <button
                  onClick={() => advance(q.id, 'closed')}
                  className="px-3 py-1 text-sm rounded bg-gray-500 text-white hover:bg-gray-600"
                >
                  Close
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400">
              Raised {new Date(q.raised_at).toUTCString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
