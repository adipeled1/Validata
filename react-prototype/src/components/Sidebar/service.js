import { Users, ClipboardList, BarChart2 } from 'lucide-react';

export const getNavItems = () => [
  { id: 'participants', label: 'Participant Management', icon: Users },
  { id: 'data', label: 'Data Collection', icon: ClipboardList },
  { id: 'analysis', label: 'View & Analysis', icon: BarChart2 },
];
