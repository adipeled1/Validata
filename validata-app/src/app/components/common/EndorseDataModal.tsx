'use client';
import { useState } from 'react';

interface Props {
  studyId: string;
  signerEmail: string;
  onClose: () => void;
  onSuccess: (signedAt: string) => void;
}

const MEANING =
  'By entering my credentials and clicking "Sign", I confirm that the data presented in this analysis ' +
  'is accurate, complete, and ready for use in the study report. This constitutes a legally binding ' +
  'electronic signature in accordance with ICH E6(R3) section 4.9.';

// Modal that re-authenticates the user (ICH E6(R3) SIG-01) then submits an
// electronic signature for the current study's analysis data (SIG-02, SIG-03).
export default function EndorseDataModal({ studyId, signerEmail, onClose, onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSign = async () => {
    setError(null);
    setLoading(true);

    // Step 1: verify credentials
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Endorse Study Data</h2>

        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded p-3">{MEANING}</p>

        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
          This creates a permanent, timestamped audit record only — it does not lock the study or notify
          anyone. Data can still be edited afterward. Use Study Lock Control separately if you need to
          prevent further changes.
        </p>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700" htmlFor="endorse-email">
            Email
          </label>
          <input
            id="endorse-email"
            type="email"
            value={signerEmail}
            readOnly
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700" htmlFor="endorse-password">
            Password
          </label>
          <input
            id="endorse-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password to confirm"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && !loading && password && handleSign()}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={loading || !password}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing…' : 'Sign'}
          </button>
        </div>
      </div>
    </div>
  );
}
