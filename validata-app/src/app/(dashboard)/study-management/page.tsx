"use client";

import { useSession } from '../../../context/SessionContext';
import StudyManagement from '../../components/StudyManagement/StudyManagement';
import { ADMIN_ROLES, hasRole } from '../../../lib/permissions';

// StudyManagement reads studies/currentStudyId/addStudy/deleteStudy from
// useStudy() itself - it takes no props.
export default function StudyManagementPage() {
  const { userRole } = useSession();

  if (!hasRole(userRole, ADMIN_ROLES)) {
    return null;
  }

  return <StudyManagement />;
}
