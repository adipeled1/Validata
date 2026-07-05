"use client";

import { useSession } from '../../../context/SessionContext';
import UserManagement from '../../components/UserManagement/control';

// ICH E6(R3) AUTH-02, ACC-01: user management is restricted to mentor only.
const ADMIN_ROLES = ['admin', 'mentor'];

export default function UserManagementPage() {
  const { userRole, isDemoMode, currentUserEmail } = useSession();

  if (!ADMIN_ROLES.includes(userRole)) {
    return null;
  }

  return <UserManagement isDemoMode={isDemoMode} currentUserEmail={currentUserEmail} viewerRole={userRole} />;
}
