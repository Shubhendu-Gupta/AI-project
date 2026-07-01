import type { OHLCVBar } from '../types/market';
import type {
  SMAResult, EMAResult, RSIResult, MACDResult, BollingerResult, IndicatorSeries,
} from '../types/indicators';
import type { StrategyConfig, MACrossoverParams, MACDParams } from '../types/strategy';

export const computeSMA = (bars: OHLCVBar[], period: number): SMAResult[] => {
  if (bars.length < period) return [];
  const result: SMAResult[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += bars[i].close;
  result.push({ time: bars[period - 1].time, value: sum / period });
  for (let i = period; i < bars.length; i++) {
    sum += bars[i].close - bars[i - period].close;
    result.push({ time: bars[i].time, value: sum / period });
  }
  return result;
};

export const computeEMA = (bars: OHLCVBar[], period: number): EMAResult[] => {
  if (bars.length < period) return [];
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += bars[i].close;
  let ema = sum / period;
  const result: EMAResult[] = [{ time: bars[period - 1].time, value: ema }];
  for (let i = period; i < bars.length; i++) {
    ema = bars[i].close * k + ema * (1 - k);
    result.push({ time: bars[i].time, value: ema });
  }
  return result;
};

export const computeRSI = (bars: OHLCVBar[], period: number): RSIResult[] => {
  if (bars.length < period + 1) return [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  const result: RSIResult[] = [];
  const toRSI = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  result.push({ time: bars[period].time, value: toRSI(avgGain, avgLoss) });

  for (let i = period + 1; i < bars.length; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push({ time: bars[i].time, value: toRSI(avgGain, avgLoss) });
  }
  return result;
};

export const computeMACD = (
  bars: OHLCVBar[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
): MACDResult[] => {
  const fast = computeEMA(bars, fastPeriod);
  const slow = computeEMA(bars, slowPeriod);
  const slowMap = new Map(slow.map((p) => [p.time, p.value]));

  const macdLine = fast
    .filter((p) => slowMap.has(p.time))
    .map((p) => ({ time: p.time, value: p.value - slowMap.get(p.time)! }));

  if (macdLine.length < signalPeriod) return [];

  const kSig = 2 / (signalPeriod + 1);
  let sig = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b.value, 0) / signalPeriod;
  const result: MACDResult[] = [];

  for (let i = signalPeriod - 1; i < macdLine.length; i++) {
    if (i > signalPeriod - 1) sig = macdLine[i].value * kSig + sig * (1 - kSig);
    const macd = macdLine[i].value;
    result.push({ time: macdLine[i].time, macd, signal: sig, histogram: macd - sig });
  }
  return result;
};

export const computeBollinger = (
  bars: OHLCVBar[],
  period: number,
  stdDevMult = 2,
): BollingerResult[] => {
  if (bars.length < period) return [];
  const result: BollingerResult[] = [];
  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += bars[j].close;
    const mean = sum / period;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (bars[j].close - mean) ** 2;
    const std = Math.sqrt(variance / period);
    result.push({
      time: bars[i].time,
      upper: mean + stdDevMult * std,
      middle: mean,
      lower: mean - stdDevMult * std,
    });
  }
  return result;
};

export const computeAllIndicators = (bars: OHLCVBar[], config: StrategyConfig): IndicatorSeries => {
  const smaPeriod = config.id === 'ma-crossover'
    ? (config.params as MACrossoverParams).slowPeriod
    : 20;
  const emaPeriod = config.id === 'ma-crossover'
    ? (config.params as MACrossoverParams).fastPeriod
    : 12;
  const { fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } =
    config.id === 'macd-signal' ? (config.params as MACDParams) : {};

  return {
    sma:       computeSMA(bars, smaPeriod),
    ema:       computeEMA(bars, emaPeriod),
    rsi:       computeRSI(bars, 14),
    macd:      computeMACD(bars, fastPeriod, slowPeriod, signalPeriod),
    bollinger: computeBollinger(bars, 20),
  };
};
