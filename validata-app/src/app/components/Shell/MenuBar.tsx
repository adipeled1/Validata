"use client";

import { useEffect, useRef, useState } from 'react';

interface Study {
  id: string;
  name: string;
}

interface MenuBarProps {
  studies?: Study[];
  currentStudyId?: string | null;
  onSwitchStudy?: (id: string) => void;
  email?: string;
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StudySwitcher({
  studies,
  currentStudyId,
  onSwitchStudy,
}: {
  studies: Study[];
  currentStudyId: string | null;
  onSwitchStudy: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStudy = studies.find((s) => s.id === currentStudyId);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (studies.length === 0) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          maxWidth: '220px',
          background: 'var(--bg-selection)',
          border: 'none',
          borderRadius: '999px',
          padding: '3px 10px 3px 12px',
          cursor: 'pointer',
          color: 'var(--accent-soft)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '170px',
          }}
        >
          {currentStudy?.name ?? 'Select study'}
        </span>
        <ChevronDownIcon />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: '220px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            overflow: 'hidden',
            zIndex: 100,
          }}
        >
          {studies.map((s) => {
            const isActive = s.id === currentStudyId;
            return (
              <button
                key={s.id}
                onClick={() => {
                  onSwitchStudy(s.id);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  fontSize: 'var(--font-size-md)',
                  textAlign: 'left',
                  background: 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-alt)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                {isActive && <span style={{ color: 'var(--accent-soft)', flexShrink: 0, marginLeft: '6px' }}><CheckIcon /></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MenuBar({ studies = [], currentStudyId, onSwitchStudy, email }: MenuBarProps) {
  return (
    <div
      style={{
        height: 'var(--menubar-height)',
        background: 'var(--bg-menubar)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        flexShrink: 0,
        fontSize: 'var(--font-size-sm)',
        userSelect: 'none',
        gap: '8px',
      }}
    >
      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-md)' }}>
        Validata EDC
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>v1.0</span>

      <div
        style={{
          width: '1px',
          height: '14px',
          background: 'var(--border)',
          margin: '0 4px',
        }}
      />

      {['File', 'Edit', 'View', 'Help'].map((item) => (
        <button
          key={item}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            padding: '0 4px',
            fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)')
          }
        >
          {item}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {onSwitchStudy && (
        <StudySwitcher studies={studies} currentStudyId={currentStudyId ?? null} onSwitchStudy={onSwitchStudy} />
      )}

      {email && (
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-sm)',
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {email}
        </span>
      )}
    </div>
  );
}
