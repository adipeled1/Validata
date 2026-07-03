"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { getCookie, setCookie, deleteCookie } from '../lib/cookies';

const supabase = createClient();

interface SessionContextValue {
  isLoading: boolean;
  isDemoMode: boolean;
  userRole: string;
  userStatus: string;
  currentUserEmail: string;
  handleLogout: () => Promise<void>;
}

interface InitialSession {
  isDemoMode: boolean;
  userRole: string;
  userStatus: string;
  currentUserEmail: string;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// Resolves auth/session once for every dashboard route (moved out of the old
// single-page component so each route under (dashboard)/ can share it without
// prop drilling). When `initialSession` is provided (resolved server-side by
// (dashboard)/layout.js via getDashboardSession()), it's used as-is and the
// client-side re-check below is skipped entirely - it only runs as a
// fallback for the rare case no initial session was resolved.
export function SessionProvider({ children, initialSession }: { children: React.ReactNode; initialSession?: InitialSession }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(!initialSession);
  const [isDemoMode, setIsDemoMode] = useState(initialSession?.isDemoMode ?? true);
  const [userRole, setUserRole] = useState(initialSession?.userRole ?? 'team_member');
  const [userStatus, setUserStatus] = useState(initialSession?.userStatus ?? 'pending');
  const [currentUserEmail, setCurrentUserEmail] = useState(initialSession?.currentUserEmail ?? '');

  const handleLogout = useCallback(async () => {
    deleteCookie('demo-session');
    deleteCookie('user-role');
    deleteCookie('user-status');

    try {
      if (!isDemoMode) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Supabase logout warning:', e);
    }

    router.push('/login');
    router.refresh();
  }, [isDemoMode, router]);

  useEffect(() => {
    if (initialSession) return; // already resolved server-side

    let cancelled = false;

    const initializeAuth = async () => {
      setIsLoading(true);

      const demoSessionStr = getCookie('demo-session');

      let email = '';
      let role = 'team_member';
      let status = 'pending';
      let isDemo = false;

      if (demoSessionStr) {
        try {
          const ds = JSON.parse(demoSessionStr);
          email = ds.email;
          role = ds.role;
          status = ds.status;
          isDemo = true;
        } catch (e) {
          router.push('/login');
          return;
        }
      } else {
        try {
          // The session lives in cookies managed by @supabase/ssr (kept
          // fresh by src/proxy.js), so no token needs passing here.
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            router.push('/login');
            return;
          }

          email = user.email ?? '';

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError || !profile) {
            console.warn('Profile fetch warning/error, falling back to cookies:', profileError?.message);
            role = getCookie('user-role') || 'team_member';
            status = getCookie('user-status') || 'pending';
          } else {
            role = profile.role;
            status = profile.status;
            setCookie('user-role', role, 7);
            setCookie('user-status', status, 7);
          }
        } catch (e: any) {
          console.warn('Session verification failed, logging out:', e.message);
          if (!cancelled) await handleLogout();
          return;
        }
      }

      if (cancelled) return;
      setCurrentUserEmail(email);
      setUserRole(role);
      setUserStatus(status);
      setIsDemoMode(isDemo);
      setIsLoading(false);
    };

    initializeAuth();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: SessionContextValue = { isLoading, isDemoMode, userRole, userStatus, currentUserEmail, handleLogout };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
