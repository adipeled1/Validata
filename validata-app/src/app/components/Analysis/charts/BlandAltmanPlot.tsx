import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Label,
} from 'recharts';
import { COLORS, CHART_MARGIN, CHART_HEIGHT, getGridColor, getAxisTick, getAxisTextColor } from '../chartConfig';
import { useTheme } from '../../../../context/ThemeContext';
import YLabelChart from './YLabelChart';

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '8px 10px', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{d.participantId || 'Unknown'}</p>
      <p style={{ color: 'var(--text-secondary)' }}>Mean angle: <strong>{d.mean?.toFixed(1)}°</strong></p>
      <p style={{ color: Number(d.diff) >= 0 ? COLORS.bias : COLORS.limit }}>
        AI − Goniometer: <strong>{Number(d.diff) >= 0 ? '+' : ''}{d.diff?.toFixed(2)}°</strong>
      </p>
    </div>
  );
};

interface BlandAltmanData {
  plotData: any[];
  meanDiff: number;
  upperLimit: number;
  lowerLimit: number;
}

// x = mean of (AI, goniometer), y = AI − goniometer
// Solid line = mean bias; dashed lines = 95% limits of agreement (±1.96 SD)
const BlandAltmanPlot = ({ data }: { data?: BlandAltmanData }) => {
  const { theme } = useTheme();
  if (!data || !data.plotData?.length) return null;

  const { plotData, meanDiff, upperLimit, lowerLimit } = data;
  const gridColor = getGridColor(theme);
  const axisTextColor = getAxisTextColor(theme);

  return (
    <YLabelChart label="AI − Goniometer (degrees)" color={axisTextColor}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ScatterChart margin={{ ...CHART_MARGIN, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis type="number" dataKey="mean" tick={getAxisTick(theme)}>
            <Label value="Mean of AI & Goniometer (degrees)" position="insideBottom" offset={-20} fontSize={11} fill={axisTextColor} />
          </XAxis>
          <YAxis type="number" dataKey="diff" tick={getAxisTick(theme)} width={35} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <ReferenceLine y={0} stroke={gridColor} strokeWidth={1} />
          <ReferenceLine
            y={meanDiff}
            stroke={COLORS.bias}
            strokeWidth={2}
            label={{ value: `Bias: ${meanDiff.toFixed(2)}°`, position: 'insideTopRight', fontSize: 10, fill: COLORS.bias }}
          />
          <ReferenceLine
            y={upperLimit}
            stroke={COLORS.limit}
            strokeDasharray="4 4"
            label={{ value: `+1.96 SD: ${upperLimit.toFixed(2)}°`, position: 'insideTopRight', fontSize: 10, fill: COLORS.limit }}
          />
          <ReferenceLine
            y={lowerLimit}
            stroke={COLORS.limit}
            strokeDasharray="4 4"
            label={{ value: `−1.96 SD: ${lowerLimit.toFixed(2)}°`, position: 'insideBottomRight', fontSize: 10, fill: COLORS.limit }}
          />
          <Scatter data={plotData} fill={COLORS.primary} opacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    </YLabelChart>
  );
};

export default BlandAltmanPlot;
