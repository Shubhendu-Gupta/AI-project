import type { OHLCVBar } from '../types/market';
import type { StrategyConfig } from '../types/strategy';
import type { Trade, EquityCurvePoint, BacktestMetrics, BacktestResult, TradeDirection } from '../types/backtest';
import { generateSignals } from './strategies';
import {
  calcPositionSize, calcStopPrice, calcTakeProfitPrice,
  isStopTriggered, isTakeProfitTriggered,
} from './riskManagement';

interface OpenPosition {
  direction: TradeDirection;
  entryPrice: number;
  entryTime: number;
  shares: number;
  stopPrice: number;
  tpPrice: number;
}

const stdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

export const runBacktest = (
  bars: OHLCVBar[],
  config: StrategyConfig,
  initialEquity: number,
): BacktestResult => {
  const signals = generateSignals(bars, config);
  const signalMap = new Map(signals.map((s) => [s.time, s]));

  const trades: Trade[] = [];
  const equityCurve: EquityCurvePoint[] = [];
  let equity = initialEquity;
  let peak = equity;
  let position: OpenPosition | null = null;

  const closePosition = (
    exitTime: number,
    exitPrice: number,
    exitReason: Trade['exitReason'],
  ) => {
    if (!position) return;
    const mult = position.direction === 'long' ? 1 : -1;
    const pnl = (exitPrice - position.entryPrice) * position.shares * mult;
    const pnlPct = (exitPrice - position.entryPrice) / position.entryPrice * mult;
    equity += pnl;
    trades.push({
      entryTime: position.entryTime,
      exitTime,
      direction: position.direction,
      entryPrice: position.entryPrice,
      exitPrice,
      shares: position.shares,
      pnl,
      pnlPct,
      exitReason,
    });
    position = null;
  };

  // pendingSignal holds a signal from bar N to be filled at bar N+1's open (no look-ahead)
  let pendingSignal: { direction: 'long' | 'short' } | null = null;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

    // Fill pending signal at this bar's open (signal was emitted on the previous bar's close)
    if (pendingSignal && !position) {
      const entryPrice = bar.open;
      const { shares } = calcPositionSize(equity, entryPrice, config.positionSize);
      if (shares > 0) {
        position = {
          direction: pendingSignal.direction,
          entryPrice,
          entryTime: bar.time,
          shares,
          stopPrice: calcStopPrice(entryPrice, pendingSignal.direction, config.stopLoss),
          tpPrice: calcTakeProfitPrice(entryPrice, pendingSignal.direction, config.takeProfit),
        };
      }
    }
    pendingSignal = null;

    // Check stops/TP/exit-signal on open position
    if (position) {
      if (isStopTriggered(bar, position.stopPrice, position.direction)) {
        closePosition(bar.time, position.stopPrice, 'stop-loss');
      } else if (isTakeProfitTriggered(bar, position.tpPrice, position.direction)) {
        closePosition(bar.time, position.tpPrice, 'take-profit');
      } else {
        const sig = signalMap.get(bar.time);
        if (sig && sig.direction !== 'flat' && sig.direction !== position.direction) {
          closePosition(bar.time, bar.close, 'signal');
        } else if (sig && (sig.direction === 'flat')) {
          closePosition(bar.time, bar.close, 'signal');
        }
      }
    }

    // Queue signal for next-bar entry
    if (!position) {
      const sig = signalMap.get(bar.time);
      if (sig && (sig.direction === 'long' || sig.direction === 'short')) {
        pendingSignal = { direction: sig.direction };
      }
    }

    if (equity > peak) peak = equity;
    const drawdown = peak > 0 ? (peak - equity) / peak : 0;
    equityCurve.push({ time: bar.time, equity, drawdown });
  }

  // Close any open position at end of data and update the final equity curve point
  if (position && bars.length > 0) {
    closePosition(bars[bars.length - 1].time, bars[bars.length - 1].close, 'end-of-data');
    if (equity > peak) peak = equity;
    const last = equityCurve[equityCurve.length - 1];
    last.equity = equity;
    last.drawdown = peak > 0 ? (peak - equity) / peak : 0;
  }

  const metrics = computeMetrics(trades, equityCurve, initialEquity, bars);

  return { trades, equityCurve, metrics, signals, bars };
};

const computeMetrics = (
  trades: Trade[],
  equityCurve: EquityCurvePoint[],
  initialEquity: number,
  bars: OHLCVBar[],
): BacktestMetrics => {
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialEquity;
  const totalReturn = (finalEquity - initialEquity) / initialEquity;

  const years = bars.length > 1
    ? (bars[bars.length - 1].time - bars[0].time) / (365.25 * 86400)
    : 1;
  const annualizedReturn = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;

  const maxDrawdown = equityCurve.reduce((max, p) => Math.max(max, p.drawdown), 0);

  const wins  = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgWin  = wins.length  > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss  / losses.length : 0;

  // Compute Sharpe from daily equity returns (bar-over-bar) for proper annualization
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    if (prev > 0) dailyReturns.push((equityCurve[i].equity - prev) / prev);
  }
  const sd = stdDev(dailyReturns);
  const meanReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
    : 0;
  const sharpeRatio = sd > 0 ? (meanReturn / sd) * Math.sqrt(252) : 0;

  return {
    totalReturn,
    annualizedReturn,
    sharpeRatio,
    maxDrawdown,
    winRate,
    totalTrades: trades.length,
    profitFactor,
    avgWin,
    avgLoss,
  };
};
