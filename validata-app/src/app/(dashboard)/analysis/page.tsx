"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import Analysis from '../../components/Analysis/control';
import { READABLE_ROLES, canAccessPage } from '../../../lib/permissions';

// ICH E6(R3) ACC-01: analysis is readable by any operational role.
// Signing (endorsement) is restricted to investigator / mentor
// inside the AnalysisControl component itself.

export default function AnalysisPage() {
  const router = useRouter();
  const { isDemoMode, userRole, userStatus, currentUserEmail } = useSession();
  const { currentStudyId } = useStudy();

  useEffect(() => {
    if (!canAccessPage(userRole, userStatus, READABLE_ROLES)) {
      router.replace('/participants');
    }
  }, [userRole, userStatus, router]);

  if (!canAccessPage(userRole, userStatus, READABLE_ROLES)) {
    return null;
  }

  return (
    <Analysis
      isDemoMode={isDemoMode}
      studyId={currentStudyId ?? undefined}
      currentUserEmail={currentUserEmail}
      userRole={userRole}
    />
  );
}
