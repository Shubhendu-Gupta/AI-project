import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
import warnings
warnings.filterwarnings('ignore')


LOOKBACK = 60          # days of history fed to LSTM per prediction
FORECAST_DAYS = 30     # days ahead to forecast
FEATURE_COLS = ['Close', 'Volume', 'Returns', 'MA7', 'MA21', 'EMA12', 'EMA26',
                'MACD', 'RSI', 'BB_upper', 'BB_lower', 'Volatility']


def _add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute technical indicators used as LSTM input features."""
    df = df.copy()
    df['Returns'] = df['Close'].pct_change()
    df['MA7'] = df['Close'].rolling(7).mean()
    df['MA21'] = df['Close'].rolling(21).mean()
    df['EMA12'] = df['Close'].ewm(span=12, adjust=False).mean()
    df['EMA26'] = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = df['EMA12'] - df['EMA26']

    delta = df['Close'].diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gain / (loss + 1e-10)
    df['RSI'] = 100 - (100 / (1 + rs))

    std20 = df['Close'].rolling(20).std()
    ma20 = df['Close'].rolling(20).mean()
    df['BB_upper'] = ma20 + 2 * std20
    df['BB_lower'] = ma20 - 2 * std20
    df['Volatility'] = df['Returns'].rolling(20).std()

    df.dropna(inplace=True)
    return df


def _build_model(n_features: int) -> Sequential:
    model = Sequential([
        Bidirectional(LSTM(128, return_sequences=True), input_shape=(LOOKBACK, n_features)),
        Dropout(0.2),
        LSTM(64, return_sequences=False),
        Dropout(0.2),
        Dense(32, activation='relu'),
        Dense(1),
    ])
    model.compile(optimizer=Adam(learning_rate=1e-3), loss='huber')
    return model


def fetch_and_train(ticker: str, period: str = '5y'):
    """
    Download data, engineer features, train the LSTM, and return predictions.

    Returns a dict with:
        ticker, period, dates, actuals, predicted, forecast_dates,
        forecast_prices, metrics, last_price, company_name
    """
    stock = yf.Ticker(ticker)
    info = stock.info
    company_name = info.get('longName') or info.get('shortName') or ticker

    raw = stock.history(period=period, auto_adjust=True)
    if raw.empty or len(raw) < LOOKBACK + 50:
        raise ValueError(f"Not enough data for {ticker} (got {len(raw)} rows).")

    df = _add_features(raw[['Close', 'Volume']])
    data = df[FEATURE_COLS].values
    n_features = data.shape[1]

    # Scale each feature independently
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(data)

    # Build (X, y) windows  — target is Close column (index 0)
    close_scaler = MinMaxScaler()
    close_scaler.fit(data[:, [0]])

    X, y = [], []
    for i in range(LOOKBACK, len(scaled)):
        X.append(scaled[i - LOOKBACK:i])
        y.append(scaled[i, 0])
    X, y = np.array(X), np.array(y)

    split = int(len(X) * 0.85)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = _build_model(n_features)
    callbacks = [
        EarlyStopping(patience=10, restore_best_weights=True, verbose=0),
        ReduceLROnPlateau(factor=0.5, patience=5, verbose=0),
    ]
    model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=100,
        batch_size=32,
        callbacks=callbacks,
        verbose=0,
    )

    # In-sample predictions on test window
    pred_scaled = model.predict(X_test, verbose=0).flatten()
    pred_prices = close_scaler.inverse_transform(
        pred_scaled.reshape(-1, 1)
    ).flatten()
    actual_prices = close_scaler.inverse_transform(
        y_test.reshape(-1, 1)
    ).flatten()

    mae = mean_absolute_error(actual_prices, pred_prices)
    rmse = float(np.sqrt(mean_squared_error(actual_prices, pred_prices)))
    r2 = r2_score(actual_prices, pred_prices)
    mape = float(np.mean(np.abs((actual_prices - pred_prices) / (actual_prices + 1e-10))) * 100)

    test_dates = df.index[split + LOOKBACK:].strftime('%Y-%m-%d').tolist()

    # Multi-step forecast: walk forward FORECAST_DAYS times
    last_window = scaled[-LOOKBACK:].copy()
    forecast_prices = []
    for _ in range(FORECAST_DAYS):
        inp = last_window.reshape(1, LOOKBACK, n_features)
        next_close_scaled = model.predict(inp, verbose=0)[0, 0]
        forecast_prices.append(
            close_scaler.inverse_transform([[next_close_scaled]])[0, 0]
        )
        # Shift window: keep all features, update Close column
        new_row = last_window[-1].copy()
        new_row[0] = next_close_scaled
        last_window = np.vstack([last_window[1:], new_row])

    last_date = df.index[-1]
    forecast_dates = pd.bdate_range(last_date, periods=FORECAST_DAYS + 1)[1:]
    forecast_dates = forecast_dates.strftime('%Y-%m-%d').tolist()

    all_dates = df.index.strftime('%Y-%m-%d').tolist()
    all_prices = df['Close'].tolist()

    return {
        'ticker': ticker.upper(),
        'company_name': company_name,
        'period': period,
        'dates': all_dates,
        'actuals': [round(p, 4) for p in all_prices],
        'test_dates': test_dates,
        'predicted': [round(p, 4) for p in pred_prices.tolist()],
        'forecast_dates': forecast_dates,
        'forecast_prices': [round(p, 4) for p in forecast_prices],
        'last_price': round(float(df['Close'].iloc[-1]), 4),
        'metrics': {
            'mae': round(mae, 4),
            'rmse': round(rmse, 4),
            'r2': round(r2, 4),
            'mape': round(mape, 2),
        },
    }
