"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';

const COMPLIANCE_ROLES = ['monitor', 'auditor', 'admin', 'mentor', 'investigator', 'site_coordinator', 'data_manager', 'irb_reviewer'];
const CREATE_ROLES = ['admin', 'mentor', 'investigator', 'site_coordinator', 'data_manager'];

interface AdverseEvent {
  id: string;
  ae_type: 'ae' | 'sae' | 'susar';
  description: string;
  severity: string;
  causality: string;
  expectedness: string;
  report_date: string;
  onset_date: string | null;
  authority_deadline: string | null;
  authority_submitted_at: string | null;
  resolution_date: string | null;
  outcome: string | null;
  participant_id: string;
  created_at: string;
}

const SEVERITY_LABELS: Record<string, string> = {
  mild: 'Mild', moderate: 'Moderate', severe: 'Severe',
  life_threatening: 'Life-Threatening', fatal: 'Fatal',
};

const CAUSALITY_LABELS: Record<string, string> = {
  unrelated: 'Unrelated', unlikely: 'Unlikely', possible: 'Possible',
  probable: 'Probable', definite: 'Definite',
};

const BANDS = [
  { key: 'susar', label: 'SUSAR', types: ['susar'], borderColor: 'var(--color-error)' },
  { key: 'sae', label: 'SAE — Serious Adverse Events', types: ['sae'], borderColor: 'var(--color-warning)' },
  { key: 'ae', label: 'AE — Non-Serious Adverse Events', types: ['ae'], borderColor: 'var(--border)' },
];

function deadlineStatus(deadline: string | null): 'red' | 'yellow' | null {
  if (!deadline) return null;
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  const diff = dl - now;
  if (diff < 48 * 60 * 60 * 1000) return 'red';
  if (diff < 7 * 24 * 60 * 60 * 1000) return 'yellow';
  return null;
}

const EMPTY_FORM = {
  aeType: 'ae' as 'ae' | 'sae' | 'susar',
  participantId: '',
  description: '',
  severity: 'mild' as 'mild' | 'moderate' | 'severe' | 'life_threatening' | 'fatal',
  causality: 'possible' as 'unrelated' | 'unlikely' | 'possible' | 'probable' | 'definite',
  expectedness: 'unexpected' as 'expected' | 'unexpected',
  reportDate: new Date().toISOString().split('T')[0],
  onsetDate: '',
  notes: '',
};

export default function AdverseEventsPage() {
  const { userRole, isDemoMode } = useSession();
  const { currentStudyId, participants } = useStudy();

  const [events, setEvents] = useState<AdverseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = CREATE_ROLES.includes(userRole);

  const load = useCallback(async () => {
    if (!currentStudyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/adverse-events?studyId=${currentStudyId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentStudyId]);

  useEffect(() => { load(); }, [load]);

  const toggleBand = (key: string) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  const handleCreate = async () => {
    if (!currentStudyId || !form.participantId || !form.description) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/adverse-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyId: currentStudyId,
          participantId: form.participantId,
          aeType: form.aeType,
          description: form.description,
          severity: form.severity,
          causality: form.causality,
          expectedness: form.expectedness,
          reportDate: form.reportDate,
          onsetDate: form.onsetDate || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create adverse event.');
      setShowPanel(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkSubmitted = async (id: string) => {
    try {
      await fetch(`/api/adverse-events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authoritySubmittedAt: new Date().toISOString() }),
      });
      load();
    } catch {
      // ignore
    }
  };

  if (!COMPLIANCE_ROLES.includes(userRole)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
        You do not have access to adverse events.
      </div>
    );
  }

  const exportCsv = () => {
    const rows = events.map(e => [
      e.id, e.ae_type.toUpperCase(), e.severity, e.causality, e.expectedness,
      e.report_date, e.authority_deadline ?? '', e.authority_submitted_at ? 'Yes' : 'No',
    ]);
    const csv = [
      ['ID', 'Type', 'Severity', 'Causality', 'Expectedness', 'Report Date', 'Deadline', 'Submitted'],
      ...rows,
    ].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adverse-events-${currentStudyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            COMPLIANCE / Adverse Events
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Adverse Events / SAE
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={exportCsv} style={btnSecondary}>Export CSV</button>
          {canCreate && (
            <button
              onClick={() => setShowPanel(v => !v)}
              style={{ ...btnSecondary, color: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              {showPanel ? 'Cancel' : '+ New Adverse Event'}
            </button>
          )}
        </div>
      </div>

      {/* Create Panel */}
      {showPanel && (
        <div style={{
          flexShrink: 0, border: '1px solid var(--accent)', background: 'var(--bg-surface)',
          padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            New Adverse Event
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <label style={labelStyle}>
              Type
              <select value={form.aeType} onChange={e => setForm(f => ({ ...f, aeType: e.target.value as typeof form.aeType }))} style={inputStyle}>
                <option value="ae">AE — Adverse Event</option>
                <option value="sae">SAE — Serious Adverse Event</option>
                <option value="susar">SUSAR</option>
              </select>
            </label>
            <label style={labelStyle}>
              Participant *
              <select value={form.participantId} onChange={e => setForm(f => ({ ...f, participantId: e.target.value }))} style={inputStyle}>
                <option value="">— Select participant —</option>
                {(participants ?? []).map(p => (
                  <option key={p.id} value={p.id}>{p.pid ?? p.id}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              Report Date *
              <input type="date" value={form.reportDate} onChange={e => setForm(f => ({ ...f, reportDate: e.target.value }))} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Severity
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as typeof form.severity }))} style={inputStyle}>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="life_threatening">Life-Threatening</option>
                <option value="fatal">Fatal</option>
              </select>
            </label>
            <label style={labelStyle}>
              Causality
              <select value={form.causality} onChange={e => setForm(f => ({ ...f, causality: e.target.value as typeof form.causality }))} style={inputStyle}>
                <option value="unrelated">Unrelated</option>
                <option value="unlikely">Unlikely</option>
                <option value="possible">Possible</option>
                <option value="probable">Probable</option>
                <option value="definite">Definite</option>
              </select>
            </label>
            <label style={labelStyle}>
              Expectedness
              <select value={form.expectedness} onChange={e => setForm(f => ({ ...f, expectedness: e.target.value as typeof form.expectedness }))} style={inputStyle}>
                <option value="unexpected">Unexpected</option>
                <option value="expected">Expected</option>
              </select>
            </label>
            <label style={labelStyle}>
              Onset Date
              <input type="date" value={form.onsetDate} onChange={e => setForm(f => ({ ...f, onsetDate: e.target.value }))} style={inputStyle} />
            </label>
          </div>
          <label style={labelStyle}>
            Description *
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
              placeholder="Describe the adverse event…"
            />
          </label>
          <label style={labelStyle}>
            Notes
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
              placeholder="Optional additional notes…"
            />
          </label>
          {formError && (
            <div style={{ fontSize: '11px', color: '#dc2626' }}>{formError}</div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCreate}
              disabled={saving || !form.participantId || !form.description}
              style={{ ...btnSecondary, color: 'var(--accent)', borderColor: 'var(--accent)', opacity: (saving || !form.participantId || !form.description) ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : 'Save Adverse Event'}
            </button>
            <button onClick={() => { setShowPanel(false); setForm(EMPTY_FORM); setFormError(null); }} style={btnSecondary}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid var(--color-error)', padding: '8px 12px', fontSize: '12px', color: 'var(--color-error)', flexShrink: 0 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>Loading…</div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {BANDS.map(band => {
            const bandEvents = events.filter(e => band.types.includes(e.ae_type));
            const isCollapsed = collapsed[band.key];
            return (
              <div key={band.key} style={{ border: '1px solid var(--border)', marginBottom: '1px' }}>
                {/* Band header */}
                <div
                  onClick={() => toggleBand(band.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 10px', cursor: 'pointer',
                    background: 'var(--bg-surface)',
                    borderLeft: `3px solid ${band.borderColor}`,
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{isCollapsed ? '▶' : '▼'}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {band.label}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '1px 5px',
                    background: bandEvents.length > 0 ? `${band.borderColor}22` : 'transparent',
                    color: bandEvents.length > 0 ? band.borderColor : 'var(--text-muted)',
                    border: `1px solid ${bandEvents.length > 0 ? band.borderColor : 'var(--border)'}`,
                  }}>
                    {bandEvents.length}
                  </span>
                </div>

                {!isCollapsed && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-editor)' }}>
                        {['AE ID', 'Participant', 'Severity', 'Causality', 'Expectedness', 'Reported', 'Deadline', 'Submitted'].map(col => (
                          <th key={col} style={thStyle}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bandEvents.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '11px' }}>
                            {isDemoMode ? `No ${band.label} events (demo mode)` : `No ${band.label} events recorded.`}
                          </td>
                        </tr>
                      ) : bandEvents.map((e, i) => {
                        const dlStatus = deadlineStatus(e.authority_deadline);
                        return (
                          <tr key={e.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-surface)', height: 'var(--row-height)' }}>
                            <td style={{ ...tdStyle, fontFamily: 'var(--font-data)', fontSize: '11px' }}>{e.id.slice(0, 8)}</td>
                            <td style={tdStyle}>{e.participant_id}</td>
                            <td style={{ ...tdStyle, color: severityColor(e.severity) }}>{SEVERITY_LABELS[e.severity] ?? e.severity}</td>
                            <td style={tdStyle}>{CAUSALITY_LABELS[e.causality] ?? e.causality}</td>
                            <td style={tdStyle}>{e.expectedness}</td>
                            <td style={{ ...tdStyle, fontFamily: 'var(--font-data)', fontSize: '11px' }}>{e.report_date}</td>
                            <td style={{
                              ...tdStyle, fontFamily: 'var(--font-data)', fontSize: '11px',
                              color: dlStatus === 'red' ? 'var(--color-error)' : dlStatus === 'yellow' ? 'var(--color-warning)' : 'var(--text-primary)',
                              fontWeight: dlStatus ? 600 : 400,
                            }}>
                              {e.authority_deadline ?? '—'}
                              {dlStatus === 'red' && ' ⚠'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              {e.authority_submitted_at ? (
                                <span style={{ color: 'var(--status-active)' }}>✓</span>
                              ) : canCreate ? (
                                <button
                                  onClick={() => handleMarkSubmitted(e.id)}
                                  title="Mark as submitted to authority"
                                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px', padding: '1px 6px' }}
                                >
                                  Mark
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'fatal': return 'var(--status-fatal)';
    case 'life_threatening': return 'var(--status-fatal)';
    case 'severe': return 'var(--status-severe)';
    case 'moderate': return 'var(--status-moderate)';
    default: return 'var(--text-primary)';
  }
}

const btnSecondary: React.CSSProperties = {
  padding: '4px 10px', fontSize: '11px',
  background: 'var(--bg-surface)', color: 'var(--text-secondary)',
  border: '1px solid var(--border)', cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  padding: '5px 8px', textAlign: 'left',
  fontSize: '10px', fontWeight: 600,
  color: 'var(--text-secondary)', textTransform: 'uppercase',
  letterSpacing: '0.06em', borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0 8px', height: 'var(--row-height)',
  color: 'var(--text-primary)', borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px',
};

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '3px',
  fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-secondary)',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', fontSize: '12px', padding: '4px 8px',
  fontFamily: 'var(--font-ui)', outline: 'none', width: '100%',
};
