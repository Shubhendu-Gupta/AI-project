import { useMemo } from 'react';
import type { BacktestResult } from '../types/backtest';
import type { StrategyConfig } from '../types/strategy';
import type { OHLCVBar } from '../types/market';
import { computeAllIndicators } from '../utils/indicators';
import { SAMPLE_BARS } from '../utils/sampleData';

export interface BuyMarker {
  time: number;
  position: 'belowBar';
  shape: 'arrowUp';
  color: string;
  text: string;
}

export interface SellMarker {
  time: number;
  position: 'aboveBar';
  shape: 'arrowDown';
  color: string;
  text: string;
}

export interface ChartSeries {
  candles: OHLCVBar[];
  sma:       { time: number; value: number }[];
  ema:       { time: number; value: number }[];
  bollUpper: { time: number; value: number }[];
  bollMiddle: { time: number; value: number }[];
  bollLower:  { time: number; value: number }[];
  volumeSeries: { time: number; value: number; color: string }[];
  buyMarkers:  BuyMarker[];
  sellMarkers: SellMarker[];
}

export const useChartData = (
  result: BacktestResult | null,
  config: StrategyConfig,
): ChartSeries => {
  return useMemo(() => {
    const bars = result?.bars ?? SAMPLE_BARS;
    const indicators = computeAllIndicators(bars, config);

    const volumeSeries = bars.map((b) => ({
      time: b.time,
      value: b.volume,
      color: b.close >= b.open ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
    }));

    const signals = result?.signals ?? [];
    const buyMarkers: BuyMarker[] = signals
      .filter((s) => s.direction === 'long')
      .map((s) => ({ time: s.time, position: 'belowBar' as const, shape: 'arrowUp' as const, color: '#22c55e', text: 'B' }));

    const sellMarkers: SellMarker[] = signals
      .filter((s) => s.direction === 'short')
      .map((s) => ({ time: s.time, position: 'aboveBar' as const, shape: 'arrowDown' as const, color: '#ef4444', text: 'S' }));

    return {
      candles: bars,
      sma:       indicators.sma,
      ema:       indicators.ema,
      bollUpper: indicators.bollinger.map((b) => ({ time: b.time, value: b.upper })),
      bollMiddle: indicators.bollinger.map((b) => ({ time: b.time, value: b.middle })),
      bollLower:  indicators.bollinger.map((b) => ({ time: b.time, value: b.lower })),
      volumeSeries,
      buyMarkers,
      sellMarkers,
    };
  }, [result, config]);
};
