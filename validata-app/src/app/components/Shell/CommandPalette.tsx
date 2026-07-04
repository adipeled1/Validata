"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  studies?: Array<{ id: string; name: string }>;
  onSwitchStudy?: (id: string) => void;
}

interface CommandEntry {
  label: string;
  description?: string;
  action: () => void;
}

const NAV_COMMANDS: Array<{ label: string; path: string; description: string }> = [
  { label: 'Participant Registry', path: '/participants', description: 'Participants & Data' },
  { label: 'Participant Viewer', path: '/participants-view', description: 'Participants & Data' },
  { label: 'Data Collection', path: '/data-collection', description: 'Participants & Data' },
  { label: 'Results Table', path: '/results', description: 'Participants & Data' },
  { label: 'Study Overview', path: '/study-overview', description: 'Analysis' },
  { label: 'Analysis & Reporting', path: '/analysis', description: 'Analysis' },
  { label: 'Query Management', path: '/queries', description: 'Queries' },
  { label: 'Audit Trail', path: '/audit-log', description: 'Compliance' },
  { label: 'Electronic Signatures', path: '/signatures', description: 'Compliance' },
  { label: 'Consent Records', path: '/consent-records', description: 'Compliance' },
  { label: 'Adverse Events', path: '/adverse-events', description: 'Compliance' },
  { label: 'Study Management', path: '/study-management', description: 'Administration' },
  { label: 'Study Access Control', path: '/study-access-control', description: 'Administration' },
  { label: 'User Registry', path: '/user-management', description: 'Administration' },
  { label: 'Delegation Log', path: '/delegation-log', description: 'Administration' },
  { label: 'Study Lock Control', path: '/study-lock-control', description: 'Administration' },
  { label: 'System Inventory', path: '/system-inventory', description: 'System' },
];

export default function CommandPalette({
  isOpen,
  onClose,
  studies = [],
  onSwitchStudy,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const buildCommands = useCallback((): CommandEntry[] => {
    const navEntries: CommandEntry[] = NAV_COMMANDS.map((c) => ({
      label: c.label,
      description: c.description,
      action: () => {
        router.push(c.path);
        onClose();
      },
    }));

    const studyEntries: CommandEntry[] = studies.map((s) => ({
      label: `Switch to: ${s.name}`,
      description: 'Study',
      action: () => {
        onSwitchStudy?.(s.id);
        onClose();
      },
    }));

    return [...navEntries, ...studyEntries];
  }, [router, onClose, studies, onSwitchStudy]);

  const filtered = buildCommands().filter(
    (cmd) =>
      !query ||
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[selectedIndex]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: 'rgba(0,0,0,0.5)',
        }}
      />

      {/* Palette box */}
      <div
        style={{
          position: 'fixed',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9001,
          width: '480px',
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Navigate to… (type page or study name)"
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'var(--bg-input)',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'var(--font-data)',
            outline: 'none',
          }}
        />

        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div
              style={{
                padding: '12px 14px',
                color: 'var(--text-muted)',
                fontSize: '12px',
              }}
            >
              No results.
            </div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={i}
              onClick={cmd.action}
              style={{
                width: '100%',
                padding: '6px 14px',
                textAlign: 'left',
                background: i === selectedIndex ? 'var(--bg-selection)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'baseline',
                gap: '10px',
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span
                style={{
                  fontSize: '13px',
                  color: i === selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {cmd.label}
              </span>
              {cmd.description && (
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {cmd.description}
                </span>
              )}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: '4px 14px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '12px',
            color: 'var(--text-ghost)',
            fontSize: '10px',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>Esc close</span>
        </div>
      </div>
    </>
  );
}
