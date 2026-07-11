import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn(), isMentor: vi.fn() }));

import { GET } from './route';
import { verifySession, isMentor } from '@/lib/auth-server';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/admin/export', () => {
  it('is gated by isMentor()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await GET(new Request('http://x/api/admin/export?studyId=s1'));
    expect(res.status).toBe(403);
  });

  it('requires studyId', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/admin/export'));
    expect(res.status).toBe(400);
  });

  it('demo mode: returns an empty-shell export without a real hash', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/admin/export?studyId=s1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.study_id).toBe('s1');
    expect(body.participants).toEqual([]);
    expect(body.sha256).toBe('');
  });

  it('live mode: streams a JSON export whose sha256 hashes exactly the payload before it', async () => {
    const study = { id: 's1', title: 'Study 1' };
    const rows = Promise.resolve({ data: [{ id: 1 }], error: null });
    const empty = Promise.resolve({ data: [], error: null });

    const from = vi.fn((table: string) => {
      if (table === 'studies') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: study, error: null }) }) }) };
      }
      if (table === 'audit_log') {
        return { select: () => ({ eq: () => ({ order: () => rows }) }) };
      }
      if (table === 'participants' || table === 'measurements') {
        return { select: () => ({ eq: () => rows }) };
      }
      return { select: () => ({ eq: () => empty }) };
    });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);

    const res = await GET(new Request('http://x/api/admin/export?studyId=s1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Content-Disposition')).toContain('validata-export-s1-');

    const text = await res.text();
    const parsed = JSON.parse(text);
    expect(parsed.study).toEqual(study);
    expect(parsed.generated_by).toBe('mentor@demo.com');

    const { sha256, ...payload } = parsed;
    const payloadJson = text.slice(0, text.lastIndexOf(',"sha256"'));
    const expectedHash = createHash('sha256').update(payloadJson).digest('hex');
    expect(sha256).toBe(expectedHash);
  });
});
