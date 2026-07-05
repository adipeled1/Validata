"use client";

import { usePathname } from 'next/navigation';
import PrimarySidebar from '../Shell/PrimarySidebar';

interface SidebarProps {
  userRole: string;
  currentUserEmail: string;
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

  return (
    <PrimarySidebar
      userRole={userRole}
      currentPath={pathname}
      studies={studies}
      currentStudyId={currentStudyId ?? null}
      onSwitchStudy={onSwitchStudy}
    />
  );
};

export default Sidebar;
