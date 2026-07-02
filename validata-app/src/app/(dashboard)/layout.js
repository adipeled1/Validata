import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDashboardSession } from '../../lib/auth-server';
import { listStudies } from '../../lib/repositories/studies';
import { listParticipants } from '../../lib/repositories/participants';
import { listMeasurements } from '../../lib/repositories/measurements';
import { mapParticipants, mapMeasurements } from '../../lib/mappers';
import DashboardProviders from './DashboardProviders';

// Resolves the session once, server-side, for every route in this group -
// the client SessionProvider uses this directly instead of re-checking auth
// itself on mount (see SessionContext.js's initialSession handling). This is
// defense-in-depth alongside src/proxy.js, which already redirects
// unauthenticated requests before they reach here.
//
// Also resolves studies/participants/measurements for the current study here
// (read from a cookie, not localStorage, so this Server Component can see
// it) and passes them down as initial data for StudyContext's SWR hooks -
// removing the client-side fetch waterfall that used to follow session
// resolution before anything rendered.
export default async function DashboardLayout({ children }) {
  const session = await getDashboardSession();

  if (session.error) {
    redirect('/login');
  }

  const initialSession = {
    currentUserEmail: session.user.email,
    userRole: session.profile.role,
    userStatus: session.profile.status,
    isDemoMode: session.isDemo,
  };

  let initialStudies = [];
  let initialCurrentStudyId = null;
  let initialParticipants = [];
  let initialMeasurements = [];

  if (session.profile.status === 'active') {
    try {
      initialStudies = await listStudies(session);

      const cookieStore = await cookies();
      const savedStudyId = cookieStore.get('current-study-id')?.value;
      initialCurrentStudyId = initialStudies.find((s) => s.id === savedStudyId)?.id
        ?? (initialStudies.length > 0 ? initialStudies[0].id : null);

      if (initialCurrentStudyId) {
        const [rawParticipants, rawMeasurements] = await Promise.all([
          listParticipants(session, initialCurrentStudyId),
          listMeasurements(session, initialCurrentStudyId),
        ]);
        initialParticipants = mapParticipants(rawParticipants, session.isDemo);
        initialMeasurements = mapMeasurements(rawMeasurements, session.isDemo);
      }
    } catch (error) {
      // Leave the initial* values empty - StudyContext's SWR hooks will
      // retry client-side and surface an error toast the same way they
      // would for any other failed fetch.
      console.warn('Failed to resolve initial dashboard data:', error);
    }
  }

  return (
    <DashboardProviders
      initialSession={initialSession}
      initialStudies={initialStudies}
      initialCurrentStudyId={initialCurrentStudyId}
      initialParticipants={initialParticipants}
      initialMeasurements={initialMeasurements}
    >
      {children}
    </DashboardProviders>
  );
}
