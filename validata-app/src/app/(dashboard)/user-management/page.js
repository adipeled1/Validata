"use client";

import { useSession } from '../../../context/SessionContext';
import UserManagement from '../../components/UserManagement/control';

export default function UserManagementPage() {
  const { userRole, isDemoMode, currentUserEmail } = useSession();

  if (userRole !== 'mentor') {
    return null;
  }

  return <UserManagement isDemoMode={isDemoMode} currentUserEmail={currentUserEmail} />;
}
