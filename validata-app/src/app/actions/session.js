"use server";

import { cookies } from 'next/headers';

// Persists the current-study selection in a cookie (instead of localStorage)
// so a page reload's Server Component render (see (dashboard)/layout.js)
// knows which study to fetch for. The actual client-side switch itself
// doesn't wait on this - StudyContext.js updates its SWR key immediately.
export async function setCurrentStudyAction(studyId) {
  const cookieStore = await cookies();
  cookieStore.set('current-study-id', studyId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
