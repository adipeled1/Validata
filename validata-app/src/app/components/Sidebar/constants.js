import { Users, Eye, ClipboardList, BarChart2, ShieldAlert, Table2 } from 'lucide-react';

// Maps nav item ids (and the separate Studies Management entry) to their
// real App Router routes under src/app/(dashboard)/.
export const ROUTE_BY_VIEW = {
  participants: '/participants',
  participantsView: '/participants-view',
  data: '/data-collection',
  results: '/results',
  analysis: '/analysis',
  userManagement: '/user-management',
  studyManagement: '/study-management',
};

// Note: Studies Management is intentionally NOT in this list - it's rendered
// as a separate, fixed entry point (last in the desktop sidebar, next to the
// study switcher in the mobile top bar) rather than mixed into the main nav
// list/mobile bottom tab bar. See Sidebar.jsx.
export const getNavItems = (userRole) => {

  const items = [
    { id: 'participants', label: 'Participant Management', icon: Users },
    { id: 'participantsView', label: 'Participants View', icon: Eye },
    { id: 'data', label: 'Data Collection', icon: ClipboardList },
    { id: 'results', label: 'Results', icon: Table2 },
  ];


  if (userRole === 'mentor') {
    items.push({ id: 'analysis', label: 'View & Analysis', icon: BarChart2 });
    items.push({ id: 'userManagement', label: 'User Access Control', icon: ShieldAlert });
  }

  return items;
};
