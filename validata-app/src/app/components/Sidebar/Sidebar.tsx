"use client";

import { usePathname } from 'next/navigation';
import PrimarySidebar from '../Shell/PrimarySidebar';

interface SidebarProps {
  userRole: string;
  userStatus: string;
  currentUserEmail: string;
}

const Sidebar = ({ userRole, userStatus }: SidebarProps) => {
  const pathname = usePathname();

  return <PrimarySidebar userRole={userRole} userStatus={userStatus} currentPath={pathname} />;
};

export default Sidebar;
