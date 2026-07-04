"use client";

import { FlaskConical, Users, BarChart2, MessageSquare, Shield, Settings, Cpu } from 'lucide-react';

export type ActivitySection =
  | 'study'
  | 'participants'
  | 'analysis'
  | 'queries'
  | 'compliance'
  | 'administration'
  | 'system';

interface ActivityBarProps {
  userRole: string;
  currentPath: string;
  onSectionChange: (section: ActivitySection) => void;
  openSection: ActivitySection | null;
  queryBadgeCount?: number;
}

const ADMIN_ROLES = ['sponsor_admin', 'mentor'];
const COMPLIANCE_ROLES = ['monitor', 'auditor', 'mentor', 'sponsor_admin'];

export default function ActivityBar({
  userRole,
  onSectionChange,
  openSection,
  queryBadgeCount = 0,
}: ActivityBarProps) {
  const sections: Array<{
    id: ActivitySection;
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    visible: boolean;
    badge?: number;
  }> = [
    { id: 'study', icon: FlaskConical, label: 'Study', visible: true },
    { id: 'participants', icon: Users, label: 'Participants & Data', visible: true },
    { id: 'analysis', icon: BarChart2, label: 'Analysis', visible: true },
    {
      id: 'queries',
      icon: MessageSquare,
      label: 'Query Management',
      visible: true,
      badge: queryBadgeCount,
    },
    {
      id: 'compliance',
      icon: Shield,
      label: 'Compliance',
      visible: COMPLIANCE_ROLES.includes(userRole),
    },
    {
      id: 'administration',
      icon: Settings,
      label: 'Administration',
      visible: ADMIN_ROLES.includes(userRole),
    },
    {
      id: 'system',
      icon: Cpu,
      label: 'System',
      visible: userRole === 'mentor',
    },
  ];

  return (
    <div
      style={{
        width: 'var(--activity-width)',
        background: 'var(--bg-activity)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '4px',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {sections
        .filter((s) => s.visible)
        .map((section) => {
          const Icon = section.icon;
          const isActive = openSection === section.id;
          return (
            <button
              key={section.id}
              title={section.label}
              onClick={() => onSectionChange(section.id)}
              style={{
                width: '100%',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: 'transparent',
                border: 'none',
                borderLeft: isActive
                  ? '2px solid var(--accent-soft)'
                  : '2px solid transparent',
                color: isActive ? 'var(--accent-soft)' : 'var(--text-ghost)',
                cursor: 'pointer',
                transition: 'color 0.1s',
                marginBottom: '2px',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-ghost)';
                }
              }}
            >
              <Icon size={16} />
              {section.badge != null && section.badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '4px',
                    background: 'var(--accent-badge)',
                    color: 'var(--accent-badge-fg)',
                    fontSize: '9px',
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: '1px 3px',
                    borderRadius: '2px',
                    minWidth: '12px',
                    textAlign: 'center',
                  }}
                >
                  {section.badge > 99 ? '99+' : section.badge}
                </span>
              )}
            </button>
          );
        })}
    </div>
  );
}
