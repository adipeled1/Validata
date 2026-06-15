import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Label,
} from 'recharts';
import { COLORS, AXIS_TICK, CHART_MARGIN, CHART_HEIGHT } from '../chartConfig';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const diff = (d.aiAngle - d.goniometerAngle).toFixed(2);
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs space-y-1">
      <p className="font-semibold text-slate-700">{d.participantId || 'Unknown'}</p>
      <p className="text-slate-600">Goniometer: <span className="font-medium">{d.goniometerAngle?.toFixed(1)}°</span></p>
      <p style={{ color: COLORS.primary }}>AI model: <span className="font-medium">{d.aiAngle?.toFixed(1)}°</span></p>
      <p className={`${Math.abs(diff) > 5 ? 'text-rose-500' : 'text-slate-500'}`}>
        Difference: {diff > 0 ? '+' : ''}{diff}°
      </p>
    </div>
  );
};

// x = goniometerAngle, y = aiAngle — points on the dashed diagonal = perfect agreement
const AgreementScatter = ({ data }) => {
  if (!data?.length) return null;

  const all = data.flatMap((d) => [d.goniometerAngle, d.aiAngle]);
  const minVal = Math.floor(Math.min(...all)) - 2;
  const maxVal = Math.ceil(Math.max(...all)) + 2;

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <ScatterChart margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis type="number" dataKey="goniometerAngle" domain={[minVal, maxVal]} tick={AXIS_TICK}>
          <Label value="Goniometer angle (degrees)" position="insideBottom" offset={-20} fontSize={11} fill="#64748b" />
        </XAxis>
        <YAxis type="number" dataKey="aiAngle" domain={[minVal, maxVal]} tick={AXIS_TICK}>
          <Label value="AI angle (degrees)" angle={-90} position="insideLeft" offset={20} fontSize={11} fill="#64748b" />
        </YAxis>
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        {/* y = x diagonal: perfect agreement line */}
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
  );
};

export default AgreementScatter;
