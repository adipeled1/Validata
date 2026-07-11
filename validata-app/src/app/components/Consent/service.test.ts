import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createConsentRecord, fetchConsent } from './service';
import * as clientDemoStore from '../../../lib/clientDemoStore';

describe('createConsentRecord', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('demo mode: writes through clientDemoStore.addConsentRecord and never calls fetch', async () => {
    const addSpy = vi.spyOn(clientDemoStore, 'addConsentRecord').mockImplementation(() => ({
      id: 'CR-1', study_id: 'demo-study-1', participant_id: 'P-1001', form_version_id: 301,
      method: 'written', copy_delivered: true, witnessed_by: null, notes: null, created_at: new Date().toISOString(),
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await createConsentRecord({
      studyId: 'demo-study-1',
      participantId: 'P-1001',
      formVersionId: 301,
      method: 'written',
      copyDelivered: true,
      isDemoMode: true,
      currentUserEmail: 'mentor@demo.com',
    });

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({
      studyId: 'demo-study-1',
      participantId: 'P-1001',
      formVersionId: 301,
      method: 'written',
      copyDelivered: true,
      actorEmail: 'mentor@demo.com',
    }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('live mode: POSTs to /api/consent with action=record_consent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await createConsentRecord({
      studyId: 'study-1',
      participantId: 'P-1001',
      formVersionId: 301,
      method: 'written',
      copyDelivered: false,
      isDemoMode: false,
      currentUserEmail: 'mentor@live.com',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/consent', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.action).toBe('record_consent');
    expect(body.participantId).toBe('P-1001');
  });

  it('live mode: throws when the API returns an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ error: 'Not authorized.' }) }));

    await expect(createConsentRecord({
      studyId: 'study-1',
      participantId: 'P-1001',
      formVersionId: 301,
      method: 'written',
      copyDelivered: false,
      isDemoMode: false,
      currentUserEmail: 'x@x.com',
    })).rejects.toThrow('Not authorized.');
  });
});

describe('fetchConsent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('demo mode: reads from clientDemoStore, never calls fetch', async () => {
    vi.spyOn(clientDemoStore, 'getConsentVersions').mockReturnValue([{ id: 301, study_id: 's1', version: 'v1.0', irb_approved_at: null, activated_at: null, content_hash: null }] as any);
    vi.spyOn(clientDemoStore, 'getConsentRecords').mockReturnValue([] as any);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchConsent('demo-study-1', true);
    expect(result.versions).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('live mode: GETs /api/consent?studyId= and defaults missing arrays to []', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchConsent('study-1', false);
    expect(fetchMock).toHaveBeenCalledWith('/api/consent?studyId=study-1');
    expect(result).toEqual({ versions: [], records: [] });
  });

  it('live mode: throws when the API returns an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ error: 'Study not found.' }) }));
    await expect(fetchConsent('bad-study', false)).rejects.toThrow('Study not found.');
  });
});
