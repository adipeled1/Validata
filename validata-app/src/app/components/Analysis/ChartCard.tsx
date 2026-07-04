import InfoTooltip from './InfoTooltip';

// Shown instead of a chart when there is no data to display
const EmptyChart = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    background: 'var(--bg-surface-alt)',
    border: '1px dashed var(--border)',
    fontSize: '11px',
    color: 'var(--text-ghost)',
  }}>
    No data available for this selection
  </div>
);

interface ChartCardProps {
  title: React.ReactNode;
  subtitle?: string;
  info?: string;
  isEmpty?: boolean;
  children?: React.ReactNode;
  center?: boolean;
}

// Consistent card wrapper for every clinical accuracy chart
const ChartCard = ({ title, subtitle, info, isEmpty, children, center = false }: ChartCardProps) => (
  <div
    className="pdf-chart"
    style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      padding: '16px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '2px', justifyContent: center ? 'center' : 'flex-start' }}>
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{title}</h3>
      {info && <InfoTooltip text={info} />}
    </div>
    {subtitle && (
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px', textAlign: center ? 'center' : 'left' }}>
        {subtitle}
      </p>
    )}
    {isEmpty ? <EmptyChart /> : children}
  </div>
);

export default ChartCard;
