import React, { useState, useEffect } from 'react';
import UserManagementDisplay from './display';
import { fetchUsersAPI, updateRoleAPI, updateStatusAPI, deleteUserAPI } from './service';

const UserManagementControl = ({ isDemoMode, currentUserEmail }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial mock users list for Demo Mode
  const mockUsersList = [
    { id: 'demo-mentor-id', email: 'mentor@demo.com', role: 'mentor', status: 'active' },
    { id: 'demo-team-id', email: 'team@demo.com', role: 'team_member', status: 'active' },
    { id: 'demo-pending-id', email: 'newuser@demo.com', role: 'team_member', status: 'pending' },
    { id: 'demo-suspended-id', email: 'suspended@demo.com', role: 'team_member', status: 'suspended' }
  ];

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    
    if (isDemoMode) {
      if (users.length === 0) {
        setUsers(mockUsersList);
      }
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchUsersAPI();
      setUsers(data);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // TODO(architecture-plan Phase 2/3): this client-side fetch-on-mount will
  // be replaced by a Server Component initial load + Server Action refresh,
  // which removes this pattern entirely rather than patching it here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [isDemoMode]);

  const handleRoleChange = async (userId, newRole) => {
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
    } catch (err) {
      alert('Error updating user role: ' + err.message);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
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
    } catch (err) {
      alert('Error updating user status: ' + err.message);
    }
  };

  const handleDelete = async (userId) => {
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
    } catch (err) {
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
