import { Info } from 'lucide-react';

// Info icon that reveals a tooltip on hover — for unfamiliar metric names
const InfoTooltip = ({ text }: { text: string }) => (
  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-start', flexShrink: 0, cursor: 'help', marginLeft: '4px', marginTop: '2px' }} className="group">
    <Info size={14} style={{ color: 'var(--text-ghost)' }} className="group-hover:text-accent-soft" />
    <div style={{
      position: 'absolute',
      zIndex: 20,
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px',
      width: '220px',
      padding: '8px 10px',
      background: 'var(--bg-tooltip, #1e1e2e)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      fontSize: '11px',
      lineHeight: 1.5,
      whiteSpace: 'normal',
      pointerEvents: 'none',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }} className="opacity-0 group-hover:opacity-100 transition-opacity">
      {text}
    </div>
  </div>
);

export default InfoTooltip;
