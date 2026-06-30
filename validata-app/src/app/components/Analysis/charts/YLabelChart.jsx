import { CHART_HEIGHT, CHART_MARGIN } from '../chartConfig';

// Renders a rotated Y-axis label outside the SVG (avoids Recharts clip-path cutting the text).
// The label is centered on the plot area, not the full div, by offsetting for the asymmetric margins.
const plotCenterOffset = (CHART_MARGIN.bottom - CHART_MARGIN.top) / 2;

const YLabelChart = ({ label, color, children }) => (
  <div style={{ display: 'flex', height: CHART_HEIGHT }}>
    <div style={{ position: 'relative', width: 16, flexShrink: 0 }}>
      <span style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, calc(-50% - ${plotCenterOffset}px)) rotate(-90deg)`,
        fontSize: 11,
        color,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
    {children}
  </div>
);

export default YLabelChart;
