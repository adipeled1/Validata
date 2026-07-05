"use client";

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface Tab {
  id: string;
  label: string;
  path: string;
}

interface TabContextValue {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (path: string, label: string) => void;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  activateTab: (id: string) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

export const PATH_LABELS: Record<string, string> = {
  '/participants': 'Participant Registry',
  '/data-collection': 'Data Collection',
  '/results': 'Results Table',
  '/study-overview': 'Study Overview',
  '/analysis': 'Analysis & Reporting',
  '/queries': 'Queries',
  '/audit-log': 'Audit Trail',
  '/signatures': 'Electronic Signatures',
  '/consent-records': 'Consent Records',
  '/adverse-events': 'Adverse Events',
  '/study-management': 'Study Management',
  '/user-management': 'User Registry',
  '/delegation-log': 'Delegation Log',
  '/system-inventory': 'System Inventory',
};

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function saveTabs(tabs: Tab[]) {
  try { sessionStorage.setItem('vt-tabs', JSON.stringify(tabs)); } catch {}
}

function loadTabs(): Tab[] {
  try {
    const raw = sessionStorage.getItem('vt-tabs');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function TabProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tabs, setTabs] = useState<Tab[]>([]);

  // Restore from sessionStorage after mount (client-only)
  useEffect(() => {
    const saved = loadTabs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved.length > 0) setTabs(saved);
  }, []);

  // Ensure the current path always has a tab
  useEffect(() => {
    const label = PATH_LABELS[pathname] ?? 'Page';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTabs((prev) => {
      if (prev.some((t) => t.path === pathname)) return prev;
      const next = [...prev, { id: genId(), label, path: pathname }];
      saveTabs(next);
      return next;
    });
  }, [pathname]);

  // Persist on every change
  useEffect(() => {
    if (tabs.length > 0) saveTabs(tabs);
  }, [tabs]);

  const activeTabId = tabs.find((t) => t.path === pathname)?.id ?? null;

  // router.push is intentionally called OUTSIDE setTabs to avoid side effects
  // inside a state updater (React Strict Mode calls updaters twice in dev).
  const openTab = useCallback(
    (path: string, label: string) => {
      setTabs((prev) => {
        if (prev.some((t) => t.path === path)) return prev;
        const next = [...prev, { id: genId(), label, path }];
        saveTabs(next);
        return next;
      });
      router.push(path);
    },
    [router],
  );

  const closeTab = useCallback(
    (id: string) => {
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const closing = tabs[idx];
      const next = tabs.filter((t) => t.id !== id);
      setTabs(next);
      saveTabs(next);
      if (closing.path === pathname) {
        const target =
          next.length > 0 ? next[Math.min(idx, next.length - 1)].path : '/participants';
        router.push(target);
      }
    },
    [router, tabs, pathname],
  );

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    saveTabs([]);
    router.push('/participants');
  }, [router]);

  const closeOtherTabs = useCallback(
    (id: string) => {
      const keep = tabs.find((t) => t.id === id);
      if (!keep) return;
      const next = [keep];
      setTabs(next);
      saveTabs(next);
      if (pathname !== keep.path) router.push(keep.path);
    },
    [router, tabs, pathname],
  );

  const closeTabsToRight = useCallback(
    (id: string) => {
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const next = tabs.slice(0, idx + 1);
      setTabs(next);
      saveTabs(next);
      if (!next.some((t) => t.path === pathname)) {
        router.push(next[next.length - 1].path);
      }
    },
    [router, tabs, pathname],
  );

  const activateTab = useCallback(
    (id: string) => {
      const tab = tabs.find((t) => t.id === id);
      if (tab) router.push(tab.path);
    },
    [router, tabs],
  );

  return (
    <TabContext.Provider
      value={{ tabs, activeTabId, openTab, closeTab, closeAllTabs, closeOtherTabs, closeTabsToRight, activateTab }}
    >
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('useTabs must be inside TabProvider');
  return ctx;
}
