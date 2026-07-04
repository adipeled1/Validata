// Maps all view IDs to their App Router routes under src/app/(dashboard)/.
export const ROUTE_BY_VIEW: Record<string, string> = {
  // Participants & Data
  participants: '/participants',
  participantsView: '/participants-view',
  data: '/data-collection',
  results: '/results',

  // Analysis
  studyOverview: '/study-overview',
  analysis: '/analysis',

  // Queries
  queries: '/queries',

  // Compliance
  auditLog: '/audit-log',
  signatures: '/signatures',
  consentRecords: '/consent-records',
  adverseEvents: '/adverse-events',

  // Administration
  studyManagement: '/study-management',
  studyAccessControl: '/study-access-control',
  userManagement: '/user-management',
  delegationLog: '/delegation-log',
  studyLockControl: '/study-lock-control',

  // System
  systemInventory: '/system-inventory',
};

// Kept for backwards compatibility — no longer used in the new Sidebar.
export interface NavItem {
  id: string;
  label: string;
}

export const getNavItems = (_userRole: string): NavItem[] => [];
