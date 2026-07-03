import React, { useState, useEffect } from 'react';
import UserManagementDisplay from './display';
import { fetchUsersAPI, updateRoleAPI, updateStatusAPI, deleteUserAPI } from './service';
import { DEMO_USERS } from '../../../lib/demoData';

interface UserManagementControlProps {
  isDemoMode: boolean;
  currentUserEmail: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
}

const UserManagementControl = ({ isDemoMode, currentUserEmail }: UserManagementControlProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');

    if (isDemoMode) {
      if (users.length === 0) {
        setUsers(DEMO_USERS as User[]);
      }
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchUsersAPI();
      setUsers(data);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // UserManagement uses client-side fetch-on-mount by design — user profiles
  // are not part of the dashboard Server Component layout (they're mentor-only
  // and fetched on demand), so this is an intentional exception to the
  // Server Component initial-load pattern used elsewhere.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [isDemoMode]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (isDemoMode) {
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === userId ? { ...user, role: newRole } : user))
      );
      return;
    }

    try {
      await updateRoleAPI(userId, newRole);
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === userId ? { ...user, role: newRole } : user))
      );
    } catch (err: any) {
      alert('Error updating user role: ' + err.message);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (isDemoMode) {
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === userId ? { ...user, status: newStatus } : user))
      );
      return;
    }

    try {
      await updateStatusAPI(userId, newStatus);
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === userId ? { ...user, status: newStatus } : user))
      );
    } catch (err: any) {
      alert('Error updating user status: ' + err.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user profile? The user will lose access to this portal.')) {
      return;
    }

    if (isDemoMode) {
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      return;
    }

    try {
      await deleteUserAPI(userId);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (err: any) {
      alert('Error deleting user: ' + err.message);
    }
  };

  return (
    <UserManagementDisplay
      users={users}
      isLoading={isLoading}
      error={error}
      currentUserEmail={currentUserEmail}
      onRoleChange={handleRoleChange}
      onStatusChange={handleStatusChange}
      onDelete={handleDelete}
      onRefresh={fetchUsers}
    />
  );
};

export default UserManagementControl;
