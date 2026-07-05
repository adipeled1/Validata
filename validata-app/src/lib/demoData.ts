export type DemoUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  deleted_at?: string | null;
};

export const DEMO_USERS: DemoUser[] = [
  { id: 'demo-mentor-id', email: 'mentor@demo.com', role: 'mentor', status: 'active' },
  { id: 'demo-team-id', email: 'team@demo.com', role: 'team_member', status: 'active' },
  { id: 'demo-pending-id', email: 'newuser@demo.com', role: 'team_member', status: 'pending' },
  { id: 'demo-suspended-id', email: 'suspended@demo.com', role: 'team_member', status: 'suspended' },
  { id: 'demo-deleted-id', email: 'deleted_user@demo.com', role: 'team_member', status: 'suspended', deleted_at: '2026-07-05T12:00:00Z' },
];
