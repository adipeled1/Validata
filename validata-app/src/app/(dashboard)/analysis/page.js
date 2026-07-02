"use client";

import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import Analysis from '../../components/Analysis/control';

export default function AnalysisPage() {
  const { isDemoMode } = useSession();
  const { participants, measurements } = useStudy();
  return <Analysis participants={participants} measurements={measurements} isDemoMode={isDemoMode} />;
}
