"use client";

import { useSession } from '../../../context/SessionContext';

const ADMIN_ROLES = ['sponsor_admin', 'mentor'];

export default function StudyAccessControlPage() {
  const { userRole } = useSession();

  if (!ADMIN_ROLES.includes(userRole)) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
        You do not have access to study access control.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          ADMINISTRATION / Study Access Control
        </div>
        <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--accent-soft)' }}>
          Study Access Control
          <span style={{ fontSize: '10px', verticalAlign: 'middle', marginLeft: '8px', background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            NEW
          </span>
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
          maxWidth: '640px',
        }}
      >
        <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>
          Per-study access control — backend work required before this page is functional.
        </p>
        <p>
          This feature requires a new <code style={{ fontFamily: 'var(--font-data)', color: 'var(--accent-soft)' }}>study_members</code> table in the database. Once implemented, this page will allow Sponsor Admins and Mentors to:
        </p>
        <ul style={{ paddingLeft: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>Grant specific users access to individual studies with a designated role</li>
          <li>Revoke access when a staff member leaves or changes roles</li>
          <li>View the full delegation log (ICH E6(R3) AUTH-05)</li>
          <li>Export the access manifest for regulatory submissions</li>
        </ul>
        <p style={{ marginTop: '12px', color: 'var(--text-muted)', fontSize: '11px' }}>
          Currently all active users can access all studies. This will be restricted once the study_members table and RLS policies are deployed.
          See <code style={{ fontFamily: 'var(--font-data)' }}>newUI.md §5.13</code> for the full backend specification.
        </p>
      </div>
    </div>
  );
}
