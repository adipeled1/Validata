import { useState } from 'react';

interface Props {
  title: string;
  body: string;
  reasonLabel: string;
  reasonRequired?: boolean;
  confirmLabel?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

// Modal that collects an optional (or required) reason before confirming a
// destructive action. Replaces window.confirm for ICH E6(R3) COR-01
// compliance — every correction or status change must capture a justification.
export default function ConfirmWithReasonModal({
  title,
  body,
  reasonLabel,
  reasonRequired = false,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: Props) {
  const [reason, setReason] = useState('');

  const canSubmit = !reasonRequired || reason.trim().length > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        padding: '20px 24px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {title}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
          {body}
        </p>

        <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>
          {reasonLabel}
          {reasonRequired && <span style={{ color: 'var(--status-dropped)', marginLeft: '4px' }}>*</span>}
        </label>
        <textarea
          rows={3}
          placeholder={reasonRequired ? 'Required' : 'Optional'}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            padding: '5px 8px',
            fontFamily: 'var(--font-ui)',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '5px 14px',
              fontSize: '12px',
              background: 'var(--bg-surface-hover)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              borderRadius: 'var(--radius)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onConfirm(reason.trim())}
            disabled={!canSubmit}
            style={{
              padding: '5px 14px',
              fontSize: '12px',
              background: canSubmit ? 'var(--status-dropped)' : 'var(--bg-surface-alt)',
              color: canSubmit ? '#fff' : 'var(--text-ghost)',
              border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
