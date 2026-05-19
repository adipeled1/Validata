import React from 'react';
import SidebarDisplay from './display';
import { getNavItems } from './service';

// Controller component manages data fetching/logic for the view
const SidebarControl = ({ currentView, onNavigate }) => {
  const navItems = getNavItems();

  return (
    <SidebarDisplay 
      currentView={currentView} 
      onNavigate={onNavigate} 
      navItems={navItems} 
    />
  );
};

export default SidebarControl;
