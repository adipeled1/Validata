import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { CHART_MARGIN, CHART_HEIGHT, getGridColor, getAxisTick } from '../chartConfig';
import { useTheme } from '../../../../context/ThemeContext';

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '8px 10px', fontSize: '11px' }}>
      <p style={{ color: payload[0].payload.fill, fontWeight: 600, marginBottom: '2px' }}>{name}</p>
      <p style={{ color: 'var(--text-secondary)' }}>{value} participant{value !== 1 ? 's' : ''}</p>
    </div>
  );
};

// How many participants have at least one measurement logged vs. none yet
const MeasurementProgressBar = ({ data }: { data: any[] }) => {
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
