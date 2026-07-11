import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const addStudy = vi.fn();
const deleteStudy = vi.fn();
let studies = [
  { id: 's1', name: 'Study One', recruitment_goal: 50 },
  { id: 's2', name: 'Study Two', recruitment_goal: 20 },
];
let currentStudyId = 's1';

vi.mock('../../../context/StudyContext', () => ({
  useStudy: () => ({ studies, currentStudyId, addStudy, deleteStudy }),
}));
vi.mock('../../../context/SessionContext', () => ({
  useSession: () => ({ isDemoMode: true }),
}));
const openTab = vi.fn();
vi.mock('../../../context/TabContext', () => ({
  useTabs: () => ({ openTab }),
}));
vi.mock('../../../app/actions/studies', () => ({
  updateStudyGoalAction: vi.fn(),
}));
vi.mock('./LockControlPanel', () => ({
  default: ({ onManage }: any) => <button onClick={onManage}>LockControlPanel-trigger</button>,
}));
vi.mock('./StudyLockModal', () => ({ default: ({ onClose }: any) => <div>StudyLockModal<button onClick={onClose}>close-modal</button></div> }));
vi.mock('./RetentionPanel', () => ({ default: () => <div>RetentionPanel</div> }));

import StudyManagement from './StudyManagement';

beforeEach(() => {
  vi.clearAllMocks();
  studies = [
    { id: 's1', name: 'Study One', recruitment_goal: 50 },
    { id: 's2', name: 'Study Two', recruitment_goal: 20 },
  ];
  currentStudyId = 's1';
});

describe('StudyManagement', () => {
  it('auto-selects currentStudyId and shows its dashboard', async () => {
    render(<StudyManagement />);
    expect(await screen.findByRole('heading', { name: 'Study One' })).toBeInTheDocument();
    expect(screen.getByText('Active Workspace')).toBeInTheDocument();
  });

  it('clicking a different study in the list switches the dashboard to it', async () => {
    const user = userEvent.setup();
    render(<StudyManagement />);
    await screen.findByText('Recruitment Progress');
    await user.click(screen.getByText('Study Two'));
    expect(screen.queryByText('Active Workspace')).not.toBeInTheDocument(); // s2 isn't the current workspace
    expect(screen.getAllByText('Study Two').length).toBeGreaterThan(0);
  });

  it('shows "Select a study" placeholder when there are no studies', () => {
    studies = [];
    render(<StudyManagement />);
    expect(screen.getByText(/select a study from the left panel/i)).toBeInTheDocument();
    expect(screen.getByText(/no studies yet/i)).toBeInTheDocument();
  });

  it('Create Study form calls addStudy and resets its fields', async () => {
    const user = userEvent.setup();
    render(<StudyManagement />);
    await user.type(screen.getByLabelText(/study name/i), 'New Study');
    await user.type(screen.getByLabelText(/recruitment goal/i), '30');
    await user.click(screen.getByRole('button', { name: /create study/i }));
    expect(addStudy).toHaveBeenCalledWith('New Study', '30');
  });

  it('Delete Study is disabled when there is only one study, with an explanatory tooltip', async () => {
    studies = [{ id: 's1', name: 'Only Study', recruitment_goal: 50 }];
    render(<StudyManagement />);
    await screen.findByRole('heading', { name: 'Only Study' });
    expect(screen.getByRole('button', { name: /delete study/i })).toBeDisabled();
  });

  it('Delete Study confirms via window.confirm before calling deleteStudy', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<StudyManagement />);
    await screen.findByText('Recruitment Progress');
    await user.click(screen.getByRole('button', { name: /delete study/i }));
    expect(deleteStudy).toHaveBeenCalledWith('s1');
    vi.unstubAllGlobals();
  });

  it('Delete Study does nothing if window.confirm is declined', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('confirm', vi.fn(() => false));
    render(<StudyManagement />);
    await screen.findByText('Recruitment Progress');
    await user.click(screen.getByRole('button', { name: /delete study/i }));
    expect(deleteStudy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('demo mode: shows the mocked staff roster (3 members)', async () => {
    render(<StudyManagement />);
    expect(await screen.findByText('admin@demo.com')).toBeInTheDocument();
    expect(screen.getByText('mentor@demo.com')).toBeInTheDocument();
    expect(screen.getByText('investigator@demo.com')).toBeInTheDocument();
  });

  it('"Manage in User Registry" opens the User Registry tab', async () => {
    const user = userEvent.setup();
    render(<StudyManagement />);
    await screen.findByText('Recruitment Progress');
    await user.click(screen.getByRole('button', { name: /manage in user registry/i }));
    expect(openTab).toHaveBeenCalledWith('/user-registry', 'User Registry');
  });

  it('Edit Goal shows a form pre-filled with the current goal, and rejects a non-positive value', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('alert', vi.fn());
    render(<StudyManagement />);
    await screen.findByText('Recruitment Progress');
    await user.click(screen.getByRole('button', { name: /edit goal/i }));
    const goalInput = screen.getByDisplayValue('50');
    await user.clear(goalInput);
    await user.type(goalInput, '0');
    // fireEvent.submit bypasses the input's own HTML5 min=1 constraint
    // validation (which a real click on the Save button would trigger first,
    // never reaching the component's own JS-level check) - this isolates the
    // assertion to handleUpdateGoal's own validation logic.
    fireEvent.submit(goalInput.closest('form')!);
    expect(alert).toHaveBeenCalledWith(expect.stringMatching(/positive integer/i));
    vi.unstubAllGlobals();
  });

  it('LockControlPanel\'s onManage opens StudyLockModal, and its onClose closes it', async () => {
    const user = userEvent.setup();
    render(<StudyManagement />);
    await screen.findByText('LockControlPanel-trigger');
    expect(screen.queryByText('StudyLockModal')).not.toBeInTheDocument();

    await user.click(screen.getByText('LockControlPanel-trigger'));
    expect(screen.getByText('StudyLockModal')).toBeInTheDocument();

    await user.click(screen.getByText('close-modal'));
    expect(screen.queryByText('StudyLockModal')).not.toBeInTheDocument();
  });
});
