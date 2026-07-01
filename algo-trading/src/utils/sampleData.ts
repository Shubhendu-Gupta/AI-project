import type { OHLCVBar } from '../types/market';

const lcg = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
};

export const generateOHLCV = (numBars: number, startPrice: number, startTime: number): OHLCVBar[] => {
  const rand = lcg(42);
  const bars: OHLCVBar[] = [];
  let price = startPrice;

  for (let i = 0; i < numBars; i++) {
    const noise = (rand() - 0.495) * 0.03;
    const open = price;
    const close = Math.max(0.01, open * (1 + noise));
    const tail = rand() * 0.01;
    const high = Math.max(open, close) * (1 + tail);
    const low  = Math.min(open, close) * (1 - tail);
    const volume = 100000 + rand() * 500000;

    bars.push({ time: startTime + i * 86400, open, high, low, close, volume });
    price = close;
  }

  return bars;
};

export const SAMPLE_BARS: OHLCVBar[] = generateOHLCV(500, 100, 1700000000);
