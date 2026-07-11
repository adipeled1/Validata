'use client';
import { useState } from 'react';
import * as clientDemoStore from '../../../lib/clientDemoStore';

interface Props {
  studyId: string;
  signerEmail: string;
  isDemoMode?: boolean;
  onClose: () => void;
  onSuccess: (signedAt: string) => void;
}

const MEANING =
  'By entering my credentials and clicking "Sign", I confirm that the data presented in this analysis ' +
  'is accurate, complete, and ready for use in the study report. This constitutes a legally binding ' +
  'electronic signature.';

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
  alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  width: '100%', maxWidth: '440px', padding: '20px', display: 'flex',
  flexDirection: 'column', gap: '14px',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-editor)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', padding: '6px 8px', fontSize: 'var(--font-size-md)',
};

const btnBase: React.CSSProperties = {
  padding: '6px 14px', fontSize: 'var(--font-size-md)', fontWeight: 600, border: '1px solid var(--border)',
  cursor: 'pointer', background: 'transparent', color: 'var(--text-secondary)',
};

// Modal that re-authenticates the user (ICH E6(R3) SIG-01) then submits an
// electronic signature for the current study's analysis data (SIG-02, SIG-03).
// Styled with the same dark, inline-style "IDE" idiom used everywhere else
// in the app, rather than Tailwind utility classes in a light theme.
export default function EndorseDataModal({ studyId, signerEmail, isDemoMode, onClose, onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSign = async () => {
    setError(null);
    setLoading(true);

    // Demo mode has no real credentials to re-authenticate against, and no
    // server to persist the signature on (see clientDemoStore.ts) - skip
    // both network calls and record the endorsement directly in this
    // browser's session-scoped store instead.
    if (isDemoMode) {
      const sig = clientDemoStore.addSignature({
        studyId,
        signerEmail,
        recordType: 'study',
        recordId: studyId,
        milestone: 'data_lock',
        meaning: MEANING,
      });
      setLoading(false);
      onSuccess(sig.signed_at);
      return;
    }

    // Step 1: verify credentials, receiving a short-lived signing token that
    // binds this re-authentication to the signature request below.
    const verifyRes = await fetch('/api/auth/verify-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signerEmail, password }),
    });
    if (!verifyRes.ok) {
      const data = await verifyRes.json();
      setError(data.error ?? 'Invalid credentials.');
      setLoading(false);
      return;
    }
    const { signingToken } = await verifyRes.json();

    // Step 2: record the signature
    const sigRes = await fetch('/api/signatures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studyId,
        recordType: 'study',
        recordId: studyId,
        milestone: 'data_lock',
        meaning: MEANING,
        signingToken,
      }),
    });
    if (!sigRes.ok) {
      const data = await sigRes.json();
      setError(data.error ?? 'Signature failed. Please try again.');
      setLoading(false);
      return;
    }

    const sig = await sigRes.json();
    setLoading(false);
    onSuccess(sig.signed_at);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Endorse Study Data
        </h2>

        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', background: 'var(--bg-editor)', border: '1px solid var(--border)', padding: '8px 10px', margin: 0 }}>
          {MEANING}
        </p>

        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '6px 8px', margin: 0 }}>
          This creates a permanent, timestamped audit record only — it does not lock the study or notify
          anyone. Data can still be edited afterward. Use Study Lock Control separately if you need to
          prevent further changes.
        </p>

        <div>
          <label style={labelStyle} htmlFor="endorse-email">Email</label>
          <input
            id="endorse-email"
            type="email"
            value={signerEmail}
            readOnly
            style={{ ...inputStyle, color: 'var(--text-muted)', cursor: 'default' }}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="endorse-password">Password</label>
          <input
            id="endorse-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password to confirm"
            style={inputStyle}
            onKeyDown={(e) => e.key === 'Enter' && !loading && password && handleSign()}
          />
        </div>

        {error && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button onClick={onClose} disabled={loading} style={{ ...btnBase, opacity: loading ? 0.5 : 1 }}>
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={loading || !password}
            style={{
              ...btnBase, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)',
              opacity: loading || !password ? 0.5 : 1,
            }}
          >
            {loading ? 'Signing…' : 'Sign'}
          </button>
        </div>
      </div>
    </div>
  );
}
