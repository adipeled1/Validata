import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Label,
} from 'recharts';
import { COLORS, CHART_MARGIN, CHART_HEIGHT, getGridColor, getAxisTick, getAxisTextColor } from '../chartConfig';
import { useTheme } from '../../../../context/ThemeContext';
import YLabelChart from './YLabelChart';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-md text-xs space-y-1">
      <p className="text-slate-600 dark:text-slate-300">Error starts at <span className="font-medium">{label}°</span></p>
      <p style={{ color: COLORS.primary }}>{payload[0].value} measurement{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

// Histogram of AI − goniometer errors; a narrow peak around 0 = consistently accurate AI
const ErrorHistogram = ({ data }: { data?: { bins: any[] } }) => {
  const { theme } = useTheme();
  if (!data || !data.bins?.length) return null;
  const axisTextColor = getAxisTextColor(theme);

  return (
    <YLabelChart label="Number of measurements" color={axisTextColor}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={data.bins} margin={{ ...CHART_MARGIN, left: 5 }} barCategoryGap="5%">
          <CartesianGrid strokeDasharray="3 3" stroke={getGridColor(theme)} />
          <XAxis dataKey="range" tick={getAxisTick(theme)}>
            <Label value="Error (degrees)" position="insideBottom" offset={-20} fontSize={11} fill={axisTextColor} />
          </XAxis>
          <YAxis allowDecimals={false} tick={getAxisTick(theme)} width={35} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f8fafc' }} />
          <Bar dataKey="count" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </YLabelChart>
  );
};

export default ErrorHistogram;
