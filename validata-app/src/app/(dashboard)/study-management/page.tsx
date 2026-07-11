"use client";

import { useSession } from '../../../context/SessionContext';
import StudyManagement from '../../components/StudyManagement/StudyManagement';
import { ADMIN_ROLES, canAccessPage } from '../../../lib/permissions';

// StudyManagement reads studies/currentStudyId/addStudy/deleteStudy from
// useStudy() itself - it takes no props.
export default function StudyManagementPage() {
  const { userRole, userStatus } = useSession();

  if (!canAccessPage(userRole, userStatus, ADMIN_ROLES)) {
    return null;
  }

  return <StudyManagement />;
}
