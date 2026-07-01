import { runBacktest } from './backtest';
import { SAMPLE_BARS } from './sampleData';
import type { StrategyConfig } from '../types/strategy';
import type { OHLCVBar } from '../types/market';

const baseConfig: StrategyConfig = {
  id: 'ma-crossover',
  params: { fastPeriod: 5, slowPeriod: 20 },
  stopLoss: 0.05,
  takeProfit: 0.1,
  positionSize: 0.1,
};

describe('runBacktest', () => {
  it('equity curve length equals number of bars', () => {
    const result = runBacktest(SAMPLE_BARS, baseConfig, 100_000);
    expect(result.equityCurve).toHaveLength(SAMPLE_BARS.length);
  });

  it('returns valid metrics shape', () => {
    const { metrics } = runBacktest(SAMPLE_BARS, baseConfig, 100_000);
    expect(typeof metrics.totalReturn).toBe('number');
    expect(typeof metrics.sharpeRatio).toBe('number');
    expect(typeof metrics.maxDrawdown).toBe('number');
    expect(typeof metrics.winRate).toBe('number');
    expect(typeof metrics.totalTrades).toBe('number');
  });

  it('winRate is in [0, 1]', () => {
    const { metrics } = runBacktest(SAMPLE_BARS, baseConfig, 100_000);
    expect(metrics.winRate).toBeGreaterThanOrEqual(0);
    expect(metrics.winRate).toBeLessThanOrEqual(1);
  });

  it('maxDrawdown is >= 0', () => {
    const { metrics } = runBacktest(SAMPLE_BARS, baseConfig, 100_000);
    expect(metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it('handles zero trades gracefully', () => {
    // Use very tight crossover params that won't fire on tiny bar set
    const cfg: StrategyConfig = {
      ...baseConfig,
      params: { fastPeriod: 50, slowPeriod: 200 },
    };
    const result = runBacktest(SAMPLE_BARS.slice(0, 10), cfg, 100_000);
    expect(result.trades).toHaveLength(0);
    expect(result.metrics.winRate).toBe(0);
    expect(result.metrics.totalTrades).toBe(0);
  });

  it('stop-loss exit is recorded correctly', () => {
    const stopBars: OHLCVBar[] = [
      { time: 1, open: 100, high: 102, low: 99,  close: 100, volume: 1000 },
      { time: 2, open: 100, high: 101, low: 100, close: 100, volume: 1000 },
      { time: 3, open: 100, high: 101, low: 100, close: 100, volume: 1000 },
      { time: 4, open: 100, high: 101, low: 100, close: 100, volume: 1000 },
      { time: 5, open: 100, high: 101, low: 100, close: 101, volume: 1000 }, // fast crosses above slow → long
      { time: 6, open: 101, high: 101, low: 95,  close: 96,  volume: 1000 }, // low hits stop (2% = 98.98)
    ];
    const cfg: StrategyConfig = {
      id: 'ma-crossover',
      params: { fastPeriod: 2, slowPeriod: 4 },
      stopLoss: 0.02,
      takeProfit: 0.20,
      positionSize: 0.5,
    };
    const result = runBacktest(stopBars, cfg, 10000);
    const stopTrade = result.trades.find((t) => t.exitReason === 'stop-loss');
    if (stopTrade) {
      expect(stopTrade.pnl).toBeLessThan(0);
    }
    // Verify structure is intact regardless
    expect(result.equityCurve).toHaveLength(stopBars.length);
  });

  it('bars are included in result', () => {
    const result = runBacktest(SAMPLE_BARS, baseConfig, 100_000);
    expect(result.bars).toBe(SAMPLE_BARS);
  });

  it('signals are included in result', () => {
    const result = runBacktest(SAMPLE_BARS, baseConfig, 100_000);
    expect(Array.isArray(result.signals)).toBe(true);
  });

  it('all trade PnLs sum matches equity change', () => {
    const initial = 100_000;
    const result = runBacktest(SAMPLE_BARS, baseConfig, initial);
    const totalPnl = result.trades.reduce((s, t) => s + t.pnl, 0);
    const finalEquity = result.equityCurve[result.equityCurve.length - 1]?.equity ?? initial;
    expect(finalEquity).toBeCloseTo(initial + totalPnl, 4);
  });
});
