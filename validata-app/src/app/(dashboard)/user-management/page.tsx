"use client";

import { useSession } from '../../../context/SessionContext';
import UserManagement from '../../components/UserManagement/control';
import { ADMIN_ROLES, hasRole } from '../../../lib/permissions';

export default function UserManagementPage() {
  const { userRole, isDemoMode, currentUserEmail } = useSession();

  if (!hasRole(userRole, ADMIN_ROLES)) {
    return null;
  }

  return <UserManagement isDemoMode={isDemoMode} currentUserEmail={currentUserEmail} viewerRole={userRole} />;
}
