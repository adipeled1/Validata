import { describe, it, expect } from 'vitest';
import { getGridColor, getAxisTextColor, getAxisTick, getTooltipBg } from './chartConfig';

describe('chartConfig theme-aware helpers', () => {
  it('return distinct values for dark vs light theme', () => {
    expect(getGridColor('dark')).not.toBe(getGridColor('light'));
    expect(getAxisTextColor('dark')).not.toBe(getAxisTextColor('light'));
    expect(getTooltipBg('dark')).not.toBe(getTooltipBg('light'));
  });

  it('getAxisTick composes a fontSize and the theme-aware fill color', () => {
    const tick = getAxisTick('dark');
    expect(tick.fontSize).toBe(11);
    expect(tick.fill).toBe(getAxisTextColor('dark'));
  });
});
