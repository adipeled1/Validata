"use client";

import { useEffect, useRef, useState } from 'react';
import { useTabs } from '../../../context/TabContext';

interface MenuState {
  tabId: string;
  x: number;
  y: number;
}

function TabContextMenu({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  const { closeTab, closeAllTabs, closeOtherTabs, closeTabsToRight } = useTabs();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const items: { label: string; onClick: () => void }[] = [
    { label: 'Close', onClick: () => closeTab(menu.tabId) },
    { label: 'Close others', onClick: () => closeOtherTabs(menu.tabId) },
    { label: 'Close tabs to the right', onClick: () => closeTabsToRight(menu.tabId) },
    { label: 'Close all', onClick: () => closeAllTabs() },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: menu.y,
        left: menu.x,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        overflow: 'hidden',
        zIndex: 100,
        minWidth: '170px',
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '7px 12px',
            fontSize: 'var(--font-size-md)',
            background: 'transparent',
            color: 'var(--text-primary)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-alt)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function TabBar() {
  const { tabs, activeTabId, activateTab, closeTab, closeAllTabs } = useTabs();
  const [menu, setMenu] = useState<MenuState | null>(null);

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
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          minWidth: 0,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => activateTab(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ tabId: tab.id, x: e.clientX, y: e.clientY });
              }}
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
                  fontSize: 'var(--font-size-md)',
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
                  fontSize: 'var(--font-size-lg)',
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

      <button
        onClick={closeAllTabs}
        title="Close all tabs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '0 12px',
          background: 'transparent',
          border: 'none',
          borderLeft: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          fontSize: 'var(--font-size-sm)',
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.background = 'var(--bg-surface-hover)';
          b.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.background = 'transparent';
          b.style.color = 'var(--text-secondary)';
        }}
      >
        Close all
      </button>

      {menu && <TabContextMenu menu={menu} onClose={() => setMenu(null)} />}
    </div>
  );
}
