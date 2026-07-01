# stock-predictor

A FastAPI + Bidirectional LSTM stock price prediction service. Enter any ticker symbol, choose a historical period, and get a 30-day price forecast with model accuracy metrics and interactive charts.

---

## Getting started

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# open http://localhost:8000
```

Run tests:

```bash
pytest tests/ -v
```

---

## Features

- **Bidirectional LSTM** with 12 input features (price, volume, MA, EMA, MACD, RSI, Bollinger Bands, Volatility)
- **30-day walk-forward forecast** — each step re-feeds the previous prediction into the sliding window
- **Accuracy metrics** — MAE, RMSE, R², MAPE computed on a held-out 15% test set
- **Interactive frontend** — Chart.js line chart showing actuals, test predictions, and forecast
- **REST API** — single `/api/predict` endpoint, input-validated, runs model in a thread pool

---

## Architecture

```
GET /api/predict?ticker=AAPL&period=5y
        │
        ▼
   main.py (FastAPI)
        │  ThreadPoolExecutor (non-blocking)
        ▼
   model.py::fetch_and_train()
        ├── yfinance.download()
        ├── _add_features()       — 12 technical indicators
        ├── MinMaxScaler
        ├── _build_model()        — BiLSTM → LSTM → Dense
        ├── model.fit() + EarlyStopping
        ├── walk-forward forecast
        └── returns PredictionResponse dict
        │
        ▼
   static/index.html (Chart.js frontend)
```

---

## API

The API uses a submit → poll pattern so the browser stays unblocked while the model trains (typically 10–60 s).

### `POST /api/predict/submit`

Enqueue a prediction job. Returns immediately.

| Param | Type | Required | Description |
|---|---|---|---|
| `ticker` | string | yes | Stock symbol, e.g. `AAPL`, `TSLA` |
| `period` | string | no | `1y` \| `2y` \| `5y` \| `10y` \| `max` (default `5y`) |

```json
{ "job_id": "3f7a1c2d-..." }
```

### `GET /api/predict/result/{job_id}`

Poll for results.

| `status` | Meaning |
|---|---|
| `pending` | Queued, not started yet |
| `running` | Model is training |
| `done` | Result is ready (see below) |
| `error` | HTTP 422 or 500 with `detail` |

**Done response:**

```json
{
  "status": "done",
  "ticker": "AAPL",
  "company_name": "Apple Inc.",
  "period": "5y",
  "dates": ["2020-01-02", "..."],
  "actuals": [300.35, "..."],
  "test_dates": ["2024-06-01", "..."],
  "predicted": [189.2, "..."],
  "forecast_dates": ["2025-07-02", "..."],
  "forecast_prices": [195.1, "..."],
  "last_price": 192.4,
  "metrics": { "mae": 3.21, "rmse": 4.15, "r2": 0.93, "mape": 1.72 }
}
```

The job is removed from memory after the first successful `done` delivery.

### `GET /api/health`

Returns `{"status": "ok"}`.

---

## Model details

### Input features (`FEATURE_COLS`)

| Feature | Description |
|---|---|
| `Close` | Adjusted closing price |
| `Volume` | Trading volume |
| `Returns` | Daily % change |
| `MA7` / `MA21` | 7- and 21-day simple moving averages |
| `EMA12` / `EMA26` | Exponential moving averages |
| `MACD` | EMA12 − EMA26 |
| `RSI` | 14-day Wilder RSI |
| `BB_upper` / `BB_lower` | Bollinger Bands (20-day, ±2σ) |
| `Volatility` | 20-day rolling std of returns |

### Architecture

```
Input (60, 12)
  → Bidirectional LSTM(128, return_sequences=True)
  → Dropout(0.2)
  → LSTM(64)
  → Dropout(0.2)
  → Dense(32, relu)
  → Dense(1)
```

- **Loss:** Huber (robust to outliers)
- **Optimizer:** Adam (lr=1e-3)
- **Training:** up to 100 epochs, EarlyStopping(patience=10), ReduceLROnPlateau(patience=5)
- **Train/test split:** 85% / 15%
- **Lookback window:** 60 trading days

### Forecast

Walk-forward: after training, the last 60 bars are used as a seed. Each step predicts the next close, appends it to the window (shifting out the oldest bar), and repeats for 30 business days.

---

## Tests

20 tests across 2 suites:

| Suite | Tests | Coverage |
|---|---|---|
| `tests/test_model.py` | 10 | Feature engineering, RSI bounds, constants, full pipeline with mocked yfinance |
| `tests/test_api.py` | 10 | Health check, valid/invalid inputs, schema validation, default params, error codes |

---

## Configuration

- **Port:** 8000 (configurable via `uvicorn` CLI)
- **Workers:** 2 (ProcessPoolExecutor for CPU-bound model training)
- **Min data requirement:** `LOOKBACK + 50 = 110` bars (raises HTTP 422 otherwise)
