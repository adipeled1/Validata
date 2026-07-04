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

const Sidebar = ({
  userRole,
  studies = [],
  currentStudyId,
  onSwitchStudy,
}: SidebarProps) => {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<ActivitySection>('participants');

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', flexShrink: 0 }}>
      <ActivityBar
        userRole={userRole}
        currentPath={pathname}
        onSectionChange={setActiveSection}
        openSection={activeSection}
      />
      <PrimarySidebar
        userRole={userRole}
        currentPath={pathname}
        scrollToSection={activeSection}
        studies={studies}
        currentStudyId={currentStudyId ?? null}
        onSwitchStudy={onSwitchStudy}
      />
    </div>
  );
};

export default Sidebar;
