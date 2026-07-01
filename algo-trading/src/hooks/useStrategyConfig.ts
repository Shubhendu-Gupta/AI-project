import { useState, useCallback } from 'react';
import type { StrategyConfig, StrategyId, StrategyParams } from '../types/strategy';

const STRATEGY_DEFAULTS: Record<StrategyId, StrategyParams> = {
  'ma-crossover':       { fastPeriod: 10, slowPeriod: 30 },
  'rsi-mean-reversion': { period: 14, oversold: 30, overbought: 70 },
  'macd-signal':        { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
};

export const DEFAULT_CONFIG: StrategyConfig = {
  id: 'ma-crossover',
  params: STRATEGY_DEFAULTS['ma-crossover'],
  stopLoss: 0.02,
  takeProfit: 0.05,
  positionSize: 0.10,
};

export interface UseStrategyConfigReturn {
  config: StrategyConfig;
  setStrategyId: (id: StrategyId) => void;
  updateParams: (patch: Partial<StrategyParams>) => void;
  updateRisk: (patch: { stopLoss?: number; takeProfit?: number; positionSize?: number }) => void;
}

export const useStrategyConfig = (): UseStrategyConfigReturn => {
  const [config, setConfig] = useState<StrategyConfig>(DEFAULT_CONFIG);

  const setStrategyId = useCallback((id: StrategyId) => {
    setConfig((prev) => ({ ...prev, id, params: STRATEGY_DEFAULTS[id] }));
  }, []);

  const updateParams = useCallback((patch: Partial<StrategyParams>) => {
    setConfig((prev) => ({ ...prev, params: { ...prev.params, ...patch } }));
  }, []);

  const updateRisk = useCallback(
    (patch: { stopLoss?: number; takeProfit?: number; positionSize?: number }) => {
      setConfig((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  return { config, setStrategyId, updateParams, updateRisk };
};
