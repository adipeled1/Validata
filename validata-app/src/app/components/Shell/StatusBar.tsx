"use client";

import { useRouter } from 'next/navigation';
import { Sun, Moon, PanelBottomOpen, PanelBottomClose } from 'lucide-react';

interface StatusBarProps {
  userRole: string;
  currentUserEmail: string;
  isDemoMode: boolean;
  studyName?: string;
  lockState?: 'locked' | 'unlocked';
  lastSync?: string | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
}

const ROLE_NAMES: Record<string, string> = {
  admin: 'Admin',
  mentor: 'Project Mentor',
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

const clickableSegmentStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  fontSize: 'inherit',
  fontFamily: 'inherit',
  cursor: 'pointer',
  padding: 0,
  display: 'inline',
  whiteSpace: 'nowrap',
};

export default function StatusBar({
  userRole,
  currentUserEmail,
  isDemoMode,
  studyName,
  lockState = 'unlocked',
  lastSync,
  theme,
  onToggleTheme,
  isPanelOpen,
  onTogglePanel,
}: StatusBarProps) {
  const router = useRouter();
  const roleName = ROLE_NAMES[userRole] || userRole;
  const isLocked = lockState === 'locked';

  const canAdmin = userRole === 'mentor' || userRole === 'admin';

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
          canAdmin ? (
            <button
              style={{ ...clickableSegmentStyle, fontWeight: 500, opacity: 0.9 }}
              onClick={() => router.push('/study-access-control')}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.textDecoration = 'none')}
              title="Study Access Control"
            >
              {studyName}
            </button>
          ) : (
            <span style={{ fontWeight: 500 }}>{studyName}</span>
          )
        ) : (
          <span style={{ color: 'var(--statusbar-sep)' }}>—</span>
        )}
        {isDemoMode && (
          <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: '4px' }}>(DEMO)</span>
        )}
      </span>
      <Sep />
      <span>{currentUserEmail || '—'}</span>
      <Sep />
      {canAdmin ? (
        <button
          style={clickableSegmentStyle}
          onClick={() => router.push('/user-management')}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.textDecoration = 'none')}
          title="User Registry"
        >
          {roleName}
        </button>
      ) : (
        <span>{roleName}</span>
      )}
      <Sep />
      {canAdmin ? (
        <button
          style={{ ...clickableSegmentStyle, color: isLocked ? 'var(--status-dropped)' : 'inherit' }}
          onClick={() => router.push('/study-lock-control')}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.textDecoration = 'none')}
          title="Study Lock Control"
        >
          {isLocked ? '🔐 Locked' : '🔓 Unlocked'}
        </button>
      ) : (
        <span style={{ color: isLocked ? 'var(--status-dropped)' : undefined }}>
          {isLocked ? '🔐 Locked' : '🔓 Unlocked'}
        </span>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right side */}
      {lastSync && (
        <>
          <span style={{ color: 'var(--statusbar-sep)' }}>Last sync: {lastSync} UTC</span>
          <Sep />
        </>
      )}
      <span style={{ fontWeight: 600, letterSpacing: '0.03em' }}>ICH E6(R3) ✓</span>
      <Sep />
      {onTogglePanel && (
        <>
          <button
            onClick={onTogglePanel}
            title={isPanelOpen ? 'Close Study Log (Ctrl+`)' : 'Toggle Study Log (Ctrl+`)'}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isPanelOpen ? 'var(--statusbar-fg)' : 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 2px',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--statusbar-fg)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = isPanelOpen ? 'var(--statusbar-fg)' : 'rgba(255,255,255,0.5)')}
          >
            {isPanelOpen ? <PanelBottomClose size={13} /> : <PanelBottomOpen size={13} />}
          </button>
          <Sep />
        </>
      )}
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
