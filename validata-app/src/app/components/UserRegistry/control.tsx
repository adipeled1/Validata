import React, { useState, useEffect, useCallback } from 'react';
import UserRegistryDisplay from './display';
import { fetchUsersAPI, updateRoleAPI, updateStatusAPI, approveApplicantAPI, deleteUserAPI } from './service';
import { useStudy } from '../../../context/StudyContext';
import ConfirmWithReasonModal from '../common/ConfirmWithReasonModal';
import * as clientDemoStore from '../../../lib/clientDemoStore';
import { DEMO_USERS } from '../../../lib/demoData';

interface UserRegistryControlProps {
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

const UserRegistryControl = ({ isDemoMode, currentUserEmail, viewerRole }: UserRegistryControlProps) => {
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

    if (isDemoMode) {
      setUsers(DEMO_USERS.map((u) => clientDemoStore.applyUserOverride(u)) as User[]);
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
  }, [isDemoMode]);

  // UserRegistry uses client-side fetch-on-mount by design — user profiles
  // are not part of the dashboard Server Component layout (they're mentor-only
  // and fetched on demand), so this is an intentional exception to the
  // Server Component initial-load pattern used elsewhere.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      if (isDemoMode) {
        const target = users.find((u) => u.id === userId);
        clientDemoStore.setUserOverride({ userId, userEmail: target?.email ?? userId, role: newRole, actorEmail: currentUserEmail });
      } else {
        await updateRoleAPI(userId, newRole);
      }
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === userId ? { ...user, role: newRole } : user))
      );
    } catch (err: any) {
      alert('Error updating user role: ' + err.message);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      if (isDemoMode) {
        const target = users.find((u) => u.id === userId);
        clientDemoStore.setUserOverride({ userId, userEmail: target?.email ?? userId, status: newStatus, actorEmail: currentUserEmail });
      } else {
        await updateStatusAPI(userId, newStatus);
      }
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === userId ? { ...user, status: newStatus, deleted_at: newStatus === 'active' ? null : user.deleted_at } : user))
      );
    } catch (err: any) {
      alert('Error updating user status: ' + err.message);
    }
  };

  // Approving an applicant sets role AND status together in one call - the
  // DB's composite CHECK constraint rejects a half-applied change (role:
  // 'team_member' while status is still 'wait_approval'), so this can't
  // reuse handleRoleChange/handleStatusChange, which each only touch one field.
  const handleApprove = async (userId: string) => {
    try {
      if (isDemoMode) {
        const target = users.find((u) => u.id === userId);
        clientDemoStore.setUserOverride({
          userId,
          userEmail: target?.email ?? userId,
          role: 'team_member',
          status: 'active',
          actorEmail: currentUserEmail,
        });
      } else {
        await approveApplicantAPI(userId);
      }
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === userId ? { ...user, role: 'team_member', status: 'active' } : user))
      );
    } catch (err: any) {
      alert('Error approving applicant: ' + err.message);
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
      if (isDemoMode) {
        const target = users.find((u) => u.id === userId);
        clientDemoStore.deleteUserOverride(userId, target?.email ?? userId, currentUserEmail);
      } else {
        await deleteUserAPI(userId);
      }
      // Move the user to status: 'deleted' locally rather than removing them
      // from state - removing them would also make them vanish from Deleted
      // Archives (derived from this same array) until the next full
      // fetchUsers() refresh, undermining the point of that view.
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === userId ? { ...user, status: 'deleted', deleted_at: new Date().toISOString() } : user))
      );
    } catch (err: any) {
      alert('Error deleting user: ' + err.message);
    }
  };

  // This same delete flow is shared by "Reject" (an unreviewed applicant)
  // and "Delete" (an already-approved account) - they have very different
  // consequences (hard delete vs. reversible soft delete), so the
  // confirmation copy is picked based on which one is actually happening
  // rather than a one-size-fits-all warning that would overstate permanence
  // for the reversible case.
  const deleteTarget = confirmDeleteUserId ? users.find((u) => u.id === confirmDeleteUserId) : null;
  const isApplicantTarget = deleteTarget?.role === 'applicant';

  return (
    <>
      {confirmDeleteUserId && (
        <ConfirmWithReasonModal
          title={isApplicantTarget ? 'Reject Applicant' : 'Delete User Profile'}
          body={
            isApplicantTarget
              ? 'This permanently deletes the applicant account. This action cannot be undone.'
              : 'This moves the account to Deleted Archives (soft delete) - it can be restored later via Reactivate. The account immediately loses access to the portal.'
          }
          reasonLabel={isApplicantTarget ? 'Reason for rejection' : 'Reason for deletion'}
          reasonRequired={false}
          confirmLabel={isApplicantTarget ? 'Reject Applicant' : 'Delete User'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteUserId(null)}
        />
      )}
      <UserRegistryDisplay
        users={users}
        isLoading={isLoading}
        error={error}
        currentUserEmail={currentUserEmail}
        viewerRole={viewerRole}
        studies={studies}
        membershipsByUser={membershipsByUser}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
        onApprove={handleApprove}
        onDelete={handleDelete}
        onRefresh={fetchUsers}
        onAddStudyMember={handleAddStudyMember}
        onRemoveStudyMember={handleRemoveStudyMember}
      />
    </>
  );
};

export default UserRegistryControl;
