import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  verifySession: vi.fn(),
  canEditData: vi.fn(),
  canReadOnly: vi.fn(),
}));
vi.mock('@/lib/demoStore', () => ({
  addConsentVersion: vi.fn(),
  addConsentRecord: vi.fn(),
  getConsentVersions: vi.fn(),
  getConsentRecords: vi.fn(),
}));

import { GET, POST } from './route';
import { verifySession, canEditData, canReadOnly } from '@/lib/auth-server';
import { addConsentVersion, addConsentRecord, getConsentVersions, getConsentRecords } from '@/lib/demoStore';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/consent', () => {
  it('propagates verifySession()\'s error status (e.g. 401 unauthenticated)', async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await GET(new Request('http://x/api/consent?studyId=s1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when the caller cannot even read (oversight-role gate)', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(false);
    const res = await GET(new Request('http://x/api/consent?studyId=s1'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when studyId is missing', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/consent'));
    expect(res.status).toBe(400);
  });

  it('demo mode: returns versions/records from demoStore, filtered by participantId when given', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(true);
    vi.mocked(getConsentVersions).mockReturnValue([{ id: 301 }] as any);
    vi.mocked(getConsentRecords).mockReturnValue([
      { id: 'CR-1', participant_id: 'P-1001' },
      { id: 'CR-2', participant_id: 'P-1002' },
    ] as any);

    const res = await GET(new Request('http://x/api/consent?studyId=s1&participantId=P-1001'));
    const body = await res.json();
    expect(body.versions).toHaveLength(1);
    expect(body.records).toEqual([{ id: 'CR-1', participant_id: 'P-1001' }]);
  });
});

describe('POST /api/consent', () => {
  it('propagates verifySession()\'s error status', async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await POST(new Request('http://x/api/consent', { method: 'POST', body: JSON.stringify({ action: 'record_consent' }) }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for an unrecognized action', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await POST(new Request('http://x/api/consent', { method: 'POST', body: JSON.stringify({ action: 'nonsense' }) }));
    expect(res.status).toBe(400);
  });

  describe('action=create_version', () => {
    it('is gated to CONSENT_VERSION_ROLES (admin/mentor), not the general canEditData set', async () => {
      vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'investigator', status: 'active' } } as any);
      const res = await POST(new Request('http://x/api/consent', {
        method: 'POST',
        body: JSON.stringify({ action: 'create_version', studyId: 's1', version: 'v1.0' }),
      }));
      expect(res.status).toBe(403);
    });

    it('validates the body with createConsentFormVersionSchema before writing', async () => {
      vi.mocked(verifySession).mockResolvedValue(demoSession as any);
      const res = await POST(new Request('http://x/api/consent', {
        method: 'POST',
        body: JSON.stringify({ action: 'create_version', studyId: 's1' }), // missing required "version"
      }));
      expect(res.status).toBe(400);
      expect(addConsentVersion).not.toHaveBeenCalled();
    });

    it('demo mode: writes via demoStore.addConsentVersion and returns 201', async () => {
      vi.mocked(verifySession).mockResolvedValue(demoSession as any);
      vi.mocked(addConsentVersion).mockReturnValue({ id: 301, version: 'v1.0' } as any);
      const res = await POST(new Request('http://x/api/consent', {
        method: 'POST',
        body: JSON.stringify({ action: 'create_version', studyId: 's1', version: 'v1.0' }),
      }));
      expect(res.status).toBe(201);
      expect(addConsentVersion).toHaveBeenCalledWith(expect.objectContaining({ studyId: 's1', version: 'v1.0' }));
    });
  });

  describe('action=record_consent', () => {
    it('is gated by canEditData()', async () => {
      vi.mocked(verifySession).mockResolvedValue(demoSession as any);
      vi.mocked(canEditData).mockReturnValue(false);
      const res = await POST(new Request('http://x/api/consent', {
        method: 'POST',
        body: JSON.stringify({ action: 'record_consent', participantId: 'P-1001', studyId: 's1', formVersionId: 301 }),
      }));
      expect(res.status).toBe(403);
    });

    it('validates the body with createConsentRecordSchema (rejects a non-positive formVersionId)', async () => {
      vi.mocked(verifySession).mockResolvedValue(demoSession as any);
      vi.mocked(canEditData).mockReturnValue(true);
      const res = await POST(new Request('http://x/api/consent', {
        method: 'POST',
        body: JSON.stringify({ action: 'record_consent', participantId: 'P-1001', studyId: 's1', formVersionId: 0 }),
      }));
      expect(res.status).toBe(400);
      expect(addConsentRecord).not.toHaveBeenCalled();
    });

    it('demo mode: writes via demoStore.addConsentRecord and returns 201', async () => {
      vi.mocked(verifySession).mockResolvedValue(demoSession as any);
      vi.mocked(canEditData).mockReturnValue(true);
      vi.mocked(addConsentRecord).mockReturnValue({ id: 'CR-1' } as any);
      const res = await POST(new Request('http://x/api/consent', {
        method: 'POST',
        body: JSON.stringify({ action: 'record_consent', participantId: 'P-1001', studyId: 's1', formVersionId: 301 }),
      }));
      expect(res.status).toBe(201);
      expect(addConsentRecord).toHaveBeenCalledWith(expect.objectContaining({ participantId: 'P-1001', formVersionId: 301 }));
    });
  });
});
