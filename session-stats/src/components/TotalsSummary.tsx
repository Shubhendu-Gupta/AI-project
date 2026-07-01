interface Props {
  totalCost: number;
  linesAdded: number;
  linesRemoved: number;
  sessionCount: number;
}

export const TotalsSummary = ({ totalCost, linesAdded, linesRemoved, sessionCount }: Props) => {
  if (sessionCount === 0) return null;

  return (
    <div className="totals-summary">
      <h2>Totals across {sessionCount} session{sessionCount !== 1 ? 's' : ''}</h2>
      <div className="totals-summary__grid">
        <div className="stat">
          <span className="stat__label">Total Cost</span>
          <span className="stat__value">${totalCost.toFixed(2)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Lines Added</span>
          <span className="stat__value">+{linesAdded.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Lines Removed</span>
          <span className="stat__value">-{linesRemoved.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Net Lines</span>
          <span className="stat__value">{(linesAdded - linesRemoved).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
