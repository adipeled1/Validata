"use client";

import { useSession } from '../../../context/SessionContext';
import StudyManagement from '../../components/StudyManagement/StudyManagement';
import { ADMIN_ROLES, hasRole } from '../../../lib/permissions';

// StudyManagement reads studies/currentStudyId/addStudy/deleteStudy from
// useStudy() itself - it takes no props. This page previously passed a set
// of props the component doesn't accept (pre-existing dead code, unrelated
// to fable_system_review; caught here as a type error while touching this
// file for other fixes).
export default function StudyManagementPage() {
  const { userRole } = useSession();

  if (!hasRole(userRole, ADMIN_ROLES)) {
    return null;
  }

  return <StudyManagement />;
}
