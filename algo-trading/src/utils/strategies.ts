import type { OHLCVBar } from '../types/market';
import type { Signal, StrategyConfig, MACrossoverParams, RSIParams, MACDParams } from '../types/strategy';
import { computeSMA, computeRSI, computeMACD } from './indicators';

export const maCrossoverSignals = (bars: OHLCVBar[], params: MACrossoverParams): Signal[] => {
  const fast = computeSMA(bars, params.fastPeriod);
  const slow = computeSMA(bars, params.slowPeriod);
  const slowMap = new Map(slow.map((p) => [p.time, p.value]));
  const aligned = fast.filter((p) => slowMap.has(p.time));

  const signals: Signal[] = [];
  let inPosition = false;

  for (let i = 1; i < aligned.length; i++) {
    const prevFast = aligned[i - 1].value;
    const curFast  = aligned[i].value;
    const prevSlow = slowMap.get(aligned[i - 1].time)!;
    const curSlow  = slowMap.get(aligned[i].time)!;

    if (!inPosition && prevFast <= prevSlow && curFast > curSlow) {
      signals.push({ time: aligned[i].time, direction: 'long', reason: 'MA crossover up' });
      inPosition = true;
    } else if (inPosition && prevFast >= prevSlow && curFast < curSlow) {
      signals.push({ time: aligned[i].time, direction: 'flat', reason: 'MA crossover down — exit long' });
      inPosition = false;
    }
  }
  return signals;
};

export const rsiMeanReversionSignals = (bars: OHLCVBar[], params: RSIParams): Signal[] => {
  const rsi = computeRSI(bars, params.period);
  const signals: Signal[] = [];
  let inPosition = false;

  for (let i = 1; i < rsi.length; i++) {
    const prev = rsi[i - 1].value;
    const cur  = rsi[i].value;

    if (!inPosition && prev <= params.oversold && cur > params.oversold) {
      signals.push({ time: rsi[i].time, direction: 'long', reason: `RSI crossed above ${params.oversold}` });
      inPosition = true;
    } else if (inPosition && prev >= params.overbought && cur < params.overbought) {
      signals.push({ time: rsi[i].time, direction: 'flat', reason: `RSI crossed below ${params.overbought} — exit long` });
      inPosition = false;
    }
  }
  return signals;
};

export const macdSignalCrossover = (bars: OHLCVBar[], params: MACDParams): Signal[] => {
  const macd = computeMACD(bars, params.fastPeriod, params.slowPeriod, params.signalPeriod);
  const signals: Signal[] = [];
  let inPosition = false;

  for (let i = 1; i < macd.length; i++) {
    const prev = macd[i - 1];
    const cur  = macd[i];

    if (!inPosition && prev.macd <= prev.signal && cur.macd > cur.signal) {
      signals.push({ time: cur.time, direction: 'long', reason: 'MACD crossed above signal' });
      inPosition = true;
    } else if (inPosition && prev.macd >= prev.signal && cur.macd < cur.signal) {
      signals.push({ time: cur.time, direction: 'short', reason: 'MACD crossed below signal' });
      inPosition = false;
    }
  }
  return signals;
};

export const generateSignals = (bars: OHLCVBar[], config: StrategyConfig): Signal[] => {
  switch (config.id) {
    case 'ma-crossover':
      return maCrossoverSignals(bars, config.params as MACrossoverParams);
    case 'rsi-mean-reversion':
      return rsiMeanReversionSignals(bars, config.params as RSIParams);
    case 'macd-signal':
      return macdSignalCrossover(bars, config.params as MACDParams);
  }
};
