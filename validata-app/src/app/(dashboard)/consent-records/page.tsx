"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import { READABLE_ROLES, EDIT_ROLES, CONSENT_VERSION_ROLES, hasRole } from '../../../lib/permissions';
import * as clientDemoStore from '../../../lib/clientDemoStore';
import ConsentForm, { type ConsentFormValues } from '../../components/Consent/ConsentForm';
import { createConsentRecord, fetchConsent } from '../../components/Consent/service';

interface ConsentFormVersion {
  id: number;
  version: string;
  irb_approved_at: string | null;
  activated_at: string | null;
  content_hash: string | null;
}

interface ConsentRecord {
  id: string;
  participant_id: string;
  form_version_id: number;
  method: string;
  copy_delivered: boolean;
  witnessed_by: string | null;
  notes: string | null;
  created_at: string;
}

const METHOD_LABELS: Record<string, string> = {
  written: 'Written',
  electronic: 'Electronic',
  verbal_with_witness: 'Verbal + Witness',
};

export default function ConsentRecordsPage() {
  const { userRole, isDemoMode, currentUserEmail } = useSession();
  const { currentStudyId, participants } = useStudy();

  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // New record form state - shape matches ConsentFormValues since this is
  // now rendered via the shared <ConsentForm />.
  const [newRecord, setNewRecord] = useState<ConsentFormValues>({
    participantId: '',
    formVersionId: '',
    method: 'written',
    copyDelivered: false,
    witnessedBy: '',
    notes: '',
  });

  // New version form state
  const [newVersion, setNewVersion] = useState({
    version: '',
    irbApprovedAt: '',
    contentHash: '',
  });

  const swrKey = currentStudyId ? `consent:${currentStudyId}` : null;
  const { data, isLoading: loading, error: swrError, mutate: mutateConsent } = useSWR(
    swrKey,
    () => fetchConsent(currentStudyId!, isDemoMode)
  );
  const versions = data?.versions ?? [];
  const records = data?.records ?? [];
  const error = actionError ?? (swrError ? (swrError as Error).message : null);

  // Auto-select the first version once data arrives, if nothing selected yet.
  useEffect(() => {
    if (!selectedVersionId && versions.length > 0) {
      setSelectedVersionId(versions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions]);

  const visibleRecords = selectedVersionId
    ? records.filter(r => r.form_version_id === selectedVersionId)
    : records;

  const handleCreateRecord = async () => {
    if (!currentStudyId || !newRecord.formVersionId) return;
    setSaving(true);
    setActionError(null);
    try {
      await createConsentRecord({
        studyId: currentStudyId,
        participantId: newRecord.participantId,
        formVersionId: newRecord.formVersionId,
        method: newRecord.method,
        copyDelivered: newRecord.copyDelivered,
        witnessedBy: newRecord.witnessedBy || undefined,
        notes: newRecord.notes || undefined,
        isDemoMode,
        currentUserEmail,
      });
      setShowNewRecord(false);
      setNewRecord({ participantId: '', formVersionId: '', method: 'written', copyDelivered: false, witnessedBy: '', notes: '' });
      mutateConsent();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!currentStudyId) return;
    setSaving(true);
    setActionError(null);
    try {
      if (isDemoMode) {
        clientDemoStore.addConsentVersion({
          studyId: currentStudyId,
          version: newVersion.version,
          irbApprovedAt: newVersion.irbApprovedAt || undefined,
          contentHash: newVersion.contentHash || undefined,
          actorEmail: currentUserEmail,
        });
      } else {
        const res = await fetch('/api/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // The route switches on `action === 'create_version'`, not `type` -
            // sending the wrong key hits the same "Unknown action." 400 branch.
            action: 'create_version',
            studyId: currentStudyId,
            version: newVersion.version,
            irbApprovedAt: newVersion.irbApprovedAt || undefined,
            contentHash: newVersion.contentHash || undefined,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      }
      setShowNewVersion(false);
      setNewVersion({ version: '', irbApprovedAt: '', contentHash: '' });
      mutateConsent();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!hasRole(userRole, READABLE_ROLES)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>
        You do not have access to consent records.
      </div>
    );
  }

  // Consent FORM VERSIONING (protocol-level document control) is a narrower
  // capability than recording an individual participant's consent, so these
  // are checked separately - a single shared `canEdit` flag would show the
  // "+ New Version" button (mentor/admin-only per the API/RLS) to
  // investigators/site_coordinators, who'd then hit a 403 on submit.
  const canCreateVersion = hasRole(userRole, CONSENT_VERSION_ROLES);
  const canRecordConsent = hasRole(userRole, EDIT_ROLES);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Header */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          COMPLIANCE / Consent Records
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Consent Records
          </h1>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid #dc2626', padding: '8px 12px', fontSize: 'var(--font-size-md)', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Two-pane layout */}
      <div style={{ display: 'flex', flex: 1, gap: '0', minHeight: 0, border: '1px solid var(--border)' }}>
        {/* Left: Version list */}
        <div style={{ width: '200px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)', flexShrink: 0
          }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Form Versions
            </span>
            {canCreateVersion && (
              <button
                onClick={() => setShowNewVersion(v => !v)}
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent-soft)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
              >
                + New
              </button>
            )}
          </div>

          {showNewVersion && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-editor)' }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>New Version</div>
              <input
                placeholder="Version (e.g. v3.1)"
                value={newVersion.version}
                onChange={e => setNewVersion(p => ({ ...p, version: e.target.value }))}
                style={inputStyle}
              />
              <input
                type="date"
                placeholder="IRB Approved Date"
                value={newVersion.irbApprovedAt}
                onChange={e => setNewVersion(p => ({ ...p, irbApprovedAt: e.target.value }))}
                style={{ ...inputStyle, marginTop: '4px' }}
              />
              <input
                placeholder="Content hash (optional)"
                value={newVersion.contentHash}
                onChange={e => setNewVersion(p => ({ ...p, contentHash: e.target.value }))}
                style={{ ...inputStyle, marginTop: '4px' }}
              />
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                <button onClick={handleCreateVersion} disabled={saving || !newVersion.version} style={btnPrimary}>
                  {saving ? '…' : 'Save'}
                </button>
                <button onClick={() => setShowNewVersion(false)} style={btnSecondary}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '12px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Loading…</div>
            ) : versions.length === 0 ? (
              <div style={{ padding: '12px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                {isDemoMode ? 'No form versions (demo mode)' : 'No form versions yet.'}
              </div>
            ) : (
              versions.map(v => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVersionId(v.id)}
                  style={{
                    padding: '8px 10px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: selectedVersionId === v.id ? 'rgba(124,58,237,0.12)' : 'transparent',
                    borderLeft: selectedVersionId === v.id ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: selectedVersionId === v.id ? 'var(--accent-soft)' : 'var(--text-primary)' }}>
                    {v.version}
                  </div>
                  {v.irb_approved_at && (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                      IRB: {v.irb_approved_at.split('T')[0]}
                    </div>
                  )}
                  {v.content_hash && (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
                      {v.content_hash.slice(0, 8)}…
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Records table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)', flexShrink: 0
          }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Consent Records {selectedVersionId ? `— ${versions.find(v => v.id === selectedVersionId)?.version ?? ''}` : ''}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>({visibleRecords.length})</span>
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {canRecordConsent && versions.length > 0 && (
                <button
                  onClick={() => {
                    // Pre-fill from whichever version is selected in the
                    // left pane, but the form's own Form Version field lets
                    // this be changed before saving.
                    setNewRecord(p => ({ ...p, formVersionId: selectedVersionId ?? '' }));
                    setShowNewRecord(r => !r);
                  }}
                  style={{ fontSize: 'var(--font-size-sm)', padding: '3px 8px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  + New Record
                </button>
              )}
            </div>
          </div>

          {/* New record panel - same shared ConsentForm the Participants
              view uses (see ConsentForm.tsx), just triggered from here
              instead of a participant row. */}
          {showNewRecord && (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-editor)', maxWidth: '320px' }}>
              <ConsentForm
                versions={versions}
                participants={participants}
                form={newRecord}
                onChange={(field, value) => setNewRecord(p => ({ ...p, [field]: value }))}
                onSubmit={handleCreateRecord}
                onCancel={() => setShowNewRecord(false)}
                saving={saving}
                error={actionError}
              />
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-md)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 1 }}>
                  {['Participant', 'Method', 'Date (UTC)', 'Witnessed By', 'Copy Delivered'].map(col => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading…</td></tr>
                ) : visibleRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {selectedVersionId ? 'No consent records for this version.' : 'Select a form version to view records.'}
                    </td>
                  </tr>
                ) : visibleRecords.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-surface)', height: 'var(--row-height)' }}>
                    <td style={tdStyle}>{r.participant_id}</td>
                    <td style={tdStyle}>{METHOD_LABELS[r.method] ?? r.method}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-data)' }}>{r.created_at ? new Date(r.created_at).toUTCString() : '—'}</td>
                    <td style={tdStyle}>{r.witnessed_by ?? '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ color: r.copy_delivered ? 'var(--status-active)' : 'var(--text-muted)' }}>
                        {r.copy_delivered ? '✓' : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  padding: '4px 6px',
  background: 'var(--bg-editor)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '2px',
};

const btnPrimary: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 600,
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 'var(--font-size-sm)',
  background: 'var(--bg-surface)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0 8px',
  height: 'var(--row-height)',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '200px',
};
