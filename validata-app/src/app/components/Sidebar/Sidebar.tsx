"use client";

import { usePathname } from 'next/navigation';
import PrimarySidebar from '../Shell/PrimarySidebar';

interface SidebarProps {
  userRole: string;
  currentUserEmail: string;
}

const Sidebar = ({ userRole }: SidebarProps) => {
  const pathname = usePathname();

  return <PrimarySidebar userRole={userRole} currentPath={pathname} />;
};

export default Sidebar;
