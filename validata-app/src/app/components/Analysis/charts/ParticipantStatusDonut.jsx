import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_HEIGHT } from '../chartConfig';

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

// Active / Completed / Dropped breakdown of every participant in the study
const ParticipantStatusDonut = ({ data }) => {
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
