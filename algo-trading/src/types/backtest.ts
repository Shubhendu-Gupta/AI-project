import type { OHLCVBar } from './market';
import type { Signal } from './strategy';

export type TradeDirection = 'long' | 'short';

export interface Trade {
  entryTime: number;
  exitTime: number;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPct: number;
  exitReason: 'signal' | 'stop-loss' | 'take-profit' | 'end-of-data';
}

export interface EquityCurvePoint {
  time: number;
  equity: number;
  drawdown: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: EquityCurvePoint[];
  metrics: BacktestMetrics;
  signals: Signal[];
  bars: OHLCVBar[];
}
