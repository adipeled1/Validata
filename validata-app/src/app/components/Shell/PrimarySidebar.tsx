"use client";

import { useRef, useEffect } from 'react';
import { useTabs } from '../../../context/TabContext';
import type { ActivitySection } from './ActivityBar';

interface Study {
  id: string;
  name: string;
}

interface PrimarySidebarProps {
  userRole: string;
  currentPath: string;
  scrollToSection: ActivitySection | null;
  studies: Study[];
  currentStudyId: string | null;
  onSwitchStudy: (id: string) => void;
}

const ADMIN_ROLES = ['sponsor_admin', 'mentor'];
const COMPLIANCE_ROLES = ['monitor', 'auditor', 'mentor', 'sponsor_admin'];

type NavEntry = { label: string; path: string; highlight?: boolean };

function SectionHeader({ label, sectionRef }: { label: string; sectionRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={sectionRef}
      style={{
        padding: '10px 10px 4px',
        fontSize: '10px',
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
        fontSize: '13px',
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
            fontSize: '10px',
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
  currentPath,
  scrollToSection,
  studies,
  currentStudyId,
  onSwitchStudy,
}: PrimarySidebarProps) {
  const refs: Record<ActivitySection, React.RefObject<HTMLDivElement>> = {
    study: useRef<HTMLDivElement>(null),
    participants: useRef<HTMLDivElement>(null),
    analysis: useRef<HTMLDivElement>(null),
    queries: useRef<HTMLDivElement>(null),
    compliance: useRef<HTMLDivElement>(null),
    administration: useRef<HTMLDivElement>(null),
    system: useRef<HTMLDivElement>(null),
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollToSection) return;
    const el = refs[scrollToSection]?.current;
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [scrollToSection]); // eslint-disable-line react-hooks/exhaustive-deps

  const showCompliance = COMPLIANCE_ROLES.includes(userRole);
  const showAdmin = ADMIN_ROLES.includes(userRole);
  const showSystem = userRole === 'mentor';

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

        {/* Study Context */}
        <div ref={refs.study}>
          <SectionHeader label="Study Context" />
          <div style={{ padding: '4px 10px 8px' }}>
            <select
              value={currentStudyId || ''}
              onChange={(e) => onSwitchStudy(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                padding: '4px 6px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {studies.map((s) => (
                <option key={s.id} value={s.id} style={{ background: 'var(--bg-input)' }}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Divider />

        {/* Participants & Data */}
        <div ref={refs.participants}>
          <SectionHeader label="Participants & Data" />
          <NavGroup
            currentPath={currentPath}
            items={[
              { label: 'Participant Registry', path: '/participants' },
              { label: 'Participant Viewer', path: '/participants-view' },
              { label: 'Data Collection', path: '/data-collection' },
              { label: 'Results Table', path: '/results' },
            ]}
          />
        </div>

        <Divider />

        {/* Analysis & Results */}
        <div ref={refs.analysis}>
          <SectionHeader label="Analysis & Results" />
          <NavGroup
            currentPath={currentPath}
            items={[
              { label: 'Study Overview', path: '/study-overview' },
              { label: 'Analysis & Reporting', path: '/analysis' },
            ]}
          />
        </div>

        <Divider />

        {/* Query Management */}
        <div ref={refs.queries}>
          <SectionHeader label="Query Management" />
          <NavItem label="Queries" path="/queries" currentPath={currentPath} />
        </div>

        {showCompliance && (
          <>
            <Divider />
            <div ref={refs.compliance}>
              <SectionHeader label="Compliance" />
              <NavGroup
                currentPath={currentPath}
                items={[
                  { label: 'Audit Trail', path: '/audit-log' },
                  { label: 'Electronic Signatures', path: '/signatures' },
                  { label: 'Consent Records', path: '/consent-records' },
                  { label: 'Adverse Events', path: '/adverse-events' },
                ]}
              />
            </div>
          </>
        )}

        {showAdmin && (
          <>
            <Divider />
            <div ref={refs.administration}>
              <SectionHeader label="Administration" />
              <NavGroup
                currentPath={currentPath}
                items={[
                  { label: 'Study Management', path: '/study-management' },
                  { label: 'Study Access Control', path: '/study-access-control', highlight: true },
                  { label: 'User Registry', path: '/user-management' },
                  { label: 'Delegation Log', path: '/delegation-log' },
                  { label: 'Study Lock Control', path: '/study-lock-control' },
                ]}
              />
            </div>
          </>
        )}

        {showSystem && (
          <>
            <Divider />
            <div ref={refs.system}>
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
