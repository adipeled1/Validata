"use client";

import { useState, useEffect } from 'react';
import { Clock, Ban, LogOut } from 'lucide-react';
import { SessionProvider, useSession } from '../../context/SessionContext';
import { StudyProvider, useStudy } from '../../context/StudyContext';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from '../components/Sidebar/Sidebar';
import Toast from '../components/Toast/Toast';
import MenuBar from '../components/Shell/MenuBar';
import StatusBar from '../components/Shell/StatusBar';
import BottomPanel from '../components/Shell/BottomPanel';
import CommandPalette from '../components/Shell/CommandPalette';

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
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Ctrl+K → command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((v) => !v);
      }
      // Ctrl+` → bottom panel
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsPanelOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Validata is loading database…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (userStatus === 'candidate') {
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
            Registration Under Review
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.6, marginBottom: '20px' }}>
            Your registration is pending mentor approval for{' '}
            <code style={{ fontFamily: 'var(--font-data)', color: 'var(--accent-soft)' }}>
              {currentUserEmail}
            </code>
            . If not confirmed within 30 days, your account will be automatically removed.
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
              fontSize: '13px',
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

  if (userStatus === 'pending') {
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
            Awaiting Mentor Approval
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.6, marginBottom: '20px' }}>
            Your registration was successful. Access to Validata requires approval. Ask a Project
            Mentor to activate{' '}
            <code style={{ fontFamily: 'var(--font-data)', color: 'var(--accent-soft)' }}>
              {currentUserEmail}
            </code>{' '}
            in the User Registry.
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
              fontSize: '13px',
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.6, marginBottom: '20px' }}>
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
              fontSize: '13px',
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
      <MenuBar studyName={studyName} email={currentUserEmail} />

      {/* Body row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar (ActivityBar + PrimarySidebar) */}
        <Sidebar
          userRole={userRole}
          currentUserEmail={currentUserEmail}
          onLogout={handleLogout}
          studies={studies}
          currentStudyId={currentStudyId}
          onSwitchStudy={switchStudy}
        />

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
          <Toast message={toastMessage} show={showToast} onHide={hideToast} />

          {/* Page content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {children}
          </div>

          {/* Bottom panel */}
          <BottomPanel
            studyId={currentStudyId}
            isOpen={isPanelOpen}
            onClose={() => setIsPanelOpen(false)}
          />
        </main>
      </div>

      {/* Status bar (22px) */}
      <StatusBar
        userRole={userRole}
        currentUserEmail={currentUserEmail}
        isDemoMode={isDemoMode}
        studyName={studyName}
        theme={theme}
        onToggleTheme={toggleTheme}
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
        <DashboardShell>{children}</DashboardShell>
      </StudyProvider>
    </SessionProvider>
  );
}
