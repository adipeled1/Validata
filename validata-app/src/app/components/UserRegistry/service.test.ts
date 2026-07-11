import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchUsersAPI, updateRoleAPI, updateStatusAPI, approveApplicantAPI, deleteUserAPI } from './service';

function mockFetchOnce(ok: boolean, json: any) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => json });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('UserRegistry service (API wrappers)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetchUsersAPI GETs /api/profiles and returns the parsed JSON', async () => {
    const fetchMock = mockFetchOnce(true, [{ id: 'u1' }]);
    expect(await fetchUsersAPI()).toEqual([{ id: 'u1' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/profiles');
  });

  it('fetchUsersAPI throws the server error message on failure', async () => {
    mockFetchOnce(false, { error: 'Forbidden.' });
    await expect(fetchUsersAPI()).rejects.toThrow('Forbidden.');
  });

  it('updateRoleAPI PATCHes { id, role }', async () => {
    const fetchMock = mockFetchOnce(true, {});
    await updateRoleAPI('u1', 'mentor');
    const [, opts] = fetchMock.mock.calls[0];
    expect(JSON.parse(opts.body)).toEqual({ id: 'u1', role: 'mentor' });
  });

  it('updateStatusAPI PATCHes { id, status }', async () => {
    const fetchMock = mockFetchOnce(true, {});
    await updateStatusAPI('u1', 'suspended');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ id: 'u1', status: 'suspended' });
  });

  it('approveApplicantAPI sets role and status together in one PATCH', async () => {
    const fetchMock = mockFetchOnce(true, {});
    await approveApplicantAPI('u1');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ id: 'u1', role: 'team_member', status: 'active' });
  });

  it('deleteUserAPI DELETEs /api/profiles?id=', async () => {
    const fetchMock = mockFetchOnce(true, { success: true });
    await deleteUserAPI('u1');
    expect(fetchMock).toHaveBeenCalledWith('/api/profiles?id=u1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('throws a fallback message when the server error response has no error field', async () => {
    mockFetchOnce(false, {});
    await expect(updateRoleAPI('u1', 'mentor')).rejects.toThrow('Failed to update role');
  });
});
