"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import ActivityBar, { type ActivitySection } from '../Shell/ActivityBar';
import PrimarySidebar from '../Shell/PrimarySidebar';

interface SidebarProps {
  userRole: string;
  currentUserEmail: string;
  onLogout: () => void;
  studies?: any[];
  currentStudyId?: string | null;
  onSwitchStudy: (id: string) => void;
}

const INITIAL_SECTION: ActivitySection = 'participants';

const Sidebar = ({
  userRole,
  studies = [],
  currentStudyId,
  onSwitchStudy,
}: SidebarProps) => {
  const pathname = usePathname();
  const [openSection, setOpenSection] = useState<ActivitySection | null>(INITIAL_SECTION);

  const handleSectionChange = (section: ActivitySection) => {
    // Toggle: clicking the active section collapses the sidebar
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', flexShrink: 0 }}>
      <ActivityBar
        userRole={userRole}
        currentPath={pathname}
        onSectionChange={handleSectionChange}
        openSection={openSection}
      />
      {openSection && (
        <PrimarySidebar
          userRole={userRole}
          currentPath={pathname}
          openSection={openSection}
          studies={studies}
          currentStudyId={currentStudyId ?? null}
          onSwitchStudy={onSwitchStudy}
        />
      )}
    </div>
  );
};

export default Sidebar;
