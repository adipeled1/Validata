export const fetchUsersAPI = async (): Promise<any[]> => {
  const res = await fetch('/api/profiles');
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to fetch users');
  }
  return res.json();
};

export const updateRoleAPI = async (userId: string, newRole: string): Promise<any> => {
  const res = await fetch('/api/profiles', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, role: newRole })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to update role');
  }
  return res.json();
};

export const updateStatusAPI = async (userId: string, newStatus: string): Promise<any> => {
  const res = await fetch('/api/profiles', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, status: newStatus })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to update status');
  }
  return res.json();
};

export const deleteUserAPI = async (userId: string): Promise<any> => {
  const res = await fetch(`/api/profiles?id=${userId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to delete user');
  }
  return res.json();
};
