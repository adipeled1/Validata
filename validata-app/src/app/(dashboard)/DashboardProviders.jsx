"use client";

import { Clock, Ban, LogOut } from 'lucide-react';
import { SessionProvider, useSession } from '../../context/SessionContext';
import { StudyProvider, useStudy } from '../../context/StudyContext';
import Sidebar from '../components/Sidebar/Sidebar';
import Toast from '../components/Toast/Toast';

function DashboardShell({ children }) {
  const { isLoading: sessionLoading, isDemoMode, userRole, userStatus, currentUserEmail, handleLogout } = useSession();
  const { isLoading: studyLoading, studies, currentStudyId, switchStudy, toastMessage, showToast, hideToast } = useStudy();

  const isLoading = sessionLoading || (userStatus === 'active' && studyLoading);

  if (isLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Validata is loading database...</p>
        </div>
      </div>
    );
  }

  if (userStatus === 'pending') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 p-6 relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl text-center relative z-10">
          <div className="inline-flex items-center justify-center p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-full mb-5 text-amber-400">
            <Clock className="h-8 w-8 animate-spin animate-infinite" style={{ animationDuration: '4s' }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Awaiting Mentor Approval</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Your registration was successful. However, access to Validata clinical trials portal requires approval.
            Please ask a Project Mentor to activate your account <code className="text-indigo-300 font-mono text-xs">{currentUserEmail}</code> in the User Access panel.
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-all w-full border border-slate-700/60 active:scale-95 cursor-pointer animate-fade-in"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (userStatus === 'suspended') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 p-6 relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-rose-500/10 blur-[150px]" />
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl text-center relative z-10">
          <div className="inline-flex items-center justify-center p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-full mb-5 text-rose-400">
            <Ban className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Account Access Suspended</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Your access to Validata clinical trials has been suspended by a project supervisor.
            Please contact the Project Mentor for support regarding <code className="text-rose-300 font-mono text-xs">{currentUserEmail}</code>.
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-all w-full border border-slate-700/60 active:scale-95 cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 flex h-dvh overflow-hidden text-slate-800 dark:text-slate-100">
      <Sidebar
        userRole={userRole}
        currentUserEmail={currentUserEmail}
        onLogout={handleLogout}
        studies={studies}
        currentStudyId={currentStudyId}
        onSwitchStudy={switchStudy}
      />

      {/* Main Content Area */}
      {/* relative (not overflow) here so absolutely-positioned overlays (e.g. AIChat) anchor
          to this box without disturbing the inner content's scroll position. */}
      <main className="flex-1 relative flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 pt-12 md:pt-0">
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Demo Mode Banner */}
          {isDemoMode && (
            <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-6 py-2.5 flex items-center justify-between text-sm shadow-sm font-medium z-10">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                <span><strong>Running in Demo Mode:</strong> Using local mock data. Fill in credentials in <code>.env.local</code> to connect to Supabase.</span>
              </div>
            </div>
          )}

          <Toast message={toastMessage} show={showToast} onHide={hideToast} />

          <div className="p-4 pb-20 md:p-8 max-w-6xl mx-auto w-full flex-grow">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

// Client boundary that wires up the Context providers, seeded with the
// session and study data (dashboard)/layout.js already resolved server-side.
export default function DashboardProviders({
  children,
  initialSession,
  initialStudies,
  initialCurrentStudyId,
  initialParticipants,
  initialMeasurements,
}) {
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
