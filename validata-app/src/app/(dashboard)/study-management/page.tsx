"use client";

import { useSession } from '../../../context/SessionContext';
import { useStudy } from '../../../context/StudyContext';
import StudyManagement from '../../components/StudyManagement/StudyManagement';

export default function StudyManagementPage() {
  const { userRole } = useSession();
  const { studies, currentStudyId, addStudy, deleteStudy } = useStudy();

  if (userRole !== 'mentor' && userRole !== 'admin') {
    return null;
  }

  return (
    <StudyManagement
      studies={studies}
      currentStudyId={currentStudyId}
      onAddStudy={addStudy}
      onDeleteStudy={deleteStudy}
    />
  );
}
