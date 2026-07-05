"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { setCookie, deleteCookie } from '../lib/cookies';

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
// (dashboard)/layout.tsx via getDashboardSession()), it's used as-is and the
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

      // Note: the demo-session cookie is HttpOnly (fable_system_review §6.1
      // fix - it's server-verified, not client-trusted), so it can no longer
      // be read/parsed here. This fallback only runs when the server-side
      // dashboard layout didn't already resolve a session (see
      // (dashboard)/layout.tsx's getDashboardSession()), so it always falls
      // through to the real Supabase check below - a demo user without an
      // initialSession will correctly fail this and be redirected to /login.
      let email = '';
      let role = 'team_member';
      let status = 'pending';
      let isDemo = false;

      try {
        // The session lives in cookies managed by @supabase/ssr (kept
        // fresh by src/proxy.ts), so no token needs passing here.
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
          // fable_system_review §2.5: this used to fall back to the
          // client-writable user-role/user-status cookies, so breaking the
          // profile fetch (or just writing the cookies directly via
          // document.cookie) could force an elevated role into the sidebar.
          // Role/status must come from the DB or not be trusted at all -
          // treat a failed fetch as a session error and log out.
          console.warn('Profile fetch failed; logging out rather than trusting client-side role cookies:', profileError?.message);
          if (!cancelled) await handleLogout();
          return;
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
