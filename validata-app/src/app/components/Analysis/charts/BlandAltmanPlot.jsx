import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Label,
} from 'recharts';
import { COLORS, CHART_MARGIN, CHART_HEIGHT, getGridColor, getAxisTick, getAxisTextColor } from '../chartConfig';
import { useTheme } from '../../../../context/ThemeContext';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-md text-xs space-y-1">
      <p className="font-semibold text-slate-700 dark:text-slate-300">{d.participantId || 'Unknown'}</p>
      <p className="text-slate-600 dark:text-slate-300">Mean angle: <span className="font-medium">{d.mean?.toFixed(1)}°</span></p>
      <p style={{ color: Number(d.diff) >= 0 ? COLORS.bias : COLORS.limit }}>
        AI − Goniometer: <span className="font-medium">{Number(d.diff) >= 0 ? '+' : ''}{d.diff?.toFixed(2)}°</span>
      </p>
    </div>
  );
};

// x = mean of (AI, goniometer), y = AI − goniometer
// Solid line = mean bias; dashed lines = 95% limits of agreement (±1.96 SD)
const BlandAltmanPlot = ({ data }) => {
  const { theme } = useTheme();
  if (!data || !data.plotData?.length) return null;

  const { plotData, meanDiff, upperLimit, lowerLimit } = data;
  const gridColor = getGridColor(theme);
  const axisTextColor = getAxisTextColor(theme);

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <ScatterChart margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis type="number" dataKey="mean" tick={getAxisTick(theme)}>
          <Label value="Mean of AI & Goniometer (degrees)" position="insideBottom" offset={-20} fontSize={11} fill={axisTextColor} />
        </XAxis>
        <YAxis type="number" dataKey="diff" tick={getAxisTick(theme)}>
          <Label value="AI − Goniometer (degrees)" angle={-90} position="insideLeft" offset={20} fontSize={11} fill={axisTextColor} />
        </YAxis>
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        {/* Zero reference */}
        <ReferenceLine y={0} stroke={gridColor} strokeWidth={1} />
        {/* Mean bias */}
        <ReferenceLine
          y={meanDiff}
          stroke={COLORS.bias}
          strokeWidth={2}
          label={{ value: `Bias: ${meanDiff.toFixed(2)}°`, position: 'insideTopRight', fontSize: 10, fill: COLORS.bias }}
        />
        {/* Upper limit of agreement */}
        <ReferenceLine
          y={upperLimit}
          stroke={COLORS.limit}
          strokeDasharray="4 4"
          label={{ value: `+1.96 SD: ${upperLimit.toFixed(2)}°`, position: 'insideTopRight', fontSize: 10, fill: COLORS.limit }}
        />
        {/* Lower limit of agreement */}
        <ReferenceLine
          y={lowerLimit}
          stroke={COLORS.limit}
          strokeDasharray="4 4"
          label={{ value: `−1.96 SD: ${lowerLimit.toFixed(2)}°`, position: 'insideBottomRight', fontSize: 10, fill: COLORS.limit }}
        />
        <Scatter data={plotData} fill={COLORS.primary} opacity={0.75} />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default BlandAltmanPlot;
