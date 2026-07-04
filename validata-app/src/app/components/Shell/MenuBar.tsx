"use client";

interface MenuBarProps {
  studyName?: string;
  email?: string;
}

export default function MenuBar({ studyName, email }: MenuBarProps) {
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
      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px' }}>
        Validata EDC
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>v1.0</span>

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

      {studyName && (
        <span
          style={{
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '10px',
            padding: '1px 8px',
            borderRadius: 'var(--radius)',
            fontWeight: 600,
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={studyName}
        >
          {studyName}
        </span>
      )}

      {email && (
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: '11px',
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
