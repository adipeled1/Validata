import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { COLORS, CHART_HEIGHT } from '../chartConfig';

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '8px 10px', fontSize: '11px' }}>
      <p style={{ color: payload[0].payload.fill, fontWeight: 600, marginBottom: '2px' }}>{name}</p>
      <p style={{ color: 'var(--text-secondary)' }}>{value} measurement{value !== 1 ? 's' : ''}</p>
    </div>
  );
};

interface ThresholdDonutProps {
  data?: { pass: number; fail: number; percentage: number };
  threshold?: number;
}

// Pass/fail donut — threshold in degrees determines what counts as clinically acceptable
const ThresholdDonut = ({ data, threshold = 5 }: ThresholdDonutProps) => {
  if (!data || data.pass === undefined) return null;

  const { pass, fail, percentage } = data;
  const chartData = [
    { name: 'Pass', value: pass, fill: COLORS.pass },
    { name: 'Fail', value: fail, fill: COLORS.fail },
  ];

  return (
    <div style={{ position: 'relative' }}>
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
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-data)', lineHeight: 1 }}>
            {percentage.toFixed(1)}%
          </p>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>within ±{threshold}°</p>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
