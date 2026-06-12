"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { setCookie, deleteCookie } from '../../lib/cookies';
import { Mail, Lock, LogIn, UserPlus, Sparkles, Database, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
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

  const handleDemoLogin = (role) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    setTimeout(() => {
      const demoEmail = role === 'mentor' ? 'mentor@demo.com' : 'team@demo.com';
      const sessionData = {
        email: demoEmail,
        role: role,
        status: 'active'
      };

      // Set cookies for Demo Mode
      setCookie('demo-session', JSON.stringify(sessionData), 7);
      setCookie('user-role', role, 7);
      setCookie('user-status', 'active', 7);

      setSuccessMessage(`Logged in successfully to Demo Mode as ${role === 'mentor' ? 'Mentor' : 'Team Member'}!`);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1000);
    }, 800);
  };

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
          handleDemoLogin('mentor');
        } else if (email === 'team@demo.com' && password === 'demo123') {
          handleDemoLogin('team_member');
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        const session = data.session;
        if (!session) throw new Error('Could not establish session.');

        // Get profile details to read role and status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        let role = 'team_member';
        let status = 'pending';

        if (profileError || !profile) {
          // Profile not created yet, insert it (in case trigger hasn't fired or is not configured)
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              role: 'team_member',
              status: 'pending'
            })
            .select()
            .single();
          
          if (!createError && newProfile) {
            role = newProfile.role;
            status = newProfile.status;
          }
        } else {
          role = profile.role;
          status = profile.status;
        }

        // Save session tokens and profile state in cookies
        setCookie('sb-access-token', session.access_token, 7);
        setCookie('user-role', role, 7);
        setCookie('user-status', status, 7);

        setSuccessMessage('Logged in successfully!');
        
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);

      } else {
        // 2. Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // If email confirmation is required, user status is pending anyway
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 p-4 relative overflow-hidden font-sans">
      
      {/* Background glowing decorations */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[150px]" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl mb-3 text-indigo-400">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-200">
            Validata
          </h1>
          <p className="text-slate-400 text-sm mt-1">Clinical Trial Validation Portal</p>
        </div>

        {/* Database Status Alert */}
        {!isSupabaseConfigured && (
          <div className="mb-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
            <Database className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Supabase is not configured.</span>
              Using Demo Mode fallback. You can login using the Quick Login buttons.
            </div>
          </div>
        )}

        {/* Error / Success Toast Messages inside the card */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Form Tabs */}
        <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800/60 mb-6">
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
              isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => {
              setIsLogin(true);
              setErrorMessage('');
              setSuccessMessage('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
              !isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => {
              setIsLogin(false);
              setErrorMessage('');
              setSuccessMessage('');
            }}
          >
            Register
          </button>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-600 rounded-xl py-2.5 pl-10 pr-10 text-sm outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="h-4 w-4" /> Sign In
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Create Account
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-8 border-t border-slate-800/80 pt-6">
          <p className="text-center text-slate-500 text-xs font-medium mb-3.5">
            Quick Sandbox Logins (Demo Mode)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isLoading}
              className="py-2.5 px-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
              onClick={() => handleDemoLogin('mentor')}
            >
              Mentor Dashboard
            </button>
            <button
              type="button"
              disabled={isLoading}
              className="py-2.5 px-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
              onClick={() => handleDemoLogin('team_member')}
            >
              Team Member
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
