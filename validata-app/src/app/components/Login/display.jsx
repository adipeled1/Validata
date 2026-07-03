import React from 'react';
import { Mail, Lock, LogIn, UserPlus, Sparkles, Database, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginDisplay({
  isLogin,
  setIsLogin,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isLoading,
  errorMessage,
  setErrorMessage,
  successMessage,
  setSuccessMessage,
  isSupabaseConfigured,
  handleSubmit
}) {
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
              Using Demo Mode fallback. Sign in with mentor@demo.com or team@demo.com (password: demo123).
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
            <label htmlFor="login-email" className="text-xs font-medium text-slate-300">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                id="login-email"
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
            <label htmlFor="login-password" className="text-xs font-medium text-slate-300">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="login-password"
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

      </div>
    </div>
  );
}
