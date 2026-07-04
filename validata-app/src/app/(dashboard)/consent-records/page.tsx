"use client";

import { useSession } from '../../../context/SessionContext';

const COMPLIANCE_ROLES = ['monitor', 'auditor', 'mentor', 'sponsor_admin'];

export default function ConsentRecordsPage() {
  const { userRole } = useSession();

  if (!COMPLIANCE_ROLES.includes(userRole)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
        You do not have access to consent records.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          COMPLIANCE / Consent Records
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Consent Records
        </h1>
      </div>
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          padding: '24px',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          lineHeight: 1.6,
        }}
      >
        <p>Consent records management — coming soon.</p>
        <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
          This page will show consent form versions and participant consent records. Each consent record captures the method (paper/electronic), date, witness, and whether a copy was delivered to the participant.
          Required by ICH E6(R3) CONSENT-01 through CONSENT-04.
        </p>
      </div>
    </div>
  );
}
