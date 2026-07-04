"use client";

import { useState } from 'react';
import { Bot, X } from 'lucide-react';

export default function AIChatControl({ participants: _p, measurements: _m }: { participants: any[]; measurements: any[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        title="AI Assistant"
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '16px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'var(--accent)',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {isOpen ? <X size={18} /> : <Bot size={18} />}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '16px',
            width: '300px',
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border)',
            zIndex: 1000,
            padding: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Bot size={16} style={{ color: 'var(--accent-soft)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>AI Assistant</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            AI-powered analysis assistant is not available in this version.
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Coming in a future release.
          </p>
        </div>
      )}
    </>
  );
}
