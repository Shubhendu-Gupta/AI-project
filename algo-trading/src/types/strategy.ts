export type StrategyId = 'ma-crossover' | 'rsi-mean-reversion' | 'macd-signal';

export interface MACrossoverParams {
  fastPeriod: number;
  slowPeriod: number;
}

export interface RSIParams {
  period: number;
  oversold: number;
  overbought: number;
}

export interface MACDParams {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export type StrategyParams = MACrossoverParams | RSIParams | MACDParams;

export interface StrategyConfig {
  id: StrategyId;
  params: StrategyParams;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
}

export type SignalDirection = 'long' | 'short' | 'flat';

export interface Signal {
  time: number;
  direction: SignalDirection;
  reason: string;
}
