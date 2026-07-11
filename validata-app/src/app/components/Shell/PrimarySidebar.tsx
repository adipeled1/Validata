"use client";

import { useRef, useState, useEffect } from 'react';
import { useTabs } from '../../../context/TabContext';
import { ADMIN_ROLES, DELEGATION_ROLES, READABLE_ROLES, AUDIT_VIEWER_ROLES, hasRole } from '../../../lib/permissions';

interface PrimarySidebarProps {
  userRole: string;
  userStatus: string;
  currentPath: string;
}

type NavEntry = { label: string; path: string; highlight?: boolean; badge?: number };

function SectionHeader({ label, sectionRef }: { label: string; sectionRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={sectionRef}
      style={{
        padding: '10px 10px 4px',
        fontSize: 'var(--font-size-xs)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
}

function NavItem({
  label,
  path,
  currentPath,
  badge,
  highlight,
}: {
  label: string;
  path: string;
  currentPath: string;
  badge?: number;
  highlight?: boolean;
}) {
  const { openTab } = useTabs();
  const isActive = currentPath === path;

  return (
    <button
      onClick={() => openTab(path, label)}
      style={{
        width: '100%',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px 0 14px',
        fontSize: 'var(--font-size-base)',
        textAlign: 'left',
        background: isActive ? 'var(--bg-selection)' : 'transparent',
        color: highlight
          ? 'var(--accent-soft)'
          : isActive
          ? 'var(--text-primary)'
          : 'var(--text-secondary)',
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-alt)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {badge != null && badge > 0 && (
        <span
          style={{
            background: 'var(--accent-badge)',
            color: 'var(--accent-badge-fg)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 700,
            padding: '0 4px',
            borderRadius: '2px',
            minWidth: '16px',
            textAlign: 'center',
            flexShrink: 0,
            marginLeft: '4px',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function NavGroup({ items, currentPath }: { items: NavEntry[]; currentPath: string }) {
  return (
    <>
      {items.map((item) => (
        <NavItem
          key={item.path}
          label={item.label}
          path={item.path}
          currentPath={currentPath}
          highlight={item.highlight}
          badge={item.badge}
        />
      ))}
    </>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: '1px',
        background: 'var(--border)',
        margin: '4px 0',
      }}
    />
  );
}

export default function PrimarySidebar({
  userRole,
  userStatus,
  currentPath,
}: PrimarySidebarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Every RLS helper (can_read_only, can_edit_data, is_mentor, ...) requires
  // status = 'active' in addition to the role check - a suspended mentor is
  // blocked from reading/writing exactly like a suspended team_member, so
  // role-gated nav sections must also require isActive, not just the role
  // check, or a suspended user with an otherwise-privileged role would see
  // nav entries that all land on "nothing here" / a 403.
  const isActive = userStatus === 'active';

  // READABLE_ROLES gates every screen whose underlying data RLS actually
  // requires can_read_only() - Participants/Data Collection/Results/Queries/
  // Compliance all resolve to an empty list for a role outside this set (e.g.
  // team_member before a mentor assigns an operational role, or anyone who
  // is suspended), so hiding their nav entries avoids a sidebar full of
  // links that always land on "nothing here". Study Overview is
  // deliberately NOT gated by this - it's the app's landing page (see
  // src/app/page.tsx) and has no RLS-gated data of its own, so it stays
  // visible even for a suspended user (with its own explanatory note there).
  const showReadableData = hasRole(userRole, READABLE_ROLES) && isActive;
  const showCompliance = showReadableData;
  const showAdmin = hasRole(userRole, ADMIN_ROLES) && isActive;
  const showDelegation = hasRole(userRole, DELEGATION_ROLES) && isActive;
  const showSystem = (userRole === 'mentor' || userRole === 'admin') && isActive;
  const showAuditLogs = hasRole(userRole, AUDIT_VIEWER_ROLES) && isActive;

  const complianceItems = [
    ...(showAuditLogs ? [
      { label: 'Study Log', path: '/study-log' },
      { label: 'Audit Trail', path: '/audit-log' },
      { label: 'System Log', path: '/system-log' },
    ] : []),
    { label: 'Electronic Signatures', path: '/signatures' },
    { label: 'Consent Records', path: '/consent-records' },
    { label: 'Adverse Events', path: '/adverse-events' },
  ];

  // Surface "someone is waiting for approval" without the mentor having to
  // remember to open User Registry and check.
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    if (!showAdmin) return;
    let cancelled = false;
    fetch('/api/profiles')
      .then((r) => (r.ok ? r.json() : []))
      .then((profiles: { status: string }[]) => {
        if (cancelled) return;
        // Only wait_approval needs a mentor's action - wait_email_confirm
        // applicants haven't even confirmed their email yet, so they're not
        // actionable from the approval queue.
        const count = profiles.filter((p) => p.status === 'wait_approval').length;
        setPendingCount(count);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [showAdmin]);

  return (
    <div
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '4px' }}>

        {showReadableData && (
          <>
            {/* Participants & Data - active data entry: who's enrolled and
                collecting new measurements. Reviewing/analyzing what's
                already been collected lives in Overview & Analysis instead
                (see below) - Results Table moved there since it's a review
                screen, not an entry one. */}
            <div>
              <SectionHeader label="Participants & Data" />
              <NavGroup
                currentPath={currentPath}
                items={[
                  { label: 'Participant Registry', path: '/participants' },
                  { label: 'Data Collection', path: '/data-collection' },
                ]}
              />
            </div>

            <Divider />
          </>
        )}

        {/* Overview & Analysis - reviewing what's already been collected,
            from a landing dashboard through a raw results grid to
            statistical analysis. Study Overview always shows (it's the
            app's landing page and has no RLS-gated data); Results Table and
            Analysis & Reporting both need READABLE_ROLES since they
            summarize participant/measurement data. */}
        <div>
          <SectionHeader label="Overview & Analysis" />
          <NavGroup
            currentPath={currentPath}
            items={[
              { label: 'Study Overview', path: '/study-overview' },
              ...(showReadableData ? [{ label: 'Results Table', path: '/results' }] : []),
              ...(showReadableData ? [{ label: 'Analysis & Reporting', path: '/analysis' }] : []),
            ]}
          />
        </div>

        {showReadableData && (
          <>
            <Divider />

            {/* Query Management */}
            <div>
              <SectionHeader label="Query Management" />
              <NavItem label="Queries" path="/queries" currentPath={currentPath} />
            </div>
          </>
        )}

        {showCompliance && complianceItems.length > 0 && (
          <>
            <Divider />
            <div>
              <SectionHeader label="Compliance" />
              <NavGroup
                currentPath={currentPath}
                items={complianceItems}
              />
            </div>
          </>
        )}

        {showAdmin && (
          <>
            <Divider />
            <div>
              <SectionHeader label="Administration" />
              <NavGroup
                currentPath={currentPath}
                items={[
                  { label: 'Study Management', path: '/study-management' },
                  { label: 'User Registry', path: '/user-registry', badge: pendingCount },
                ]}
              />
            </div>
          </>
        )}

        {showDelegation && (
          <>
            <Divider />
            <div>
              <SectionHeader label="Delegation" />
              <NavItem label="Delegation Log" path="/delegation-log" currentPath={currentPath} />
            </div>
          </>
        )}

        {showSystem && (
          <>
            <Divider />
            <div>
              <SectionHeader label="System" />
              <NavItem label="System Inventory" path="/system-inventory" currentPath={currentPath} />
            </div>
          </>
        )}

        <div style={{ height: '8px' }} />
      </div>

    </div>
  );
}
