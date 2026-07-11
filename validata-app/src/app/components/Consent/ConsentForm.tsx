"use client";

export interface ConsentFormValues {
  participantId: string;
  formVersionId: number | '';
  method: string;
  witnessedBy: string;
  copyDelivered: boolean;
  notes: string;
}

interface VersionEntry {
  id: number;
  version: string;
}

interface ParticipantEntry {
  id: string;
}

interface ConsentFormProps {
  versions: VersionEntry[];
  participants: ParticipantEntry[];
  // When set, the Participant field is pre-filled and locked (the row this
  // form was opened from) instead of offering a picker - mirrors how this
  // form is reached from two different places with two different needs
  // (Consent Records: pick any participant; Participants view: already
  // looking at one).
  lockedParticipantId?: string;
  form: ConsentFormValues;
  onChange: (field: keyof ConsentFormValues, value: string | boolean | number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  error?: string | null;
}

// Shared by the Consent Records page's side panel and the Participants
// view's per-row "Record Consent" side panel, so the two entry points always
// render the same fields, labels, and behavior - the same relationship
// DelegationForm has to the Delegation Log page and Study Overview's
// "Delegated by Me" card (same component, same width, different trigger).
export default function ConsentForm({
  versions,
  participants,
  lockedParticipantId,
  form,
  onChange,
  onSubmit,
  onCancel,
  saving,
  error,
}: ConsentFormProps) {
  const canSubmit = !saving && !!form.participantId && !!form.formVersionId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid #dc2626', padding: '6px 10px', fontSize: 'var(--font-size-sm)', color: '#dc2626' }}>
          {error}
        </div>
      )}
      <div>
        <div style={labelStyle}>Participant</div>
        {lockedParticipantId ? (
          <input value={lockedParticipantId} disabled style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} />
        ) : (
          <select value={form.participantId} onChange={(e) => onChange('participantId', e.target.value)} style={inputStyle}>
            <option value="">— select —</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.id}</option>
            ))}
          </select>
        )}
      </div>
      <div>
        <div style={labelStyle}>Form Version</div>
        <select
          value={form.formVersionId}
          onChange={(e) => onChange('formVersionId', e.target.value ? Number(e.target.value) : '')}
          style={inputStyle}
          disabled={versions.length === 0}
        >
          <option value="">— select —</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>{v.version}</option>
          ))}
        </select>
        {versions.length === 0 && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
            No consent form versions exist yet — create one on the Consent Records screen first.
          </div>
        )}
      </div>
      <div>
        <div style={labelStyle}>Method</div>
        <select value={form.method} onChange={(e) => onChange('method', e.target.value)} style={inputStyle}>
          <option value="written">Written</option>
          <option value="electronic">Electronic</option>
          <option value="verbal_with_witness">Verbal + Witness</option>
        </select>
      </div>
      <div>
        <div style={labelStyle}>Witnessed By (optional)</div>
        <input
          placeholder="Name or email"
          value={form.witnessedBy}
          onChange={(e) => onChange('witnessedBy', e.target.value)}
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="checkbox"
          id="consentFormCopyDelivered"
          checked={form.copyDelivered}
          onChange={(e) => onChange('copyDelivered', e.target.checked)}
        />
        <label htmlFor="consentFormCopyDelivered" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          Copy Delivered
        </label>
      </div>
      <div>
        <div style={labelStyle}>Notes (optional)</div>
        <textarea
          placeholder="Additional notes…"
          value={form.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            flex: 1, padding: '6px', fontSize: 'var(--font-size-md)', fontWeight: 600,
            background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          {saving ? 'Saving…' : 'Save Consent'}
        </button>
        <button
          onClick={onCancel}
          style={{ padding: '6px 12px', fontSize: 'var(--font-size-md)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)', padding: '5px 7px',
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', outline: 'none', width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px',
};
