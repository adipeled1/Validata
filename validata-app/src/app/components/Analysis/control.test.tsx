import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./service', () => ({ fetchAnalysisData: vi.fn() }));
vi.mock('./display', () => ({
  default: ({ threshold, isLoadingCharts }: any) => (
    <div>AnalysisDisplay threshold={threshold} loading={String(isLoadingCharts)}</div>
  ),
}));
vi.mock('../common/EndorseDataModal', () => ({
  default: ({ onClose, onSuccess }: any) => (
    <div>
      EndorseDataModal
      <button onClick={() => onSuccess('2026-07-11T00:00:00Z')}>fake-sign</button>
      <button onClick={onClose}>fake-close</button>
    </div>
  ),
}));

import AnalysisControl from './control';
import { fetchAnalysisData } from './service';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchAnalysisData).mockResolvedValue({ summaryStats: { rmse: 1 } });
});

describe('AnalysisControl', () => {
  it('does nothing (no fetch) when there is no studyId', () => {
    render(<AnalysisControl isDemoMode userRole="investigator" />);
    expect(fetchAnalysisData).not.toHaveBeenCalled();
  });

  it('fetches analysis data for the given studyId/threshold on mount', async () => {
    render(<AnalysisControl isDemoMode studyId="s1" threshold={7} userRole="investigator" />);
    expect(fetchAnalysisData).toHaveBeenCalledWith(7, 's1');
    expect(await screen.findByText(/loading=false/)).toBeInTheDocument();
  });

  it('falls back to empty stats when the API returns an error field', async () => {
    vi.mocked(fetchAnalysisData).mockResolvedValue({ error: 'boom' });
    render(<AnalysisControl isDemoMode studyId="s1" userRole="investigator" />);
    expect(await screen.findByText(/loading=false/)).toBeInTheDocument(); // still resolves out of loading state
  });

  it('falls back to empty stats when the fetch itself rejects', async () => {
    vi.mocked(fetchAnalysisData).mockRejectedValue(new Error('network down'));
    render(<AnalysisControl isDemoMode studyId="s1" userRole="investigator" />);
    expect(await screen.findByText(/loading=false/)).toBeInTheDocument();
  });

  it('Endorse Data button only shows for SIGNING_ROLES', () => {
    const { rerender } = render(<AnalysisControl isDemoMode studyId="s1" userRole="site_coordinator" />);
    expect(screen.queryByText('Endorse Data')).not.toBeInTheDocument();
    rerender(<AnalysisControl isDemoMode studyId="s1" userRole="investigator" />);
    expect(screen.getByText('Endorse Data')).toBeInTheDocument();
  });

  it('opens EndorseDataModal, and a successful sign shows the endorsed timestamp and closes it', async () => {
    const user = userEvent.setup();
    render(<AnalysisControl isDemoMode studyId="s1" currentUserEmail="mentor@demo.com" userRole="mentor" />);
    await user.click(screen.getByText('Endorse Data'));
    expect(screen.getByText('EndorseDataModal')).toBeInTheDocument();

    await user.click(screen.getByText('fake-sign'));
    expect(screen.queryByText('EndorseDataModal')).not.toBeInTheDocument();
    expect(screen.getByText(/endorsed/i)).toBeInTheDocument();
  });

  it('does not render the modal without a studyId or currentUserEmail, even if canSign', async () => {
    const user = userEvent.setup();
    render(<AnalysisControl isDemoMode studyId="s1" userRole="mentor" />); // no currentUserEmail
    await user.click(screen.getByText('Endorse Data'));
    expect(screen.queryByText('EndorseDataModal')).not.toBeInTheDocument();
  });
});
