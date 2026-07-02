import { redirect } from 'next/navigation';

// The dashboard used to be a single page with a client-side view switch;
// each view now has its own route under src/app/(dashboard)/. Participant
// Management was always the default view, so `/` just redirects there.
export default function Home() {
  redirect('/participants');
}
