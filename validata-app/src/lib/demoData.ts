export type DemoUser = {
  id: string;
  email: string;
  role: string;
  status: string;
};

export const DEMO_USERS: DemoUser[] = [
  { id: 'demo-mentor-id', email: 'mentor@demo.com', role: 'mentor', status: 'active' },
  { id: 'demo-team-id', email: 'team@demo.com', role: 'team_member', status: 'active' },
  { id: 'demo-pending-id', email: 'newuser@demo.com', role: 'team_member', status: 'pending' },
  { id: 'demo-suspended-id', email: 'suspended@demo.com', role: 'team_member', status: 'suspended' },
];
