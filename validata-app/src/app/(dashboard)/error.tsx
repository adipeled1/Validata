"use client";

import { AlertTriangle } from 'lucide-react';

// Route-level error boundary - catches render errors thrown by any dashboard
// route (or its Server Components) instead of crashing the whole app.
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      gap: '16px',
      padding: '48px',
      textAlign: 'center',
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        background: 'rgba(248, 113, 113, 0.12)',
        color: 'var(--status-dropped)',
        borderRadius: '50%',
      }}>
        <AlertTriangle size={24} />
      </div>
      <div>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
          {error?.message || 'An unexpected error occurred.'}
        </p>
      </div>
      <button
        onClick={reset}
        style={{
          padding: '6px 16px',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          fontSize: 'var(--font-size-md)',
          fontWeight: 600,
          cursor: 'pointer',
          borderRadius: 'var(--radius)',
        }}
      >
        Try again
      </button>
    </div>
  );
}
