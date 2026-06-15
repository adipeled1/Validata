import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label,
} from 'recharts';
import { calculateRMSEPerSession } from '../../../utils/statistics';
import { COLORS, AXIS_TICK, CHART_MARGIN, CHART_HEIGHT } from '../chartConfig';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs space-y-1">
      <p className="font-semibold text-slate-700">Session: {label}</p>
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
  if (!data?.length) return null;

  const sessions = calculateRMSEPerSession(data);

  if (sessions.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm text-center px-6">
        At least 2 sessions needed to show a trend
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={sessions} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis dataKey="sessionId" tick={AXIS_TICK}>
          <Label value="Session" position="insideBottom" offset={-20} fontSize={11} fill="#64748b" />
        </XAxis>
        <YAxis tick={AXIS_TICK}>
          <Label value="Error (degrees)" angle={-90} position="insideLeft" offset={20} fontSize={11} fill="#64748b" />
        </YAxis>
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 24 }} formatter={(v) => v.toUpperCase()} />
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
  );
};

export default PerformanceTrend;
