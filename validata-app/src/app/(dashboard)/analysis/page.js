"use client";

import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import Analysis from '../../components/Analysis/control';

export default function AnalysisPage() {
  const { isDemoMode, userRole } = useSession();
  const { participants, measurements } = useStudy();

  if (userRole !== 'mentor') {
    return null;
  }

  return <Analysis participants={participants} measurements={measurements} isDemoMode={isDemoMode} />;
}
