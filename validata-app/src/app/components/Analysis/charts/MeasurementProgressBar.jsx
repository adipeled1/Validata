import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { CHART_MARGIN, CHART_HEIGHT, getGridColor, getAxisTick } from '../chartConfig';
import { useTheme } from '../../../../context/ThemeContext';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-md text-xs">
      <p style={{ color: payload[0].payload.fill }} className="font-semibold">{name}</p>
      <p className="text-slate-600 dark:text-slate-300">{value} participant{value !== 1 ? 's' : ''}</p>
    </div>
  );
};

// How many participants have at least one measurement logged vs. none yet
const MeasurementProgressBar = ({ data }) => {
  const { theme } = useTheme();
  if (!data?.length) return null;

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke={getGridColor(theme)} vertical={false} />
        <XAxis dataKey="name" tick={getAxisTick(theme)} />
        <YAxis allowDecimals={false} tick={getAxisTick(theme)} width={30} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: getGridColor(theme) }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MeasurementProgressBar;
