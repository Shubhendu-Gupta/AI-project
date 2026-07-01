import type { BacktestResult } from '../../types/backtest';
import { MetricCard } from '../MetricCard/MetricCard';
import { fmtPct, fmtDollar, fmtNum } from '../../utils/formatters';
import './BacktestPanel.css';

interface Props {
  result: BacktestResult | null;
  isRunning: boolean;
}

export const BacktestPanel = ({ result, isRunning }: Props) => {
  if (isRunning) {
    return <div className="backtest-panel backtest-panel--loading">Running backtest…</div>;
  }

  if (!result) {
    return <div className="backtest-panel backtest-panel--empty">No results yet.</div>;
  }

  const { metrics, equityCurve } = result;

  // Build SVG equity sparkline
  const eq = equityCurve.map((p) => p.equity);
  const minEq = Math.min(...eq);
  const maxEq = Math.max(...eq);
  const range = maxEq - minEq || 1;
  const W = 200, H = 60;
  const points = eq
    .map((e, i) => `${(i / (eq.length - 1)) * W},${H - ((e - minEq) / range) * H}`)
    .join(' ');
  const lineColor = eq[eq.length - 1] >= eq[0] ? '#22c55e' : '#ef4444';

  return (
    <div className="backtest-panel">
      <div className="backtest-panel__header">
        <h2>Backtest Results</h2>
        <svg viewBox={`0 0 ${W} ${H}`} className="backtest-panel__sparkline">
          <polyline fill="none" stroke={lineColor} strokeWidth="1.5" points={points} />
        </svg>
      </div>

      <div className="backtest-panel__metrics">
        <MetricCard label="Total Return"      value={fmtPct(metrics.totalReturn)}      positive={metrics.totalReturn > 0} />
        <MetricCard label="Ann. Return"       value={fmtPct(metrics.annualizedReturn)}  positive={metrics.annualizedReturn > 0} />
        <MetricCard label="Sharpe Ratio"      value={fmtNum(metrics.sharpeRatio)}       positive={metrics.sharpeRatio > 1 ? true : metrics.sharpeRatio < 0 ? false : null} />
        <MetricCard label="Max Drawdown"      value={fmtPct(metrics.maxDrawdown)}       positive={false} />
        <MetricCard label="Win Rate"          value={fmtPct(metrics.winRate)}           positive={metrics.winRate > 0.5} />
        <MetricCard label="Total Trades"      value={String(metrics.totalTrades)} />
        <MetricCard label="Profit Factor"     value={isFinite(metrics.profitFactor) ? fmtNum(metrics.profitFactor) : '∞'} positive={metrics.profitFactor > 1} />
        <MetricCard label="Avg Win"           value={fmtDollar(metrics.avgWin)}         positive />
        <MetricCard label="Avg Loss"          value={fmtDollar(metrics.avgLoss)}        positive={false} />
      </div>
    </div>
  );
};
