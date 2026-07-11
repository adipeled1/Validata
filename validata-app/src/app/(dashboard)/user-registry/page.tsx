"use client";

import { useSession } from '../../../context/SessionContext';
import UserRegistry from '../../components/UserRegistry/control';
import { ADMIN_ROLES, canAccessPage } from '../../../lib/permissions';

export default function UserRegistryPage() {
  const { userRole, userStatus, isDemoMode, currentUserEmail } = useSession();

  if (!canAccessPage(userRole, userStatus, ADMIN_ROLES)) {
    return null;
  }

  return <UserRegistry isDemoMode={isDemoMode} currentUserEmail={currentUserEmail} viewerRole={userRole} />;
}
