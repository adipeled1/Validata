import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { COLORS, CHART_HEIGHT } from '../chartConfig';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-md text-xs">
      <p style={{ color: payload[0].payload.fill }} className="font-semibold">{name}</p>
      <p className="text-slate-600 dark:text-slate-300">{value} measurement{value !== 1 ? 's' : ''}</p>
    </div>
  );
};

// Pass/fail donut — threshold in degrees determines what counts as clinically acceptable
const ThresholdDonut = ({ data, threshold = 5 }) => {
  if (!data || data.pass === undefined) return null;

  const { pass, fail, percentage } = data;
  const chartData = [
    { name: 'Pass', value: pass, fill: COLORS.pass },
    { name: 'Fail', value: fail, fill: COLORS.fail },
  ];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label — shows percentage, threshold, and raw counts */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{percentage.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">within ±{threshold}°</p>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
            <span style={{ color: COLORS.pass }}>{pass} pass</span>
            {' / '}
            <span style={{ color: COLORS.fail }}>{fail} fail</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThresholdDonut;
