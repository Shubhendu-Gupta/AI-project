import './LeaderboardButton.css';

/**
 * LeaderboardButton component displays a button to open the leaderboard
 * @param {() => void} onClick - Callback when button is clicked
 */
interface LeaderboardButtonProps {
  onClick: () => void;
}

export const LeaderboardButton = ({ onClick }: LeaderboardButtonProps) => {
  return (
    <button className="leaderboard-button" onClick={onClick} aria-label="View leaderboard">
      <span className="trophy-icon">🏆</span>
      <span className="button-text">Leaderboard</span>
    </button>
  );
};
