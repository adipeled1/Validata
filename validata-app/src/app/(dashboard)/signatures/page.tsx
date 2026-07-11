"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import { Download } from 'lucide-react';
import { READABLE_ROLES, hasRole } from '../../../lib/permissions';
import * as clientDemoStore from '../../../lib/clientDemoStore';

const colHeaderStyle: React.CSSProperties = {
  padding: '0 10px 6px',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-col-header)',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const cellStyle: React.CSSProperties = {
  padding: '0 10px',
  height: '32px',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
};

interface Signature {
  id: number;
  signed_at: string;
  signer_email: string;
  record_type: string;
  record_id: string;
  milestone: string;
  meaning: string;
}

// Uses SWR (shared cache, request de-dupe) instead of a bare useEffect fetch.
async function fetchSignatures(studyId: string, isDemoMode: boolean): Promise<Signature[]> {
  if (isDemoMode) return clientDemoStore.getSignatures(studyId) as unknown as Signature[];
  const res = await fetch(`/api/signatures?studyId=${studyId}`);
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  return data ?? [];
}

export default function SignaturesPage() {
  const { userRole, isDemoMode } = useSession();
  const { currentStudyId } = useStudy();

  const swrKey = currentStudyId ? `signatures:${currentStudyId}` : null;
  const { data: signatures = [], isLoading: loading, error: swrError } = useSWR(
    swrKey,
    () => fetchSignatures(currentStudyId!, isDemoMode)
  );
  const error = swrError ? String(swrError) : '';

  const handleExportCSV = () => {
    const header = 'Signed At (UTC),Signer,Record Type,Record ID,Milestone,Meaning\n';
    const rows = signatures
      .map((s) =>
        [
          new Date(s.signed_at).toISOString(),
          s.signer_email,
          s.record_type,
          s.record_id,
          s.milestone,
          `"${(s.meaning ?? '').replace(/"/g, '""')}"`,
        ].join(',')
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signatures-${currentStudyId ?? 'study'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Matches the READABLE_ROLES gate GET /api/signatures enforces server-side,
  // and every other compliance page's client-side gate, so access is
  // consistent across the route, the UI, and site_coordinator/data_manager.
  if (!hasRole(userRole, READABLE_ROLES)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>
        You do not have access to the electronic signatures register.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            COMPLIANCE / Electronic Signatures
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Electronic Signatures
          </h1>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Immutable record of all data endorsements — read-only.
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={signatures.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-sm)',
            cursor: signatures.length === 0 ? 'not-allowed' : 'pointer',
            opacity: signatures.length === 0 ? 0.5 : 1,
          }}
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {isDemoMode && signatures.length === 0 && !loading && (
        <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 'var(--font-size-sm)', color: 'var(--status-warning)' }}>
          Demo mode — signatures created here are only visible in this browser tab, and reset when it closes.
        </div>
      )}

      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid var(--status-dropped)', fontSize: 'var(--font-size-sm)', color: 'var(--status-dropped)' }}>
          Failed to load signatures: {error}
        </div>
      )}

      {/* Signatures table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>
            Loading…
          </div>
        ) : signatures.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>
            No electronic signatures recorded for this study yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={colHeaderStyle}>Signed At (UTC)</th>
                  <th style={colHeaderStyle}>Signer</th>
                  <th style={colHeaderStyle}>Record Type</th>
                  <th style={colHeaderStyle}>Record ID</th>
                  <th style={colHeaderStyle}>Milestone</th>
                  <th style={colHeaderStyle}>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {signatures.map((sig, i) => (
                  <tr
                    key={sig.id}
                    style={{
                      background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td style={{ ...cellStyle, fontFamily: 'var(--font-data)', color: 'var(--text-timestamp)' }}>
                      {new Date(sig.signed_at).toISOString().replace('T', ' ').substring(0, 19)} UTC
                    </td>
                    <td style={{ ...cellStyle, fontFamily: 'var(--font-data)', color: 'var(--text-actor)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sig.signer_email}
                    </td>
                    <td style={{ ...cellStyle, color: 'var(--text-secondary)' }}>
                      {sig.record_type}
                    </td>
                    <td style={{ ...cellStyle, fontFamily: 'var(--font-data)', color: 'var(--text-id)' }}>
                      {sig.record_id}
                    </td>
                    <td style={{ ...cellStyle, color: 'var(--status-sign)' }}>
                      {sig.milestone}
                    </td>
                    <td style={{ ...cellStyle, color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sig.meaning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
