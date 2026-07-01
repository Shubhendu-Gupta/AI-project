export interface SMAResult    { time: number; value: number }
export interface EMAResult    { time: number; value: number }
export interface RSIResult    { time: number; value: number }
export interface MACDResult   { time: number; macd: number; signal: number; histogram: number }
export interface BollingerResult { time: number; upper: number; middle: number; lower: number }

export interface IndicatorSeries {
  sma:       SMAResult[];
  ema:       EMAResult[];
  rsi:       RSIResult[];
  macd:      MACDResult[];
  bollinger: BollingerResult[];
}
