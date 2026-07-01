import { useState, useCallback, useEffect } from 'react';
import type { StrategyConfig } from '../types/strategy';
import type { BacktestResult } from '../types/backtest';
import { runBacktest } from '../utils/backtest';
import { SAMPLE_BARS } from '../utils/sampleData';

const INITIAL_EQUITY = 100_000;

export interface UseBacktestReturn {
  result: BacktestResult | null;
  isRunning: boolean;
  run: () => void;
}

export const useBacktest = (config: StrategyConfig): UseBacktestReturn => {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(() => {
    setIsRunning(true);
    try {
      const res = runBacktest(SAMPLE_BARS, config, INITIAL_EQUITY);
      setResult(res);
    } catch (err) {
      console.error('Backtest error:', err);
      setResult(null);
    } finally {
      setIsRunning(false);
    }
  }, [config]);

  useEffect(() => {
    run();
  }, [run]);

  return { result, isRunning, run };
};
