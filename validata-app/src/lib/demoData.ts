export type DemoUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  deleted_at?: string | null;
};

export const DEMO_USERS: DemoUser[] = [
  { id: 'demo-mentor-id', email: 'mentor@demo.com', role: 'mentor', status: 'active' },
  { id: 'demo-investigator-id', email: 'investigator@demo.com', role: 'investigator', status: 'active' },
  { id: 'demo-team-id', email: 'team@demo.com', role: 'team_member', status: 'active' },
  // Approved-but-unassigned: a real team_member account, logs in fine, but
  // has no operational role yet - see the "no access yet" empty state.
  { id: 'demo-unassigned-id', email: 'unassigned@demo.com', role: 'team_member', status: 'active' },
  // Confirmed applicant awaiting mentor approval - shows the Pending Approvals queue.
  { id: 'demo-wait-approval-id', email: 'newuser@demo.com', role: 'applicant', status: 'wait_approval' },
  // Unconfirmed applicant - shows the read-only Unconfirmed Sign-ups list.
  { id: 'demo-wait-confirm-id', email: 'unconfirmed@demo.com', role: 'applicant', status: 'wait_email_confirm' },
  { id: 'demo-suspended-id', email: 'suspended@demo.com', role: 'team_member', status: 'suspended' },
  { id: 'demo-deleted-id', email: 'deleted_user@demo.com', role: 'team_member', status: 'deleted', deleted_at: '2026-07-05T12:00:00Z' },
];
