import SidebarDisplay from './display';
import { getNavItems } from './service';

// Controller component manages data fetching/logic for the view
const SidebarControl = ({ currentView, onNavigate, userRole, currentUserEmail, onLogout }) => {
  const navItems = getNavItems(userRole);

  return (
    <SidebarDisplay
      currentView={currentView}
      onNavigate={onNavigate}
      navItems={navItems}
      userRole={userRole}
      currentUserEmail={currentUserEmail}
      onLogout={onLogout}
    />
  );
};

export default SidebarControl;

