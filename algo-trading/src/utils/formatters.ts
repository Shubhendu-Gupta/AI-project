export const fmtPct = (n: number, decimals = 2): string => `${(n * 100).toFixed(decimals)}%`;

export const fmtDollar = (n: number): string =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export const fmtNum = (n: number, decimals = 2): string => n.toFixed(decimals);

export const fmtDate = (unixSecs: number): string =>
  new Date(unixSecs * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
