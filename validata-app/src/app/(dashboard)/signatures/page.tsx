"use client";

import { useSession } from '../../../context/SessionContext';

const COMPLIANCE_ROLES = ['monitor', 'auditor', 'mentor', 'sponsor_admin'];

export default function SignaturesPage() {
  const { userRole } = useSession();

  if (!COMPLIANCE_ROLES.includes(userRole)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
        You do not have access to the electronic signatures register.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          COMPLIANCE / Electronic Signatures
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Electronic Signatures
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
        <p>
          Signature registry — coming soon. All data endorsement records are stored in the signatures table.
        </p>
        <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
          ICH E6(R3) requires permanent, immutable records of all electronic signatures. This page will display all endorsements for the current study, with export to PDF (signature manifest).
        </p>
      </div>
    </div>
  );
}
