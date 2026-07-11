import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const activateTab = vi.fn();
const closeTab = vi.fn();
const closeAllTabs = vi.fn();
const closeOtherTabs = vi.fn();
const closeTabsToRight = vi.fn();
let tabs: { id: string; label: string }[] = [];
let activeTabId: string | null = null;

vi.mock('../../../context/TabContext', () => ({
  useTabs: () => ({ tabs, activeTabId, activateTab, closeTab, closeAllTabs, closeOtherTabs, closeTabsToRight }),
}));

import TabBar from './TabBar';

describe('TabBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabs = [{ id: 't1', label: 'Participants' }, { id: 't2', label: 'Results' }];
    activeTabId = 't1';
  });

  it('renders nothing when there are no open tabs', () => {
    tabs = [];
    const { container } = render(<TabBar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a tab per open tab, and clicking one activates it', async () => {
    const user = userEvent.setup();
    render(<TabBar />);
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();

    await user.click(screen.getByText('Results'));
    expect(activateTab).toHaveBeenCalledWith('t2');
  });

  it('clicking a tab\'s × closes just that tab, without activating it', async () => {
    const user = userEvent.setup();
    render(<TabBar />);
    const closeButtons = screen.getAllByTitle('Close (Ctrl+W)');
    await user.click(closeButtons[1]); // Results tab's close button
    expect(closeTab).toHaveBeenCalledWith('t2');
    expect(activateTab).not.toHaveBeenCalled();
  });

  it('"Close all" calls closeAllTabs', async () => {
    const user = userEvent.setup();
    render(<TabBar />);
    await user.click(screen.getByRole('button', { name: 'Close all' }));
    expect(closeAllTabs).toHaveBeenCalledTimes(1);
  });

  it('right-clicking a tab opens a context menu with Close/Close others/Close to the right/Close all', async () => {
    const user = userEvent.setup();
    render(<TabBar />);
    await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Participants') });
    expect(screen.getByText('Close others')).toBeInTheDocument();

    await user.click(screen.getByText('Close others'));
    expect(closeOtherTabs).toHaveBeenCalledWith('t1');
  });
});
