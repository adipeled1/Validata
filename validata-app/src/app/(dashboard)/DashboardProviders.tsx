"use client";

import { useState, useEffect } from 'react';
import { Clock, Ban, LogOut } from 'lucide-react';
import { SessionProvider, useSession } from '../../context/SessionContext';
import { StudyProvider, useStudy } from '../../context/StudyContext';
import { TabProvider, useTabs } from '../../context/TabContext';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from '../components/Sidebar/Sidebar';
import Toast from '../components/Toast/Toast';
import MenuBar from '../components/Shell/MenuBar';
import TabBar from '../components/Shell/TabBar';
import StatusBar from '../components/Shell/StatusBar';
import BottomPanel from '../components/Shell/BottomPanel';
import CommandPalette from '../components/Shell/CommandPalette';

// Matches the old --panel-height CSS var this replaces - the panel's
// always-reset-to-this size on close.
const DEFAULT_PANEL_HEIGHT = 158;

function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    isLoading: sessionLoading,
    isDemoMode,
    userRole,
    userStatus,
    currentUserEmail,
    handleLogout,
  } = useSession();
  const {
    isLoading: studyLoading,
    studies,
    currentStudyId,
    currentStudy,
    switchStudy,
    toastMessage,
    showToast,
    hideToast,
  } = useStudy();
  const { theme, toggleTheme } = useTheme();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const { activeTabId, closeTab } = useTabs();

  // Closing the panel (however it happens - the panel's own × button, the
  // status bar toggle, or the Ctrl+` shortcut) always drops back to the
  // default height, so reopening it never surprises you with whatever size
  // you last dragged it to before closing.
  const closePanel = () => {
    setIsPanelOpen(false);
    setPanelHeight(DEFAULT_PANEL_HEIGHT);
  };
  const togglePanel = () => {
    setIsPanelOpen((v) => {
      const next = !v;
      if (!next) setPanelHeight(DEFAULT_PANEL_HEIGHT);
      return next;
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        togglePanel();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabId, closeTab]);

  const isLoading = sessionLoading || (userStatus === 'active' && studyLoading);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100dvh',
          width: '100vw',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-editor)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>
            Validata is loading database…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (userStatus === 'candidate' || userStatus === 'pending') {
    const heading = userStatus === 'candidate'
      ? 'Check Your Inbox'
      : 'Awaiting Mentor Approval';
    const body = userStatus === 'candidate'
      ? <>Confirm your email address to continue registration for{' '}
          <code style={{ fontFamily: 'var(--font-data)', color: 'var(--accent-soft)' }}>{currentUserEmail}</code>.
          {' '}Check your inbox and click the link we sent you.</>
      : <>Email confirmed. A mentor needs to activate{' '}
          <code style={{ fontFamily: 'var(--font-data)', color: 'var(--accent-soft)' }}>{currentUserEmail}</code>
          {' '}in the User Registry before you can sign in.</>;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-editor)',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--status-pending)', marginBottom: '16px' }}>
            <Clock size={32} />
          </div>
          <h2
            style={{
              fontSize: 'var(--font-size-h1)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}
          >
            {heading}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-md)', lineHeight: 1.6, marginBottom: '20px' }}>
            {body}
          </p>
          <button
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              background: 'var(--bg-surface-hover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-base)',
              cursor: 'pointer',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (userStatus === 'suspended') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-editor)',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--status-dropped)', marginBottom: '16px' }}>
            <Ban size={32} />
          </div>
          <h2
            style={{
              fontSize: 'var(--font-size-h1)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}
          >
            Account Access Suspended
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-md)', lineHeight: 1.6, marginBottom: '20px' }}>
            Your access to Validata has been suspended. Contact the Project Mentor regarding{' '}
            <code style={{ fontFamily: 'var(--font-data)', color: 'var(--status-dropped)' }}>
              {currentUserEmail}
            </code>
            .
          </p>
          <button
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              background: 'var(--bg-surface-hover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-base)',
              cursor: 'pointer',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  const studyName = currentStudy?.name ?? (studies[0]?.name ?? undefined);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--bg-editor)',
      }}
    >
      {/* Menu bar (28px) */}
      <MenuBar
        studies={studies}
        currentStudyId={currentStudyId}
        onSwitchStudy={switchStudy}
        email={currentUserEmail}
      />

      {/* Body row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar (ActivityBar + PrimarySidebar) */}
        <Sidebar userRole={userRole} currentUserEmail={currentUserEmail} />

        {/* Main area */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Tab bar (34px) */}
          <TabBar />

          <Toast message={toastMessage} show={showToast} onHide={hideToast} />

          {/* Page content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {children}
          </div>

          {/* Bottom panel */}
          <BottomPanel
            studyId={currentStudyId}
            isOpen={isPanelOpen}
            onClose={closePanel}
            height={panelHeight}
            onResize={setPanelHeight}
          />
        </main>
      </div>

      {/* Status bar (22px) */}
      <StatusBar
        userRole={userRole}
        currentUserEmail={currentUserEmail}
        isDemoMode={isDemoMode}
        studyName={studyName}
        lockState={currentStudy?.lock_state === 'locked' ? 'locked' : 'unlocked'}
        theme={theme}
        onToggleTheme={toggleTheme}
        isPanelOpen={isPanelOpen}
        onTogglePanel={togglePanel}
        onLogout={handleLogout}
      />

      {/* Command palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        studies={studies}
        onSwitchStudy={switchStudy}
      />
    </div>
  );
}

interface DashboardProvidersProps {
  children: React.ReactNode;
  initialSession?: any;
  initialStudies?: any[];
  initialCurrentStudyId?: string | null;
  initialParticipants?: any[];
  initialMeasurements?: any[];
}

// Client boundary that wires up the Context providers, seeded with the
// session and study data (dashboard)/layout.tsx already resolved server-side.
export default function DashboardProviders({
  children,
  initialSession,
  initialStudies,
  initialCurrentStudyId,
  initialParticipants,
  initialMeasurements,
}: DashboardProvidersProps) {
  return (
    <SessionProvider initialSession={initialSession}>
      <StudyProvider
        initialStudies={initialStudies}
        initialCurrentStudyId={initialCurrentStudyId}
        initialParticipants={initialParticipants}
        initialMeasurements={initialMeasurements}
      >
        <TabProvider>
          <DashboardShell>{children}</DashboardShell>
        </TabProvider>
      </StudyProvider>
    </SessionProvider>
  );
}
