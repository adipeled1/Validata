"use client";

interface InlinePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  width?: string;
  children: React.ReactNode;
}

export default function InlinePanel({
  isOpen,
  onClose,
  title,
  width = '360px',
  children,
}: InlinePanelProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width,
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        boxShadow: '-4px 0 16px rgba(0,0,0,0.3)',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: '40px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
          }}
        >
          {title}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-2xl)',
            padding: '0 4px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)')
          }
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>{children}</div>
    </div>
  );
}
