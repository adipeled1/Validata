"use client";

import { AlertTriangle } from 'lucide-react';

// Route-level error boundary - catches render errors thrown by any dashboard
// route (or its Server Components) instead of crashing the whole app.
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="inline-flex items-center justify-center p-3 bg-rose-100 dark:bg-rose-950/40 rounded-full text-rose-600 dark:text-rose-400">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Something went wrong</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{error?.message || 'An unexpected error occurred.'}</p>
      </div>
      <button
        onClick={reset}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
