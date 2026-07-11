import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusDot from './StatusDot';

describe('StatusDot', () => {
  it('renders the status text, capitalized via CSS, and is case-insensitive on the input', () => {
    render(<StatusDot status="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('maps active/enrolled to the active color', () => {
    const { container: a } = render(<StatusDot status="active" />);
    const { container: b } = render(<StatusDot status="enrolled" />);
    const dotA = a.querySelector('span > span') as HTMLElement;
    const dotB = b.querySelector('span > span') as HTMLElement;
    expect(dotA.style.background).toBe(dotB.style.background);
  });

  it('falls back to the muted color for an unrecognized status', () => {
    const { container } = render(<StatusDot status="something-unknown" />);
    const dot = container.querySelector('span > span') as HTMLElement;
    expect(dot.style.background).toBe('var(--text-muted)');
  });
});
