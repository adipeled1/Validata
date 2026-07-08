"use client";

export interface DelegationFormValues {
  delegatedTo: string;
  taskDescription: string;
  effectiveFrom: string;
  effectiveTo: string;
}

interface RosterEntry {
  id: string;
  email: string;
  role: string;
}

interface DelegationFormProps {
  roster: RosterEntry[];
  form: DelegationFormValues;
  onChange: (field: keyof DelegationFormValues, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  error?: string | null;
}

// Shared by the Delegation Log page's side panel and the Study Overview
// "Delegated by Me" card's inline expand, so the two "New Delegation" entry
// points always render the same fields, labels, and helper copy.
export default function DelegationForm({ roster, form, onChange, onSubmit, onCancel, saving, error }: DelegationFormProps) {
  const canSubmit = !saving && !!form.delegatedTo && !!form.taskDescription && !!form.effectiveFrom;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid #dc2626', padding: '6px 10px', fontSize: 'var(--font-size-sm)', color: '#dc2626' }}>
          {error}
        </div>
      )}
      <div>
        <div style={labelStyle}>Delegate To</div>
        <select
          value={form.delegatedTo}
          onChange={(e) => onChange('delegatedTo', e.target.value)}
          style={inputStyle}
        >
          <option value="">— Select user —</option>
          {roster.map((p) => (
            <option key={p.id} value={p.id}>
              {p.email} ({p.role.replace(/_/g, ' ')})
            </option>
          ))}
        </select>
      </div>
      <div>
        <div style={labelStyle}>Task / Duties</div>
        <textarea
          placeholder="Describe the delegated task or duties…"
          value={form.taskDescription}
          onChange={(e) => onChange('taskDescription', e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
        />
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
          This documents what the delegate is authorized to do — it does not change their account permissions in the system.
        </div>
      </div>
      <div>
        <div style={labelStyle}>Effective From</div>
        <input type="date" value={form.effectiveFrom} onChange={(e) => onChange('effectiveFrom', e.target.value)} style={inputStyle} />
      </div>
      <div>
        <div style={labelStyle}>Effective To (optional)</div>
        <input type="date" value={form.effectiveTo} onChange={(e) => onChange('effectiveTo', e.target.value)} style={inputStyle} />
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
          {saving ? 'Saving…' : 'Save Delegation'}
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
