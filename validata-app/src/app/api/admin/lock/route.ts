import { verifySession, isMentor } from '@/lib/auth-server';
import { lockStudySchema, formatValidationError } from '@/lib/schemas';
import { setStudyLock, getStudyLockOverride } from '@/lib/demoStore';
import mockData from '@/mockData.json';

// POST /api/admin/lock
// Locks a study so no new data can be entered (ICH E6(R3) INT-01, INT-03).
// Restricted to mentor role.
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (!isMentor(session)) {
      return Response.json({ error: 'Forbidden. Mentor or admin role required to lock a study.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = lockStudySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: formatValidationError(parsed.error) }, { status: 400 });
    }
    const { studyId, reason } = parsed.data;

    if (session.isDemo) {
      const currentlyLocked = getStudyLockOverride(studyId)?.lock_state === 'locked';
      if (currentlyLocked) {
        return Response.json({ error: 'Study is already locked.' }, { status: 409 });
      }
      const study = (mockData.studies as any[]).find((s) => s.id === studyId);
      const override = setStudyLock({
        studyId,
        studyName: study?.name ?? studyId,
        locked: true,
        reason,
        actorEmail: session.user.email,
      });
      return Response.json({ id: studyId, name: study?.name, ...override }, { status: 200 });
    }

    const { data: study, error: fetchError } = await session.supabaseClient!
      .from('studies')
      .select('id, lock_state, deleted_at')
      .eq('id', studyId)
      .single();

    if (fetchError || !study) {
      return Response.json({ error: 'Study not found.' }, { status: 404 });
    }
    if (study.deleted_at) {
      return Response.json({ error: 'Cannot lock a deleted study.' }, { status: 400 });
    }
    if (study.lock_state === 'locked') {
      return Response.json({ error: 'Study is already locked.' }, { status: 409 });
    }

    const { data, error } = await session.supabaseClient!
      .from('studies')
      .update({
        lock_state: 'locked',
        locked_at: new Date().toISOString(),
        locked_by: session.user.id,
        lock_reason: reason,
      })
      .eq('id', studyId)
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 200 });
  } catch (error) {
    console.error('POST /api/admin/lock error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
