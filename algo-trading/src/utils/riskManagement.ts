import type { OHLCVBar } from '../types/market';
import type { TradeDirection } from '../types/backtest';

export interface PositionSizeResult {
  shares: number;
  dollarAmount: number;
}

export const calcPositionSize = (
  equity: number,
  price: number,
  fraction: number,
): PositionSizeResult => {
  const target = equity * fraction;
  const shares = Math.max(0, Math.floor(target / price));
  return { shares, dollarAmount: shares * price };
};

export const calcStopPrice = (
  entryPrice: number,
  direction: TradeDirection,
  stopLoss: number,
): number =>
  direction === 'long'
    ? entryPrice * (1 - stopLoss)
    : entryPrice * (1 + stopLoss);

export const calcTakeProfitPrice = (
  entryPrice: number,
  direction: TradeDirection,
  takeProfit: number,
): number =>
  direction === 'long'
    ? entryPrice * (1 + takeProfit)
    : entryPrice * (1 - takeProfit);

export const isStopTriggered = (
  bar: OHLCVBar,
  stopPrice: number,
  direction: TradeDirection,
): boolean =>
  direction === 'long' ? bar.low <= stopPrice : bar.high >= stopPrice;

export const isTakeProfitTriggered = (
  bar: OHLCVBar,
  tpPrice: number,
  direction: TradeDirection,
): boolean =>
  direction === 'long' ? bar.high >= tpPrice : bar.low <= tpPrice;
