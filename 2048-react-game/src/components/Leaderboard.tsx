import { useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardProps } from '../types/leaderboard';
import { getLeaderboard, clearLeaderboard } from '../utils/leaderboardStorage';
import './Leaderboard.css';

/**
 * Leaderboard component displays top scores in a modal popup
 * @param {boolean} isOpen - Controls modal visibility
 * @param {() => void} onClose - Callback when modal is closed
 * @param {number} currentScore - Optional current game score to highlight
 */
export const Leaderboard = ({ isOpen, onClose, currentScore }: LeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      setEntries(getLeaderboard());
    }
  }, [isOpen]);

  const handleClearLeaderboard = () => {
    if (window.confirm('Are you sure you want to clear all leaderboard entries?')) {
      clearLeaderboard();
      setEntries([]);
    }
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h2>Leaderboard</h2>
          <button className="close-button" onClick={onClose} aria-label="Close leaderboard">
            ×
          </button>
        </div>

        <div className="leaderboard-content">
          {entries.length === 0 ? (
            <p className="empty-message">No scores yet. Play a game to get on the leaderboard!</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Score</th>
                  <th>Max Tile</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={currentScore === entry.score ? 'current-score' : ''}
                  >
                    <td className="rank-cell">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </td>
                    <td className="score-cell">{entry.score.toLocaleString()}</td>
                    <td className="tile-cell">{entry.maxTile}</td>
                    <td className="date-cell">{formatDate(entry.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {entries.length > 0 && (
          <div className="leaderboard-footer">
            <button className="clear-button" onClick={handleClearLeaderboard}>
              Clear Leaderboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
