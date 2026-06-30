import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Label,
} from 'recharts';
import { COLORS, CHART_MARGIN, CHART_HEIGHT, getGridColor, getAxisTick, getAxisTextColor } from '../chartConfig';
import { useTheme } from '../../../../context/ThemeContext';
import YLabelChart from './YLabelChart';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const diff = (d.aiAngle - d.goniometerAngle).toFixed(2);
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-md text-xs space-y-1">
      <p className="font-semibold text-slate-700 dark:text-slate-300">{d.participantId || 'Unknown'}</p>
      <p className="text-slate-600 dark:text-slate-300">Goniometer: <span className="font-medium">{d.goniometerAngle?.toFixed(1)}°</span></p>
      <p style={{ color: COLORS.primary }}>AI model: <span className="font-medium">{d.aiAngle?.toFixed(1)}°</span></p>
      <p className={`${Math.abs(diff) > 5 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
        Difference: {diff > 0 ? '+' : ''}{diff}°
      </p>
    </div>
  );
};

// x = goniometerAngle, y = aiAngle — points on the dashed diagonal = perfect agreement
const AgreementScatter = ({ data }) => {
  const { theme } = useTheme();
  if (!data?.length) return null;

  const all = data.flatMap((d) => [d.goniometerAngle, d.aiAngle]);
  const minVal = Math.floor(Math.min(...all)) - 2;
  const maxVal = Math.ceil(Math.max(...all)) + 2;
  const axisTextColor = getAxisTextColor(theme);

  return (
    <YLabelChart label="AI angle (degrees)" color={axisTextColor}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ScatterChart margin={{ ...CHART_MARGIN, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={getGridColor(theme)} />
          <XAxis type="number" dataKey="goniometerAngle" domain={[minVal, maxVal]} tick={getAxisTick(theme)}>
            <Label value="Goniometer angle (degrees)" position="insideBottom" offset={-20} fontSize={11} fill={axisTextColor} />
          </XAxis>
          <YAxis type="number" dataKey="aiAngle" domain={[minVal, maxVal]} tick={getAxisTick(theme)} width={35} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <ReferenceLine
            segment={[{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }]}
            stroke={COLORS.bias}
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={{ value: 'Perfect agreement (y = x)', position: 'insideTopLeft', fontSize: 10, fill: COLORS.bias }}
          />
          <Scatter data={data} fill={COLORS.primary} opacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    </YLabelChart>
  );
};

export default AgreementScatter;
