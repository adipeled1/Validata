"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginDisplay from './display';
import { signInWithSupabase, signUpWithSupabase, performDemoLogin } from './service';
import { deleteCookie } from '../../../lib/cookies';

export default function LoginControl() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Connection state
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);

  useEffect(() => {
    // Check if Supabase URL is a placeholder or missing
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = url.includes('placeholder.supabase.co') || !url;
    setIsSupabaseConfigured(!isPlaceholder);
    
    // Clear any leftover tokens when landing on login page
    deleteCookie('sb-access-token');
    deleteCookie('demo-session');
    deleteCookie('user-role');
    deleteCookie('user-status');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Handle Auth if Supabase is not configured
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        // Fallback demo logins if user tries to login with demo credentials manually
        if (email === 'mentor@demo.com' && password === 'demo123') {
          performDemoLogin('mentor');
          setSuccessMessage('Demo logged in successfully!');
          setTimeout(() => { router.push('/'); router.refresh(); }, 1000);
        } else if (email === 'team@demo.com' && password === 'demo123') {
          performDemoLogin('team_member');
          setSuccessMessage('Demo logged in successfully!');
          setTimeout(() => { router.push('/'); router.refresh(); }, 1000);
        } else {
          setErrorMessage('Invalid credentials. (Note: Supabase is not configured. Use the Quick Login buttons below or mentor@demo.com / demo123).');
          setIsLoading(false);
        }
      }, 800);
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
    } catch (err) {
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
