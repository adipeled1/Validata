"use client";

interface StatusDotProps {
  status: string;
}

function getColor(status: string): string {
  const s = status?.toLowerCase() ?? '';
  if (s === 'active' || s === 'enrolled') return 'var(--status-active)';
  if (s === 'completed' || s === 'finished') return 'var(--status-complete)';
  if (s === 'pending' || s === 'screening') return 'var(--status-pending)';
  if (s === 'dropped' || s === 'withdrawn' || s === 'suspended') return 'var(--status-dropped)';
  return 'var(--text-muted)';
}

export default function StatusDot({ status }: StatusDotProps) {
  const color = getColor(status);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <span
        style={{
          display: 'inline-block',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ color, textTransform: 'capitalize', fontSize: 'var(--font-size-md)' }}>{status}</span>
    </span>
  );
}
