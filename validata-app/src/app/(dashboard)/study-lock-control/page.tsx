"use client";

import { useSession } from '../../../context/SessionContext';

const ADMIN_ROLES = ['sponsor_admin', 'mentor'];

export default function StudyLockControlPage() {
  const { userRole } = useSession();

  if (!ADMIN_ROLES.includes(userRole)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
        You do not have access to study lock control.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          ADMINISTRATION / Study Lock Control
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Study Lock Control
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
        <p>Study lock management — coming soon.</p>
        <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
          This page will provide dedicated UI for locking and unlocking studies. Unlocking requires password re-authentication and a mandatory reason, both of which are written to the audit log.
          The lock/unlock logic is already implemented in the backend (Phase 1).
        </p>
      </div>
    </div>
  );
}
