import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HoverTooltip from './HoverTooltip';

describe('HoverTooltip', () => {
  it('does not render the tooltip text until hovered', () => {
    render(<HoverTooltip text="Helpful info"><span>Trigger</span></HoverTooltip>);
    expect(screen.queryByText('Helpful info')).not.toBeInTheDocument();
  });

  it('shows the tooltip text on mouse enter and hides it on mouse leave', async () => {
    const user = userEvent.setup();
    render(<HoverTooltip text="Helpful info"><span>Trigger</span></HoverTooltip>);

    await user.hover(screen.getByText('Trigger'));
    expect(await screen.findByText('Helpful info')).toBeInTheDocument();

    await user.unhover(screen.getByText('Trigger'));
    expect(screen.queryByText('Helpful info')).not.toBeInTheDocument();
  });

  it('shows the tooltip on focus and hides it on blur (keyboard accessibility)', async () => {
    const user = userEvent.setup();
    render(
      <HoverTooltip text="Helpful info">
        <button>Trigger</button>
      </HoverTooltip>
    );

    await user.tab(); // focuses the button
    expect(await screen.findByText('Helpful info')).toBeInTheDocument();

    await user.tab(); // moves focus away
    expect(screen.queryByText('Helpful info')).not.toBeInTheDocument();
  });
});
