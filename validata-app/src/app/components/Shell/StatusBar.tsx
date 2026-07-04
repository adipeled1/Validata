"use client";

import { Sun, Moon } from 'lucide-react';

interface StatusBarProps {
  userRole: string;
  currentUserEmail: string;
  isDemoMode: boolean;
  studyName?: string;
  lockState?: 'locked' | 'unlocked';
  lastSync?: string | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const ROLE_NAMES: Record<string, string> = {
  mentor: 'Project Mentor',
  sponsor_admin: 'Sponsor Admin',
  investigator: 'Investigator',
  site_coordinator: 'Site Coordinator',
  data_manager: 'Data Manager',
  monitor: 'Monitor',
  auditor: 'Auditor',
  irb_reviewer: 'IRB Reviewer',
  team_member: 'Team Member',
};

function Sep() {
  return (
    <span style={{ color: 'var(--statusbar-sep)', margin: '0 6px', userSelect: 'none' }}>|</span>
  );
}

export default function StatusBar({
  userRole,
  currentUserEmail,
  isDemoMode,
  studyName,
  lockState = 'unlocked',
  lastSync,
  theme,
  onToggleTheme,
}: StatusBarProps) {
  const roleName = ROLE_NAMES[userRole] || userRole;
  const isLocked = lockState === 'locked';

  return (
    <div
      style={{
        height: 'var(--statusbar-height)',
        background: 'var(--statusbar-bg)',
        color: 'var(--statusbar-fg)',
        fontSize: 'var(--font-size-sm)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        flexShrink: 0,
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Left side */}
      <span style={{ color: 'var(--status-active)' }}>&#x25CF; Active</span>
      <Sep />
      <span>
        Study:{' '}
        {studyName ? (
          <span style={{ fontWeight: 500 }}>{studyName}</span>
        ) : (
          <span style={{ color: 'var(--statusbar-sep)' }}>—</span>
        )}
        {isDemoMode && (
          <span
            style={{ color: '#f59e0b', fontWeight: 600, marginLeft: '4px' }}
          >
            (DEMO)
          </span>
        )}
      </span>
      <Sep />
      <span>{currentUserEmail || '—'}</span>
      <Sep />
      <span>{roleName}</span>
      <Sep />
      <span style={{ color: isLocked ? 'var(--status-dropped)' : undefined }}>
        {isLocked ? '🔐 Locked' : '🔓 Unlocked'}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right side */}
      {lastSync && (
        <>
          <span style={{ color: 'var(--statusbar-sep)' }}>
            Last sync: {lastSync} UTC
          </span>
          <Sep />
        </>
      )}
      <span style={{ fontWeight: 600, letterSpacing: '0.03em' }}>ICH E6(R3) ✓</span>
      <Sep />
      <button
        onClick={onToggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--statusbar-fg)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 2px',
          opacity: 0.85,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')}
      >
        {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
      </button>
    </div>
  );
}
