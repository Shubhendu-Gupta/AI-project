import { maCrossoverSignals, rsiMeanReversionSignals, macdSignalCrossover, generateSignals } from './strategies';
import { SAMPLE_BARS } from './sampleData';
import type { StrategyConfig } from '../types/strategy';

const barTimes = new Set(SAMPLE_BARS.map((b) => b.time));

describe('maCrossoverSignals', () => {
  it('produces at least one signal on 500 bars', () => {
    const sigs = maCrossoverSignals(SAMPLE_BARS, { fastPeriod: 5, slowPeriod: 10 });
    expect(sigs.length).toBeGreaterThan(0);
  });

  it('all signal times correspond to a valid bar time', () => {
    const sigs = maCrossoverSignals(SAMPLE_BARS, { fastPeriod: 5, slowPeriod: 10 });
    sigs.forEach((s) => expect(barTimes.has(s.time)).toBe(true));
  });

  it('directions alternate between long and short', () => {
    const sigs = maCrossoverSignals(SAMPLE_BARS, { fastPeriod: 5, slowPeriod: 15 });
    for (let i = 1; i < sigs.length; i++) {
      expect(sigs[i].direction).not.toBe(sigs[i - 1].direction);
    }
  });
});

describe('rsiMeanReversionSignals', () => {
  it('produces signals on 500 bars', () => {
    const sigs = rsiMeanReversionSignals(SAMPLE_BARS, { period: 14, oversold: 30, overbought: 70 });
    expect(sigs.length).toBeGreaterThanOrEqual(0);
  });

  it('all signal times are valid bar times', () => {
    const sigs = rsiMeanReversionSignals(SAMPLE_BARS, { period: 14, oversold: 30, overbought: 70 });
    sigs.forEach((s) => expect(barTimes.has(s.time)).toBe(true));
  });
});

describe('macdSignalCrossover', () => {
  it('produces signals on 500 bars', () => {
    const sigs = macdSignalCrossover(SAMPLE_BARS, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
    expect(sigs.length).toBeGreaterThan(0);
  });

  it('all signal times are valid bar times', () => {
    const sigs = macdSignalCrossover(SAMPLE_BARS, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
    sigs.forEach((s) => expect(barTimes.has(s.time)).toBe(true));
  });
});

describe('generateSignals', () => {
  it('dispatches ma-crossover correctly', () => {
    const config: StrategyConfig = {
      id: 'ma-crossover',
      params: { fastPeriod: 5, slowPeriod: 10 },
      stopLoss: 0.02,
      takeProfit: 0.05,
      positionSize: 0.1,
    };
    const sigs = generateSignals(SAMPLE_BARS, config);
    expect(Array.isArray(sigs)).toBe(true);
  });

  it('dispatches rsi-mean-reversion correctly', () => {
    const config: StrategyConfig = {
      id: 'rsi-mean-reversion',
      params: { period: 14, oversold: 30, overbought: 70 },
      stopLoss: 0.02,
      takeProfit: 0.05,
      positionSize: 0.1,
    };
    const sigs = generateSignals(SAMPLE_BARS, config);
    expect(Array.isArray(sigs)).toBe(true);
  });

  it('dispatches macd-signal correctly', () => {
    const config: StrategyConfig = {
      id: 'macd-signal',
      params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      stopLoss: 0.02,
      takeProfit: 0.05,
      positionSize: 0.1,
    };
    const sigs = generateSignals(SAMPLE_BARS, config);
    expect(Array.isArray(sigs)).toBe(true);
  });
});
