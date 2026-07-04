import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label,
} from 'recharts';
import { COLORS, CHART_MARGIN, CHART_HEIGHT, getGridColor, getAxisTick, getAxisTextColor } from '../chartConfig';
import { useTheme } from '../../../../context/ThemeContext';
import YLabelChart from './YLabelChart';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '8px 10px', fontSize: '11px' }}>
      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Session: {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}°</strong>
        </p>
      ))}
    </div>
  );
};

// RMSE and MAE per session over time — requires at least 2 sessions to show a trend
const PerformanceTrend = ({ data }: { data?: { sessions: any[] } }) => {
  const { theme } = useTheme();
  if (!data || !data.sessions) return null;

  const { sessions } = data;

  if (sessions.length < 2) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '200px', background: 'var(--bg-surface-alt)',
        border: '1px dashed var(--border)',
        fontSize: '11px', color: 'var(--text-ghost)', textAlign: 'center', padding: '16px',
      }}>
        At least 2 sessions needed to show a trend
      </div>
    );
  }

  const axisTextColor = getAxisTextColor(theme);

  return (
    <YLabelChart label="Error (degrees)" color={axisTextColor}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={sessions} margin={{ ...CHART_MARGIN, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={getGridColor(theme)} />
          <XAxis dataKey="sessionId" tick={getAxisTick(theme)}>
            <Label value="Session" position="insideBottom" offset={-20} fontSize={11} fill={axisTextColor} />
          </XAxis>
          <YAxis tick={getAxisTick(theme)} width={35} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 24, color: axisTextColor }} formatter={(v) => v.toUpperCase()} />
          <Line
            type="monotone" dataKey="rmse" name="rmse"
            stroke={COLORS.rmse} strokeWidth={2}
            dot={{ r: 4, fill: COLORS.rmse }} activeDot={{ r: 6 }}
          />
          <Line
            type="monotone" dataKey="mae" name="mae"
            stroke={COLORS.mae} strokeWidth={2}
            dot={{ r: 4, fill: COLORS.mae }} activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </YLabelChart>
  );
};

export default PerformanceTrend;
