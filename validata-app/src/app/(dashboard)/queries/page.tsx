"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import { QUERY_MUTATE_ROLES, hasRole } from '../../../lib/permissions';

// fable_system_review §3.2: standardized on SWR (shared cache, no bespoke
// per-page fetch/loading/error triplet) instead of a bare useEffect fetch.
async function fetchQueries(studyId: string) {
  const res = await fetch(`/api/queries?studyId=${studyId}`);
  if (!res.ok) throw new Error('Failed to load queries.');
  return res.json();
}

const SEVERITY_COLOR: Record<string, string> = {
  minor: 'var(--status-pending)',
  major: 'var(--status-warning)',
  critical: 'var(--status-dropped)',
};
const STATUS_COLOR: Record<string, string> = {
  open: 'var(--status-dropped)',
  answered: 'var(--accent-soft)',
  resolved: 'var(--status-active)',
  closed: 'var(--text-muted)',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  fontSize: 'var(--font-size-md)',
  padding: '5px 8px',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  flex: 1,
  minWidth: 0,
};

export default function QueriesPage() {
  const { userRole } = useSession();
  const { currentStudyId } = useStudy();
  const [answerText, setAnswerText] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuery, setSelectedQuery] = useState<any | null>(null);

  const canRaiseQuery = hasRole(userRole, QUERY_MUTATE_ROLES);

  const swrKey = currentStudyId ? `queries:${currentStudyId}` : null;
  const { data: queries = [], isLoading: loading, mutate: mutateQueries } = useSWR(
    swrKey,
    () => fetchQueries(currentStudyId!)
  );

  if (!canRaiseQuery) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>
        You do not have access to query management.
      </div>
    );
  }

  const advance = async (id: number, status: string) => {
    const body: Record<string, string> = { status };
    if (status === 'answered' && answerText[id]) body.answerText = answerText[id];
    await fetch(`/api/queries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    mutateQueries();
    if (selectedQuery?.id === id) {
      setSelectedQuery((prev: any) => prev ? { ...prev, status } : null);
    }
  };

  const filterCounts = {
    all: queries.length,
    open: queries.filter((q) => q.status === 'open').length,
    answered: queries.filter((q) => q.status === 'answered').length,
    resolved: queries.filter((q) => q.status === 'resolved').length,
    closed: queries.filter((q) => q.status === 'closed').length,
  };

  const filteredQueries =
    statusFilter === 'all' ? queries : queries.filter((q) => q.status === statusFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          QUERY MANAGEMENT
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Queries
        </h1>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Queries are raised against specific data fields. Each query must be answered by site staff and resolved by the monitor before the study can be locked. (ICH E6(R3) CAP-04)
        </div>
      </div>

      {!currentStudyId && (
        <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>No study selected.</div>
      )}

      {/* Three-pane layout */}
      <div style={{ display: 'flex', gap: '0', border: '1px solid var(--border)', height: '600px', overflow: 'hidden' }}>
        {/* Left: filter tree (180px) */}
        <div style={{ width: '180px', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-sidebar)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 10px 4px', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Filter
          </div>
          {(['all', 'open', 'answered', 'resolved', 'closed'] as const).map((s) => {
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  width: '100%',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  fontSize: 'var(--font-size-base)',
                  background: isActive ? 'var(--bg-selection)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                <span>{s}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '0 4px', borderRadius: '2px' }}>
                  {filterCounts[s]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center: query list */}
        <div style={{ flex: 1, overflow: 'auto', borderRight: '1px solid var(--border)' }}>
          {loading && <div style={{ padding: '12px', fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>Loading…</div>}
          {!loading && filteredQueries.length === 0 && (
            <div style={{ padding: '12px', fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>No queries in this filter.</div>
          )}
          {filteredQueries.map((q, i) => {
            const isSelected = selectedQuery?.id === q.id;
            return (
              <div
                key={q.id}
                onClick={() => setSelectedQuery(q)}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border)',
                  background: isSelected ? 'var(--bg-selection)' : i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                  cursor: 'pointer',
                  borderLeft: `3px solid ${SEVERITY_COLOR[q.severity] ?? 'transparent'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--font-size-sm)', color: 'var(--text-id)' }}>
                    Q-{String(q.id).padStart(3, '0')}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: STATUS_COLOR[q.status] ?? 'var(--text-muted)', fontWeight: 600 }}>
                    {q.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {q.record_table} / {q.record_id} — <span style={{ fontFamily: 'var(--font-data)' }}>{q.field_name}</span>
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {q.query_text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: query detail panel */}
        <div style={{ width: '320px', flexShrink: 0, background: 'var(--bg-panel)', overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!selectedQuery ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-md)', marginTop: '24px', textAlign: 'center' }}>
              Select a query to view details.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-id)', fontFamily: 'var(--font-data)' }}>
                Q-{String(selectedQuery.id).padStart(3, '0')}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Record</span><br />
                {selectedQuery.record_table} / {selectedQuery.record_id} — {selectedQuery.field_name}
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Query</div>
                <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {selectedQuery.query_text}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: SEVERITY_COLOR[selectedQuery.severity] ?? 'var(--text-muted)' }}>
                  {selectedQuery.severity}
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: STATUS_COLOR[selectedQuery.status] ?? 'var(--text-muted)' }}>
                  {selectedQuery.status}
                </span>
              </div>
              {selectedQuery.answer_text && (
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Answer</div>
                  <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--accent-soft)', lineHeight: 1.5, background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '6px 8px' }}>
                    {selectedQuery.answer_text}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                Raised {new Date(selectedQuery.raised_at).toUTCString()}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                {selectedQuery.status === 'open' && (
                  <>
                    <input
                      type="text"
                      placeholder="Answer text…"
                      value={answerText[selectedQuery.id] ?? ''}
                      onChange={(e) => setAnswerText((prev) => ({ ...prev, [selectedQuery.id]: e.target.value }))}
                      style={inputStyle}
                    />
                    <button
                      onClick={() => advance(selectedQuery.id, 'answered')}
                      disabled={!answerText[selectedQuery.id]}
                      style={{
                        padding: '5px 12px',
                        background: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        fontSize: 'var(--font-size-md)',
                        cursor: 'pointer',
                        opacity: answerText[selectedQuery.id] ? 1 : 0.5,
                      }}
                    >
                      Answer
                    </button>
                  </>
                )}
                {selectedQuery.status === 'answered' && (
                  <button
                    onClick={() => advance(selectedQuery.id, 'resolved')}
                    style={{ padding: '5px 12px', background: 'var(--status-active)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontSize: 'var(--font-size-md)', cursor: 'pointer' }}
                  >
                    Resolve
                  </button>
                )}
                {selectedQuery.status === 'resolved' && (
                  <button
                    onClick={() => advance(selectedQuery.id, 'closed')}
                    style={{ padding: '5px 12px', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 'var(--font-size-md)', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
