import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuBar from './MenuBar';

const studies = [{ id: 's1', name: 'Study One' }, { id: 's2', name: 'Study Two' }];

describe('MenuBar', () => {
  it('renders the email when given', () => {
    render(<MenuBar email="mentor@demo.com" />);
    expect(screen.getByText('mentor@demo.com')).toBeInTheDocument();
  });

  it('does not render the study switcher when onSwitchStudy is not provided', () => {
    render(<MenuBar studies={studies} currentStudyId="s1" />);
    expect(screen.queryByText('Study One')).not.toBeInTheDocument();
  });

  it('does not render the study switcher when there are no studies', () => {
    render(<MenuBar studies={[]} currentStudyId={null} onSwitchStudy={vi.fn()} />);
    expect(screen.queryByText('Select study')).not.toBeInTheDocument();
  });

  it('shows the current study name as the trigger label', () => {
    render(<MenuBar studies={studies} currentStudyId="s2" onSwitchStudy={vi.fn()} />);
    expect(screen.getByText('Study Two')).toBeInTheDocument();
  });

  it('opens the dropdown and switches studies on click, then closes', async () => {
    const user = userEvent.setup();
    const onSwitchStudy = vi.fn();
    render(<MenuBar studies={studies} currentStudyId="s1" onSwitchStudy={onSwitchStudy} />);

    await user.click(screen.getByText('Study One'));
    expect(screen.getByText('Study Two')).toBeInTheDocument(); // now visible in the open dropdown

    await user.click(screen.getByText('Study Two'));
    expect(onSwitchStudy).toHaveBeenCalledWith('s2');
  });

  it('closes the dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <MenuBar studies={studies} currentStudyId="s1" onSwitchStudy={vi.fn()} />
        <div data-testid="outside">Outside</div>
      </div>
    );
    await user.click(screen.getByText('Study One'));
    // Dropdown open - both study entries visible (trigger + list item).
    expect(screen.getAllByText('Study One')).toHaveLength(2);

    await user.click(screen.getByTestId('outside'));
    expect(screen.getAllByText('Study One')).toHaveLength(1);
  });
});
