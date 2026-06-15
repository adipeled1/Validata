import InfoTooltip from './InfoTooltip';

// Shown instead of a chart when there is no data to display
const EmptyChart = () => (
  <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm">
    No data available for this selection
  </div>
);

// Consistent card wrapper for every clinical accuracy chart
const ChartCard = ({ title, subtitle, info, isEmpty, children, center = false }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <div className={`flex items-start gap-0.5 mb-0.5 ${center ? 'justify-center' : ''}`}>
      <h3 className="text-lg font-semibold text-slate-800 leading-tight">{title}</h3>
      {info && <InfoTooltip text={info} />}
    </div>
    {subtitle && (
      <p className={`text-xs text-slate-400 mb-4 ${center ? 'text-center' : ''}`}>{subtitle}</p>
    )}
    {isEmpty ? <EmptyChart /> : children}
  </div>
);

export default ChartCard;
