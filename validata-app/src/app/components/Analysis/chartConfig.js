// Shared color constants — same color always means the same thing across all charts
export const COLORS = {
  primary:    '#6366f1',  // indigo-500  — scatter points, histogram bars
  bias:       '#4f46e5',  // indigo-700  — mean bias / perfect-agreement reference
  limit:      '#f43f5e',  // rose-500    — ±1.96 SD limits, fail
  pass:       '#10b981',  // emerald-500 — pass, MAE line
  fail:       '#f43f5e',  // rose-500    — fail
  rmse:       '#4f46e5',  // indigo-700  — RMSE trend line
  mae:        '#10b981',  // emerald-500 — MAE trend line
  grid:       '#f1f5f9',  // slate-100   — chart grid lines
};

// Shared axis tick style used in every recharts axis
export const AXIS_TICK = { fontSize: 11, fill: '#64748b' };

// Shared margin for recharts charts
export const CHART_MARGIN = { top: 10, right: 50, bottom: 34, left: 10 };

export const CHART_HEIGHT = 256;
