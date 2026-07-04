"use client";

import { useTabs } from '../../../context/TabContext';

export default function TabBar() {
  const { tabs, activeTabId, activateTab, closeTab } = useTabs();

  if (tabs.length === 0) return null;

  return (
    <div
      style={{
        height: 'var(--tab-height)',
        background: 'var(--bg-tabs)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'stretch',
        flexShrink: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => activateTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 10px 0 14px',
              height: '100%',
              background: isActive ? 'var(--bg-tab-active)' : 'transparent',
              borderRight: '1px solid var(--border)',
              borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              userSelect: 'none',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                maxWidth: '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {tab.label}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              title="Close (Ctrl+W)"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--text-secondary)' : 'transparent',
                fontSize: '14px',
                padding: 0,
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
                flexShrink: 0,
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = 'var(--bg-surface-hover)';
                b.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = 'transparent';
                b.style.color = isActive ? 'var(--text-secondary)' : 'transparent';
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
