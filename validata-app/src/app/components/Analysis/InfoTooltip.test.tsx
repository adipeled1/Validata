import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import InfoTooltip from './InfoTooltip';

describe('InfoTooltip', () => {
  it('renders the tooltip text (shown via CSS on hover, always present in the DOM)', () => {
    render(<InfoTooltip text="RMSE explanation here" />);
    expect(screen.getByText('RMSE explanation here')).toBeInTheDocument();
  });
});
