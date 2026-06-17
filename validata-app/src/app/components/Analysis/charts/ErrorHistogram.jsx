import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Label,
} from 'recharts';
import { COLORS, AXIS_TICK, CHART_MARGIN, CHART_HEIGHT } from '../chartConfig';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs space-y-1">
      <p className="text-slate-600">Error starts at <span className="font-medium">{label}°</span></p>
      <p style={{ color: COLORS.primary }}>{payload[0].value} measurement{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

// Histogram of AI − goniometer errors; a narrow peak around 0 = consistently accurate AI
const ErrorHistogram = ({ data }) => {
  if (!data || !data.bins?.length) return null;

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data.bins} margin={CHART_MARGIN} barCategoryGap="5%">
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis dataKey="range" tick={AXIS_TICK}>
          <Label value="Error (degrees)" position="insideBottom" offset={-20} fontSize={11} fill="#64748b" />
        </XAxis>
        <YAxis allowDecimals={false} tick={AXIS_TICK}>
          <Label value="Number of measurements" angle={-90} position="insideLeft" offset={20} fontSize={11} fill="#64748b" />
        </YAxis>
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="count" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ErrorHistogram;
