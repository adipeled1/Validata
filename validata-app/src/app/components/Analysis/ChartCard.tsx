import InfoTooltip from './InfoTooltip';

// Shown instead of a chart when there is no data to display
const EmptyChart = () => (
  <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 text-sm">
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
  <div className="pdf-chart bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
    <div className={`flex items-start gap-0.5 mb-0.5 ${center ? 'justify-center' : ''}`}>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight">{title}</h3>
      {info && <InfoTooltip text={info} />}
    </div>
    {subtitle && (
      <p className={`text-xs text-slate-400 dark:text-slate-400 mb-4 ${center ? 'text-center' : ''}`}>{subtitle}</p>
    )}
    {isEmpty ? <EmptyChart /> : children}
  </div>
);

export default ChartCard;
