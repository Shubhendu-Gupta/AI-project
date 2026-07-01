# algo-trading

A React + TypeScript algorithmic trading backtesting dashboard. Configure a strategy, tune parameters and risk settings, and instantly backtest against 500 bars of synthetic OHLCV data — all in the browser, no server required.

---

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000
npm run build
npm run test      # 49 Jest unit tests
npm run typecheck
npm run lint
```

---

## Features

- **3 built-in strategies** — MA Crossover, RSI Mean Reversion, MACD Signal
- **5 technical indicators** — SMA, EMA, RSI, MACD, Bollinger Bands
- **Risk management** — configurable stop-loss %, take-profit %, position size %
- **Backtest metrics** — total return, annualized return, Sharpe ratio, max drawdown, win rate, profit factor, avg win/loss
- **TradingView chart** — candlesticks + SMA/EMA/Bollinger overlays + volume + buy/sell markers (lightweight-charts v5)
- **Equity sparkline** — mini equity curve in the results panel
- **Sortable trade log** — every trade with entry/exit, direction, P&L, exit reason

---

## Usage

1. Pick a strategy from the sidebar dropdown.
2. Adjust strategy parameters and risk settings.
3. Click **Run Backtest** (also auto-runs on any config change).
4. Read results in the Backtest Results panel and Trade Log.

---

## Project structure

```
src/
├── types/
│   ├── market.ts         # OHLCVBar
│   ├── indicators.ts     # SMA/EMA/RSI/MACD/Bollinger result types
│   ├── strategy.ts       # StrategyConfig, Signal, params types
│   └── backtest.ts       # Trade, EquityCurvePoint, BacktestMetrics, BacktestResult
├── utils/
│   ├── sampleData.ts     # Deterministic LCG synthetic OHLCV generator
│   ├── indicators.ts     # Pure indicator functions
│   ├── strategies.ts     # Signal generators (MA crossover, RSI, MACD)
│   ├── backtest.ts       # Backtesting engine
│   ├── riskManagement.ts # Position sizing, stop/TP helpers
│   ├── formatters.ts     # fmtPct, fmtDollar, fmtDate, fmtNum
│   └── *.test.ts         # 49 unit tests
├── hooks/
│   ├── useStrategyConfig.ts  # Strategy config state
│   ├── useBacktest.ts        # Backtest runner with auto-run on config change
│   └── useChartData.ts       # Transforms BacktestResult → lightweight-charts series
└── components/
    ├── PriceChart/       # lightweight-charts v5 candlestick chart
    ├── BacktestPanel/    # Metrics grid + equity sparkline
    ├── TradeLog/         # Sortable trade table
    ├── StrategyConfig/   # Strategy selector + param inputs + risk controls
    └── MetricCard/       # Single metric display tile
```

---

## Architecture

```
useStrategyConfig ──► useBacktest ──► useChartData
       │                   │                │
       ▼                   ▼                ▼
StrategyConfigPanel   BacktestPanel    PriceChart
                      TradeLog
```

`useBacktest` re-runs automatically via `useEffect` whenever `config` changes. `useChartData` derives chart series from `BacktestResult` with `useMemo` — no extra state.

### Backtest execution model

Signals are generated on bar N's close but filled at bar N+1's open (no look-ahead bias). Stop-loss and take-profit are checked intrabar using bar high/low. Priority order per bar:

1. Fill any pending signal from the previous bar (at `bar.open`)
2. Check stop-loss (uses `bar.low` for longs, `bar.high` for shorts)
3. Check take-profit (uses `bar.high` for longs, `bar.low` for shorts)
4. Check exit signal (`flat` direction or opposing signal)
5. Queue a new signal for next-bar entry

---

## API reference

### `generateOHLCV(numBars, startPrice, startTime): OHLCVBar[]`

Deterministic synthetic price data using a Lehmer LCG RNG (seed=42). `SAMPLE_BARS` is 500 bars starting at price 100.

### `computeSMA / computeEMA / computeRSI / computeMACD / computeBollinger`

All pure functions `(bars: OHLCVBar[], ...params) → result[]`. Return only entries where enough history exists (no leading `NaN`). RSI uses Wilder smoothing. MACD signal line is an EMA of the MACD line.

### `runBacktest(bars, config, initialEquity): BacktestResult`

Synchronous. Runs in <5ms on 500 bars. Returns trades, equity curve, metrics, signals, and the input bars.

### `useStrategyConfig()`

| Return | Type | Description |
|---|---|---|
| `config` | `StrategyConfig` | Current config |
| `setStrategyId` | `(id) => void` | Switch strategy + reset params to defaults |
| `updateParams` | `(patch) => void` | Merge into current params |
| `updateRisk` | `(patch) => void` | Update stopLoss / takeProfit / positionSize |

### `useBacktest(config)`

| Return | Type | Description |
|---|---|---|
| `result` | `BacktestResult \| null` | Latest result |
| `isRunning` | `boolean` | True during execution |
| `run` | `() => void` | Manually trigger a run |

---

## Metrics reference

| Metric | Formula |
|---|---|
| Total Return | `(finalEquity - initialEquity) / initialEquity` |
| Annualized Return | `(1 + totalReturn)^(1/years) - 1` |
| Sharpe Ratio | `mean(dailyReturn) / stdDev(dailyReturn) × √252` |
| Max Drawdown | Max of `(peak - equity) / peak` over all bars |
| Win Rate | `wins / totalTrades` |
| Profit Factor | `grossProfit / grossLoss` |

Sharpe is computed from bar-over-bar equity returns (not per-trade returns) for correct daily annualization.

---

## Tests

49 tests across 4 suites:

| Suite | Tests | Coverage |
|---|---|---|
| `indicators.test.ts` | 13 | SMA/EMA/RSI/MACD/Bollinger correctness and bounds |
| `riskManagement.test.ts` | 12 | All 5 risk functions, long/short symmetry |
| `strategies.test.ts` | 10 | Signal count, valid times, dispatch |
| `backtest.test.ts` | 14 | Equity curve length, metrics shape, stop/TP/signal exits, PnL sum |

---

## Configuration

- **Port:** 3000 (Vite `server.port`)
- **Allowed hosts:** `*.cloudfront.net` for remote preview
- **tsconfig.app.json** — strict bundler mode, excludes test files
- **tsconfig.test.json** — CommonJS, adds `jest` + `node` types for ts-jest
