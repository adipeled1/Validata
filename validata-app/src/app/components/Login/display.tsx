import React from 'react';
import { AlertCircle, Database, Eye, EyeOff, Loader2, Mail } from 'lucide-react';

interface LoginDisplayProps {
  isLogin: boolean;
  setIsLogin: (v: boolean) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  isLoading: boolean;
  errorMessage: string;
  setErrorMessage: (v: string) => void;
  successMessage: string;
  setSuccessMessage: (v: string) => void;
  isSupabaseConfigured: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

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
  handleSubmit,
}: LoginDisplayProps) {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--font-ui)" }}>

      {/* ── Left: brand panel ─────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between relative overflow-hidden"
        style={{ width: '58%', background: '#110f1a', padding: '2.5rem 3rem' }}
      >
        {/* 3 px violet top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#7c3aed' }} />

        {/* Wordmark + context */}
        <div>
          <h1 style={{
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: '#d4c8f0',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            VALIDATA
          </h1>
          <p style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#8878aa',
            marginTop: 10,
            fontWeight: 500,
          }}>
            Clinical Trial Validation Portal
          </p>
          <span style={{
            display: 'inline-block',
            marginTop: 14,
            fontSize: 9,
            letterSpacing: '0.08em',
            background: '#1a1829',
            color: '#8878aa',
            padding: '3px 8px',
            border: '0.5px solid #2e2b3e',
          }}>
            Braude College of Engineering
          </span>
        </div>

        {/* Dot matrix — abstract data field */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(11, 1fr)',
          gap: 14,
          padding: '24px 0',
          flex: 1,
          alignContent: 'center',
        }}>
          {Array.from({ length: 77 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 13,
                height: 13,
                borderRadius: '50%',
                background: i % 7 === 0 ? '#7c3aed' : 'rgba(46,43,62,0.35)',
              }}
            />
          ))}
        </div>

        <div />
      </div>

      {/* ── Right: form panel ─────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col justify-center"
        style={{ background: '#f7f5ff', padding: '3rem 2.5rem' }}
      >
        {/* Mobile wordmark */}
        <div className="lg:hidden" style={{ marginBottom: '2.5rem' }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: '#110f1a',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            VALIDATA
          </h1>
          <p style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8878aa', marginTop: 6 }}>
            Clinical Trial Validation
          </p>
        </div>

        <div style={{ maxWidth: 340, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#110f1a', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4 }}>
            {isLogin ? 'Welcome back.' : 'Request access.'}
          </h2>
          <p style={{ fontSize: 13, color: '#8878aa', marginBottom: isLogin ? 28 : 14 }}>
            {isLogin
              ? 'Sign in to continue to your workspace.'
              : 'Create an account — mentor approval required.'}
          </p>

          {!isLogin && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 22,
              padding: '10px 12px',
              background: '#ede9fe',
              borderRadius: 2,
            }}>
              <Mail style={{ width: 14, height: 14, color: '#7c3aed', marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#5b21b6', lineHeight: 1.6, margin: 0 }}>
                After submitting, check your inbox for a confirmation link from Supabase.
                Click it to verify your address — your mentor can then approve your access.
              </p>
            </div>
          )}

          {/* Status banners */}
          {!isSupabaseConfigured && (
            <div style={{
              marginBottom: 20,
              padding: '10px 12px',
              borderLeft: '2px solid #d97706',
              background: '#fefce8',
              display: 'flex',
              gap: 10,
              fontSize: 12,
              color: '#92400e',
              borderRadius: '0 2px 2px 0',
            }}>
              <Database className="h-4 w-4 shrink-0" style={{ marginTop: 1, color: '#d97706' }} />
              <div>
                <span style={{ fontWeight: 600, display: 'block' }}>Demo mode</span>
                Credentials are pre-filled — just click Sign In below.
                To try it as an investigator, replace the email with investigator@demo.com (password stays demo123).
              </div>
            </div>
          )}

          {errorMessage && (
            <div style={{
              marginBottom: 18,
              padding: '10px 12px',
              borderLeft: '2px solid #ef4444',
              background: '#fef2f2',
              display: 'flex',
              gap: 10,
              fontSize: 12,
              color: '#991b1b',
              borderRadius: '0 2px 2px 0',
            }}>
              <AlertCircle className="h-4 w-4 shrink-0" style={{ marginTop: 1, color: '#ef4444' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div style={{
              marginBottom: 18,
              padding: '10px 12px',
              borderLeft: '2px solid #10b981',
              background: '#f0fdf4',
              fontSize: 12,
              color: '#065f46',
              borderRadius: '0 2px 2px 0',
            }}>
              {successMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#110f1a',
                  marginBottom: 6,
                }}
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                style={{
                  width: '100%',
                  background: 'white',
                  border: '1px solid #d4c8f0',
                  color: '#110f1a',
                  padding: '10px 12px',
                  fontSize: 14,
                  borderRadius: 2,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}
                placeholder="you@institution.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                onBlur={e => (e.target.style.borderColor = '#d4c8f0')}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#110f1a',
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  style={{
                    width: '100%',
                    background: 'white',
                    border: '1px solid #d4c8f0',
                    color: '#110f1a',
                    padding: '10px 42px 10px 12px',
                    fontSize: 14,
                    borderRadius: 2,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.target.style.borderColor = '#d4c8f0')}
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    left: 'auto',
                    width: 42,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8878aa',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                background: isLoading ? '#9d7fea' : '#7c3aed',
                color: 'white',
                fontWeight: 600,
                fontSize: 14,
                padding: '11px 16px',
                border: 'none',
                borderRadius: 2,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#6d28d9'; }}
              onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#7c3aed'; }}
            >
              {isLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : isLogin ? 'Sign In' : 'Request Access'}
            </button>
          </form>

          {/* Toggle */}
          <div style={{ marginTop: 18, fontSize: 12, color: '#8878aa' }}>
            {isLogin ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12, fontFamily: 'inherit' }}
                  onClick={() => { setIsLogin(false); setErrorMessage(''); setSuccessMessage(''); }}
                >
                  Request access
                </button>
              </>
            ) : (
              <>
                Already have access?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12, fontFamily: 'inherit' }}
                  onClick={() => { setIsLogin(true); setErrorMessage(''); setSuccessMessage(''); }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
