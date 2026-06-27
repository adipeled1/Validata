import { useState, useEffect } from 'react';
import SidebarDisplay from './display';
import { getNavItems } from './service';

// Controller component manages data fetching/logic for the view
// Note: isExpanded only affects the desktop <aside> rail — mobile renders a
// separate fixed top bar + bottom nav (see SidebarDisplay) that doesn't use it.
const SidebarControl = ({
  currentView,
  onNavigate,
  userRole,
  currentUserEmail,
  onLogout,
  studies = [],
  currentStudyId,
  onSwitchStudy
}) => {
  const navItems = getNavItems(userRole);
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;

    const saved = window.localStorage.getItem('validata-sidebar-expanded');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('validata-sidebar-expanded', String(isExpanded));
    }
  }, [isExpanded]);

  const handleToggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <SidebarDisplay
      currentView={currentView}
      onNavigate={onNavigate}
      navItems={navItems}
      userRole={userRole}
      currentUserEmail={currentUserEmail}
      onLogout={onLogout}
      isExpanded={isExpanded}
      onToggleExpanded={handleToggleExpanded}
      studies={studies}
      currentStudyId={currentStudyId}
      onSwitchStudy={onSwitchStudy}
    />
  );
};

export default SidebarControl;
