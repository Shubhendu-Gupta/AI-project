import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Leaderboard } from './Leaderboard';
import * as leaderboardStorage from '../utils/leaderboardStorage';

vi.mock('../utils/leaderboardStorage');

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const onClose = vi.fn();
    const { container } = render(<Leaderboard isOpen={false} onClose={onClose} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    const onClose = vi.fn();
    vi.mocked(leaderboardStorage.getLeaderboard).mockReturnValue([]);

    render(<Leaderboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  it('should display empty message when no entries', () => {
    const onClose = vi.fn();
    vi.mocked(leaderboardStorage.getLeaderboard).mockReturnValue([]);

    render(<Leaderboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText(/No scores yet/i)).toBeInTheDocument();
  });

  it('should display leaderboard entries', () => {
    const onClose = vi.fn();
    const mockEntries = [
      { id: '1', score: 1000, date: '2024-01-01T00:00:00.000Z', maxTile: 128 },
      { id: '2', score: 500, date: '2024-01-02T00:00:00.000Z', maxTile: 64 },
    ];
    vi.mocked(leaderboardStorage.getLeaderboard).mockReturnValue(mockEntries);

    render(<Leaderboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('64')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    vi.mocked(leaderboardStorage.getLeaderboard).mockReturnValue([]);

    render(<Leaderboard isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close leaderboard');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    vi.mocked(leaderboardStorage.getLeaderboard).mockReturnValue([]);

    const { container } = render(<Leaderboard isOpen={true} onClose={onClose} />);

    const overlay = container.querySelector('.leaderboard-overlay');
    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not close when modal content is clicked', () => {
    const onClose = vi.fn();
    vi.mocked(leaderboardStorage.getLeaderboard).mockReturnValue([]);

    const { container } = render(<Leaderboard isOpen={true} onClose={onClose} />);

    const modal = container.querySelector('.leaderboard-modal');
    if (modal) {
      fireEvent.click(modal);
    }

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should highlight current score', () => {
    const onClose = vi.fn();
    const mockEntries = [
      { id: '1', score: 1000, date: '2024-01-01T00:00:00.000Z', maxTile: 128 },
      { id: '2', score: 500, date: '2024-01-02T00:00:00.000Z', maxTile: 64 },
    ];
    vi.mocked(leaderboardStorage.getLeaderboard).mockReturnValue(mockEntries);

    const { container } = render(<Leaderboard isOpen={true} onClose={onClose} currentScore={1000} />);

    const highlightedRow = container.querySelector('.current-score');
    expect(highlightedRow).toBeInTheDocument();
  });

  it('should show medals for top 3 positions', () => {
    const onClose = vi.fn();
    const mockEntries = [
      { id: '1', score: 3000, date: '2024-01-01T00:00:00.000Z', maxTile: 256 },
      { id: '2', score: 2000, date: '2024-01-02T00:00:00.000Z', maxTile: 128 },
      { id: '3', score: 1000, date: '2024-01-03T00:00:00.000Z', maxTile: 64 },
      { id: '4', score: 500, date: '2024-01-04T00:00:00.000Z', maxTile: 32 },
    ];
    vi.mocked(leaderboardStorage.getLeaderboard).mockReturnValue(mockEntries);

    render(<Leaderboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
    expect(screen.getByText('#4')).toBeInTheDocument();
  });

  it('should clear leaderboard when confirm is accepted', async () => {
    const onClose = vi.fn();
    const mockEntries = [
      { id: '1', score: 1000, date: '2024-01-01T00:00:00.000Z', maxTile: 128 },
    ];
    vi.mocked(leaderboardStorage.getLeaderboard).mockReturnValue(mockEntries);
    vi.mocked(leaderboardStorage.clearLeaderboard).mockImplementation(() => {});

    window.confirm = vi.fn().mockReturnValue(true);

    render(<Leaderboard isOpen={true} onClose={onClose} />);

    const clearButton = screen.getByText('Clear Leaderboard');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(leaderboardStorage.clearLeaderboard).toHaveBeenCalledTimes(1);
    });
  });

  it('should not clear leaderboard when confirm is cancelled', () => {
    const onClose = vi.fn();
    const mockEntries = [
      { id: '1', score: 1000, date: '2024-01-01T00:00:00.000Z', maxTile: 128 },
    ];
    vi.mocked(leaderboardStorage.getLeaderboard).mockReturnValue(mockEntries);
    vi.mocked(leaderboardStorage.clearLeaderboard).mockImplementation(() => {});

    window.confirm = vi.fn().mockReturnValue(false);

    render(<Leaderboard isOpen={true} onClose={onClose} />);

    const clearButton = screen.getByText('Clear Leaderboard');
    fireEvent.click(clearButton);

    expect(leaderboardStorage.clearLeaderboard).not.toHaveBeenCalled();
  });
});
