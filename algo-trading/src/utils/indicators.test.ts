import { computeSMA, computeEMA, computeRSI, computeMACD, computeBollinger } from './indicators';
import { SAMPLE_BARS } from './sampleData';

describe('computeSMA', () => {
  it('returns empty array when bars < period', () => {
    expect(computeSMA(SAMPLE_BARS.slice(0, 5), 10)).toHaveLength(0);
  });

  it('result length equals bars - period + 1', () => {
    const result = computeSMA(SAMPLE_BARS, 20);
    expect(result).toHaveLength(SAMPLE_BARS.length - 20 + 1);
  });

  it('first value is mean of first period closes', () => {
    const period = 5;
    const result = computeSMA(SAMPLE_BARS, period);
    const expected = SAMPLE_BARS.slice(0, period).reduce((s, b) => s + b.close, 0) / period;
    expect(result[0].value).toBeCloseTo(expected, 8);
  });

  it('first time equals bar at index period-1', () => {
    const result = computeSMA(SAMPLE_BARS, 10);
    expect(result[0].time).toBe(SAMPLE_BARS[9].time);
  });
});

describe('computeEMA', () => {
  it('returns empty when bars < period', () => {
    expect(computeEMA(SAMPLE_BARS.slice(0, 3), 10)).toHaveLength(0);
  });

  it('result length equals bars - period + 1', () => {
    const result = computeEMA(SAMPLE_BARS, 20);
    expect(result).toHaveLength(SAMPLE_BARS.length - 20 + 1);
  });

  it('first EMA value equals SMA seed', () => {
    const period = 10;
    const ema = computeEMA(SAMPLE_BARS, period);
    const sma = computeSMA(SAMPLE_BARS, period);
    expect(ema[0].value).toBeCloseTo(sma[0].value, 8);
  });

  it('EMA reacts faster than SMA to a spike', () => {
    const period = 5;
    const bars500 = [...SAMPLE_BARS];
    // Inject a large spike at index 50
    const spiked = bars500.map((b, i) =>
      i === 50 ? { ...b, close: b.close * 5 } : b
    );
    const ema = computeEMA(spiked, period);
    const sma = computeSMA(spiked, period);
    const emaIdx = 50 - period + 1;
    const smaIdx = 50 - period + 1;
    // After the spike, EMA should be higher than SMA at the same index
    expect(ema[emaIdx].value).toBeGreaterThan(sma[smaIdx].value);
  });
});

describe('computeRSI', () => {
  it('all RSI values in [0, 100]', () => {
    const rsi = computeRSI(SAMPLE_BARS, 14);
    rsi.forEach((r) => {
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThanOrEqual(100);
    });
  });

  it('returns empty when bars <= period', () => {
    expect(computeRSI(SAMPLE_BARS.slice(0, 14), 14)).toHaveLength(0);
  });

  it('result length is bars - period', () => {
    const period = 14;
    expect(computeRSI(SAMPLE_BARS, period)).toHaveLength(SAMPLE_BARS.length - period);
  });
});

describe('computeMACD', () => {
  it('returns non-empty result on 500 bars', () => {
    const result = computeMACD(SAMPLE_BARS, 12, 26, 9);
    expect(result.length).toBeGreaterThan(0);
  });

  it('histogram equals macd - signal', () => {
    const result = computeMACD(SAMPLE_BARS, 12, 26, 9);
    result.forEach((r) => {
      expect(r.histogram).toBeCloseTo(r.macd - r.signal, 10);
    });
  });
});

describe('computeBollinger', () => {
  it('upper > middle > lower for all bars', () => {
    const result = computeBollinger(SAMPLE_BARS, 20);
    result.forEach((r) => {
      expect(r.upper).toBeGreaterThan(r.middle);
      expect(r.middle).toBeGreaterThan(r.lower);
    });
  });

  it('middle equals SMA for same period', () => {
    const period = 20;
    const boll = computeBollinger(SAMPLE_BARS, period);
    const sma  = computeSMA(SAMPLE_BARS, period);
    boll.forEach((b, i) => {
      expect(b.middle).toBeCloseTo(sma[i].value, 8);
    });
  });
});
