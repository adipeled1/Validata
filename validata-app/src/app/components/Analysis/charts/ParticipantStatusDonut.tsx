import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_HEIGHT } from '../chartConfig';

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

// Active / Completed / Dropped breakdown of every participant in the study
const ParticipantStatusDonut = ({ data }: { data: any[] }) => {
  if (!data?.length) return null;

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value">
          {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ParticipantStatusDonut;
