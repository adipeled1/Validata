import React, { useState, useEffect, useCallback } from 'react';
import UserManagementDisplay from './display';
import { fetchUsersAPI, updateRoleAPI, updateStatusAPI, deleteUserAPI } from './service';
import { useStudy } from '../../../context/StudyContext';
import ConfirmWithReasonModal from '../common/ConfirmWithReasonModal';

interface UserManagementControlProps {
  isDemoMode: boolean;
  currentUserEmail: string;
  viewerRole: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  deleted_at?: string | null;
}

const UserManagementControl = ({ isDemoMode, currentUserEmail, viewerRole }: UserManagementControlProps) => {
  const { studies } = useStudy();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  // userId -> array of study ids they're currently a member of
  const [membershipsByUser, setMembershipsByUser] = useState<Record<string, string[]>>({});

  const fetchMemberships = useCallback(async () => {
    if (isDemoMode) return;
    try {
      const res = await fetch('/api/admin/study-members');
      if (!res.ok) return;
      const rows: { user_id: string; study_id: string }[] = await res.json();
      const grouped: Record<string, string[]> = {};
      for (const row of rows) {
        (grouped[row.user_id] ??= []).push(row.study_id);
      }
      setMembershipsByUser(grouped);
    } catch {
      // Non-fatal — Studies column just shows nothing until the next refresh.
    }
  }, [isDemoMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMemberships();
  }, [fetchMemberships]);

  const handleAddStudyMember = async (userId: string, studyId: string) => {
    if (isDemoMode) {
      setMembershipsByUser((prev) => ({ ...prev, [userId]: [...(prev[userId] ?? []), studyId] }));
      return;
    }
    try {
      const res = await fetch('/api/admin/study-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId, userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to add study membership.');
      }
      setMembershipsByUser((prev) => ({ ...prev, [userId]: [...(prev[userId] ?? []), studyId] }));
    } catch (err: any) {
      alert('Error assigning study: ' + err.message);
    }
  };

  const handleRemoveStudyMember = async (userId: string, studyId: string) => {
    if (isDemoMode) {
      setMembershipsByUser((prev) => ({ ...prev, [userId]: (prev[userId] ?? []).filter((id) => id !== studyId) }));
      return;
    }
    try {
      const res = await fetch('/api/admin/study-members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId, userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to remove study membership.');
      }
      setMembershipsByUser((prev) => ({ ...prev, [userId]: (prev[userId] ?? []).filter((id) => id !== studyId) }));
    } catch (err: any) {
      alert('Error removing study: ' + err.message);
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchUsersAPI();
      setUsers(data);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // UserManagement uses client-side fetch-on-mount by design — user profiles
  // are not part of the dashboard Server Component layout (they're mentor-only
  // and fetched on demand), so this is an intentional exception to the
  // Server Component initial-load pattern used elsewhere.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
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
    try {
      await updateStatusAPI(userId, newStatus);
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === userId ? { ...user, status: newStatus, deleted_at: newStatus === 'active' ? null : user.deleted_at } : user))
      );
    } catch (err: any) {
      alert('Error updating user status: ' + err.message);
    }
  };

  const handleDelete = (userId: string) => {
    setConfirmDeleteUserId(userId);
  };

  const handleConfirmDelete = async (_reason: string) => {
    const userId = confirmDeleteUserId;
    setConfirmDeleteUserId(null);
    if (!userId) return;

    try {
      await deleteUserAPI(userId);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (err: any) {
      alert('Error deleting user: ' + err.message);
    }
  };

  return (
    <>
      {confirmDeleteUserId && (
        <ConfirmWithReasonModal
          title="Delete User Profile"
          body="This user will permanently lose access to the portal. This action cannot be undone."
          reasonLabel="Reason for deletion"
          reasonRequired={false}
          confirmLabel="Delete User"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteUserId(null)}
        />
      )}
      <UserManagementDisplay
        users={users}
        isLoading={isLoading}
        error={error}
        currentUserEmail={currentUserEmail}
        viewerRole={viewerRole}
        studies={studies}
        membershipsByUser={membershipsByUser}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onRefresh={fetchUsers}
        onAddStudyMember={handleAddStudyMember}
        onRemoveStudyMember={handleRemoveStudyMember}
      />
    </>
  );
};

export default UserManagementControl;
