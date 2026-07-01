import {
  calcPositionSize,
  calcStopPrice,
  calcTakeProfitPrice,
  isStopTriggered,
  isTakeProfitTriggered,
} from './riskManagement';
import type { OHLCVBar } from '../types/market';

const bar = (low: number, high: number): OHLCVBar => ({
  time: 0, open: 100, high, low, close: 100, volume: 1000,
});

describe('calcPositionSize', () => {
  it('returns correct shares and dollar amount', () => {
    const { shares, dollarAmount } = calcPositionSize(10000, 100, 0.1);
    expect(shares).toBe(10);
    expect(dollarAmount).toBe(1000);
  });

  it('floors shares when price does not divide evenly', () => {
    const { shares } = calcPositionSize(10000, 33, 0.1);
    expect(shares).toBe(30);
  });

  it('returns zero shares when equity is zero', () => {
    expect(calcPositionSize(0, 100, 0.1).shares).toBe(0);
  });
});

describe('calcStopPrice', () => {
  it('long stop is below entry', () => {
    expect(calcStopPrice(100, 'long', 0.02)).toBeCloseTo(98);
  });

  it('short stop is above entry', () => {
    expect(calcStopPrice(100, 'short', 0.02)).toBeCloseTo(102);
  });
});

describe('calcTakeProfitPrice', () => {
  it('long TP is above entry', () => {
    expect(calcTakeProfitPrice(100, 'long', 0.05)).toBeCloseTo(105);
  });

  it('short TP is below entry', () => {
    expect(calcTakeProfitPrice(100, 'short', 0.05)).toBeCloseTo(95);
  });
});

describe('isStopTriggered', () => {
  it('long stop triggered when bar.low <= stopPrice', () => {
    expect(isStopTriggered(bar(97, 105), 98, 'long')).toBe(true);
  });

  it('long stop NOT triggered when bar.low > stopPrice', () => {
    expect(isStopTriggered(bar(99, 105), 98, 'long')).toBe(false);
  });

  it('short stop triggered when bar.high >= stopPrice', () => {
    expect(isStopTriggered(bar(95, 103), 102, 'short')).toBe(true);
  });

  it('short stop NOT triggered when bar.high < stopPrice', () => {
    expect(isStopTriggered(bar(95, 101), 102, 'short')).toBe(false);
  });
});

describe('isTakeProfitTriggered', () => {
  it('long TP triggered when bar.high >= tpPrice', () => {
    expect(isTakeProfitTriggered(bar(98, 106), 105, 'long')).toBe(true);
  });

  it('long TP NOT triggered when bar.high < tpPrice', () => {
    expect(isTakeProfitTriggered(bar(98, 104), 105, 'long')).toBe(false);
  });

  it('short TP triggered when bar.low <= tpPrice', () => {
    expect(isTakeProfitTriggered(bar(94, 102), 95, 'short')).toBe(true);
  });

  it('short TP NOT triggered when bar.low > tpPrice', () => {
    expect(isTakeProfitTriggered(bar(96, 102), 95, 'short')).toBe(false);
  });
});
