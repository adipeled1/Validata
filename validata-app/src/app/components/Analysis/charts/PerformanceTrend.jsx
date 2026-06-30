import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label,
} from 'recharts';
import { COLORS, CHART_MARGIN, CHART_HEIGHT, getGridColor, getAxisTick, getAxisTextColor } from '../chartConfig';
import { useTheme } from '../../../../context/ThemeContext';
import YLabelChart from './YLabelChart';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-md text-xs space-y-1">
      <p className="font-semibold text-slate-700 dark:text-slate-300">Session: {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{p.value}°</span>
        </p>
      ))}
    </div>
  );
};

// RMSE and MAE per session over time — requires at least 2 sessions to show a trend
const PerformanceTrend = ({ data }) => {
  const { theme } = useTheme();
  if (!data || !data.sessions) return null;

  const { sessions } = data;

  if (sessions.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 text-sm text-center px-6">
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
