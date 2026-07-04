"use client";

import { useSession } from '../../../context/SessionContext';

const COMPLIANCE_ROLES = ['monitor', 'auditor', 'mentor', 'sponsor_admin'];

export default function AdverseEventsPage() {
  const { userRole } = useSession();

  if (!COMPLIANCE_ROLES.includes(userRole)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
        You do not have access to adverse events.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          COMPLIANCE / Adverse Events
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Adverse Events / SAE
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
        <p>Adverse events and serious adverse events management — coming soon.</p>
        <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
          This page will display AEs grouped by severity band (SUSAR / Serious / Non-Serious) with deadline tracking. Events within 48 hours of their reporting deadline will be highlighted in red.
          Required by ICH E6(R3) safety reporting provisions.
        </p>
      </div>
    </div>
  );
}
