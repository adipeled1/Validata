"use client";

import { useSession } from '../../../context/SessionContext';
import UserRegistry from '../../components/UserRegistry/control';
import { ADMIN_ROLES, hasRole } from '../../../lib/permissions';

export default function UserRegistryPage() {
  const { userRole, isDemoMode, currentUserEmail } = useSession();

  if (!hasRole(userRole, ADMIN_ROLES)) {
    return null;
  }

  return <UserRegistry isDemoMode={isDemoMode} currentUserEmail={currentUserEmail} viewerRole={userRole} />;
}
