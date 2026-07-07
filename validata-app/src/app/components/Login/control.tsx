"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginDisplay from './display';
import { signInWithSupabase, signUpWithSupabase, performDemoLogin } from './service';
import { createClient } from '../../../lib/supabase/client';
import { deleteCookie } from '../../../lib/cookies';

const supabase = createClient();

// Connection state - NEXT_PUBLIC_ env vars are inlined at build time, so this
// never changes during the app's lifetime and doesn't need to be state/an effect.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const isSupabaseConfigured = !(supabaseUrl.includes('placeholder.supabase.co') || !supabaseUrl);

export default function LoginControl() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  // Demo mode has no real credentials to protect and nothing for a visitor
  // to type correctly - pre-filling the mentor demo account lets them see
  // the actual login screen without having to know or copy a password.
  const [email, setEmail] = useState(isSupabaseConfigured ? '' : 'mentor@demo.com');
  const [password, setPassword] = useState(isSupabaseConfigured ? '' : 'demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Clear any leftover session when landing on login page. The real
    // Supabase session lives in its own @supabase/ssr-managed cookies (not a
    // fixed name we can just delete), so sign out properly; our own
    // role/status cache cookies can be cleared directly.
    supabase.auth.signOut().catch(() => {});
    deleteCookie('demo-session');
    deleteCookie('user-role');
    deleteCookie('user-status');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Handle Auth if Supabase is not configured (demo mode fallback - only
    // takes effect server-side if NEXT_PUBLIC_DEMO_ENABLED=true; see
    // /api/auth/demo-login and fable_system_review §6.1).
    if (!isSupabaseConfigured) {
      try {
        await performDemoLogin(email, password);
        setSuccessMessage('Demo logged in successfully!');
        setTimeout(() => { router.push('/'); router.refresh(); }, 1000);
      } catch (err: any) {
        setErrorMessage(err.message || 'Invalid credentials. (Note: Supabase is not configured. Use mentor@demo.com / demo123 or team@demo.com / demo123).');
        setIsLoading(false);
      }
      return;
    }

    try {
      if (isLogin) {
        // 1. Sign In
        await signInWithSupabase(email, password);
        setSuccessMessage('Logged in successfully!');

        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);

      } else {
        // 2. Sign Up
        await signUpWithSupabase(email, password);
        setSuccessMessage('Registration successful! Please check your email for confirmation, then log in. (Your account will require mentor approval before full access)');
        setIsLogin(true);
        setPassword('');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMessage(err.message || 'An error occurred during authentication.');
      setIsLoading(false);
    }
  };

  return (
    <LoginDisplay
      isLogin={isLogin}
      setIsLogin={setIsLogin}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      isLoading={isLoading}
      errorMessage={errorMessage}
      setErrorMessage={setErrorMessage}
      successMessage={successMessage}
      setSuccessMessage={setSuccessMessage}
      isSupabaseConfigured={isSupabaseConfigured}
      handleSubmit={handleSubmit}
    />
  );
}
