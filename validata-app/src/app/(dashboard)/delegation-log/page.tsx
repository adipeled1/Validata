"use client";

import { useSession } from '../../../context/SessionContext';

const ADMIN_ROLES = ['sponsor_admin', 'mentor'];

export default function DelegationLogPage() {
  const { userRole } = useSession();

  if (!ADMIN_ROLES.includes(userRole)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
        You do not have access to the delegation log.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          ADMINISTRATION / Delegation Log
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Delegation Log
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
        <p>Delegation log — coming soon.</p>
        <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
          This page will display all delegations from the <code style={{ fontFamily: 'var(--font-data)' }}>delegations</code> table. Columns: Delegated To, Role Delegated, Delegated By, Study, From Date, To Date, Reason, Status.
          Required by ICH E6(R3) AUTH-05 (delegation of duties documentation).
        </p>
      </div>
    </div>
  );
}
