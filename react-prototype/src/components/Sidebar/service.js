import { Users, Eye, ClipboardList, BarChart2 } from 'lucide-react';

export const getNavItems = () => [
  { id: 'participants', label: 'Participant Management', icon: Users },
  { id: 'participantsView', label: 'Participants View', icon: Eye },
  { id: 'data', label: 'Data Collection', icon: ClipboardList },
  { id: 'analysis', label: 'View & Analysis', icon: BarChart2 },
];
