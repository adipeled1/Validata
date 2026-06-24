import { useState, useEffect } from 'react';
import SidebarDisplay from './display';
import { getNavItems } from './service';

// Controller component manages data fetching/logic for the view
const SidebarControl = ({ currentView, onNavigate, userRole, currentUserEmail, onLogout }) => {
  const navItems = getNavItems(userRole);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Default expanded on desktop, collapsed on mobile; re-applies whenever the
  // viewport crosses the breakpoint (e.g. resizing devtools into mobile view).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const applyForViewport = (matches) => {
      setIsMobile(matches);
      setIsExpanded(!matches);
    };
    applyForViewport(mq.matches);
    const handler = (e) => applyForViewport(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleNavigate = (viewId) => {
    onNavigate(viewId);
    if (isMobile) setIsExpanded(false);
  };

  return (
    <SidebarDisplay
      currentView={currentView}
      onNavigate={handleNavigate}
      navItems={navItems}
      userRole={userRole}
      currentUserEmail={currentUserEmail}
      onLogout={onLogout}
      isExpanded={isExpanded}
      onToggleExpanded={() => setIsExpanded((prev) => !prev)}
    />
  );
};

export default SidebarControl;

