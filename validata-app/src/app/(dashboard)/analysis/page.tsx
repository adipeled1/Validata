"use client";

import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import Analysis from '../../components/Analysis/control';

// ICH E6(R3) ACC-01: analysis is readable by any operational role.
// Signing (endorsement) is restricted to investigator / sponsor_admin / mentor
// inside the AnalysisControl component itself.
const READABLE_ROLES = [
  'mentor', 'sponsor_admin', 'investigator', 'site_coordinator',
  'data_manager', 'monitor', 'auditor', 'irb_reviewer',
];

export default function AnalysisPage() {
  const { isDemoMode, userRole, currentUserEmail } = useSession();
  const { participants, measurements, currentStudyId } = useStudy();

  if (!READABLE_ROLES.includes(userRole)) {
    return null;
  }

  return (
    <Analysis
      participants={participants}
      measurements={measurements}
      isDemoMode={isDemoMode}
      studyId={currentStudyId ?? undefined}
      currentUserEmail={currentUserEmail}
      userRole={userRole}
    />
  );
}
