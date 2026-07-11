import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartCard from './ChartCard';

describe('ChartCard', () => {
  it('renders title and children when not empty', () => {
    render(<ChartCard title="My Chart">chart content</ChartCard>);
    expect(screen.getByText('My Chart')).toBeInTheDocument();
    expect(screen.getByText('chart content')).toBeInTheDocument();
  });

  it('shows the empty-state placeholder instead of children when isEmpty', () => {
    render(<ChartCard title="My Chart" isEmpty>chart content</ChartCard>);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    expect(screen.queryByText('chart content')).not.toBeInTheDocument();
  });

  it('renders the subtitle only when given', () => {
    const { rerender } = render(<ChartCard title="t">c</ChartCard>);
    expect(screen.queryByText('sub')).not.toBeInTheDocument();
    rerender(<ChartCard title="t" subtitle="sub">c</ChartCard>);
    expect(screen.getByText('sub')).toBeInTheDocument();
  });

  it('renders an InfoTooltip only when info text is given', () => {
    const { container, rerender } = render(<ChartCard title="t">c</ChartCard>);
    expect(container.querySelector('.group')).not.toBeInTheDocument();
    rerender(<ChartCard title="t" info="extra context">c</ChartCard>);
    expect(container.querySelector('.group')).toBeInTheDocument();
  });
});
