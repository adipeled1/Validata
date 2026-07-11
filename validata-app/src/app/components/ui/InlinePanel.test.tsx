import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlinePanel from './InlinePanel';

describe('InlinePanel', () => {
  it('renders nothing when isOpen is false', () => {
    render(<InlinePanel isOpen={false} onClose={vi.fn()} title="My Panel">Content</InlinePanel>);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.queryByText('My Panel')).not.toBeInTheDocument();
  });

  it('renders the title and children when open', () => {
    render(<InlinePanel isOpen onClose={vi.fn()} title="My Panel">Content</InlinePanel>);
    expect(screen.getByText('My Panel')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onClose when the × button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<InlinePanel isOpen onClose={onClose} title="My Panel">Content</InlinePanel>);
    await user.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the default width of 360px when none is given', () => {
    const { container } = render(<InlinePanel isOpen onClose={vi.fn()} title="My Panel">Content</InlinePanel>);
    expect((container.firstChild as HTMLElement).style.width).toBe('360px');
  });

  it('honors a custom width prop', () => {
    const { container } = render(<InlinePanel isOpen onClose={vi.fn()} title="My Panel" width="320px">Content</InlinePanel>);
    expect((container.firstChild as HTMLElement).style.width).toBe('320px');
  });
});
