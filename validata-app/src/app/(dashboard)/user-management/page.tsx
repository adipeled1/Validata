"use client";

import { useSession } from '../../../context/SessionContext';
import UserManagement from '../../components/UserManagement/control';

// ICH E6(R3) AUTH-02, ACC-01: user management is restricted to admin roles.
const ADMIN_ROLES = ['mentor', 'sponsor_admin'];

export default function UserManagementPage() {
  const { userRole, isDemoMode, currentUserEmail } = useSession();

  if (!ADMIN_ROLES.includes(userRole)) {
    return null;
  }

  return <UserManagement isDemoMode={isDemoMode} currentUserEmail={currentUserEmail} />;
}
