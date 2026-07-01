import type { ParsedSession } from '../types/session';
import { formatNumber } from '../utils/parseSession';

interface Props {
  session: ParsedSession;
  index: number;
  onRemove: (index: number) => void;
}

export const SessionCard = ({ session, index, onRemove }: Props) => {
  const { stats, error } = session;

  if (error || !stats) {
    return (
      <div className="session-card session-card--error">
        <span>Parse error: {error ?? 'Unknown'}</span>
        <button onClick={() => onRemove(index)}>Remove</button>
      </div>
    );
  }

  return (
    <div className="session-card">
      <div className="session-card__header">
        <h3>Session {index + 1}</h3>
        <button onClick={() => onRemove(index)}>Remove</button>
      </div>

      <div className="session-card__stats">
        <Stat label="Total Cost" value={`$${stats.totalCost.toFixed(2)}`} />
        <Stat label="API Duration" value={stats.totalDurationApi} />
        <Stat label="Wall Duration" value={stats.totalDurationWall} />
        <Stat label="Lines Added" value={`+${stats.linesAdded.toLocaleString()}`} />
        <Stat label="Lines Removed" value={`-${stats.linesRemoved.toLocaleString()}`} />
      </div>

      {stats.modelUsage.length > 0 && (
        <table className="model-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Input</th>
              <th>Output</th>
              <th>Cache Read</th>
              <th>Cache Write</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {stats.modelUsage.map((m) => (
              <tr key={m.model}>
                <td>{m.model}</td>
                <td>{formatNumber(m.inputTokens)}</td>
                <td>{formatNumber(m.outputTokens)}</td>
                <td>{formatNumber(m.cacheReadTokens)}</td>
                <td>{formatNumber(m.cacheWriteTokens)}</td>
                <td>${m.cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="stat">
    <span className="stat__label">{label}</span>
    <span className="stat__value">{value}</span>
  </div>
);
