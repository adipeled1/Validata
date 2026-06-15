import { Users, Eye, ClipboardList, BarChart2, ShieldAlert, Table2 } from 'lucide-react';

export const getNavItems = (userRole) => {
  const items = [
    { id: 'participants', label: 'Participant Management', icon: Users },
    { id: 'participantsView', label: 'Participants View', icon: Eye },
    { id: 'data', label: 'Data Collection', icon: ClipboardList },
    { id: 'analysis', label: 'View & Analysis', icon: BarChart2 },
    { id: 'results', label: 'Results', icon: Table2 },
  ];

  if (userRole === 'mentor') {
    items.push({ id: 'userManagement', label: 'User Access Control', icon: ShieldAlert });
  }

  return items;
};

