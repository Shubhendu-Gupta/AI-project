"""Unit tests for model.py — run with pytest."""
import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from model import _add_features, FEATURE_COLS, LOOKBACK, FORECAST_DAYS


def _make_ohlcv(n: int = 200) -> pd.DataFrame:
    idx = pd.bdate_range('2020-01-01', periods=n)
    close = 100 + np.cumsum(np.random.randn(n) * 0.5)
    return pd.DataFrame({'Close': close, 'Volume': np.random.randint(1_000_000, 5_000_000, n)}, index=idx)


class TestAddFeatures:
    def test_all_feature_columns_present(self):
        df = _make_ohlcv()
        result = _add_features(df)
        for col in FEATURE_COLS:
            assert col in result.columns, f"Missing column: {col}"

    def test_no_nan_after_dropna(self):
        df = _make_ohlcv(200)
        result = _add_features(df)
        assert not result[FEATURE_COLS].isnull().any().any()

    def test_rsi_bounds(self):
        df = _make_ohlcv(200)
        result = _add_features(df)
        assert result['RSI'].between(0, 100).all()

    def test_returns_close_correlation(self):
        """Returns should be highly correlated with pct_change of Close."""
        df = _make_ohlcv(200)
        result = _add_features(df)
        recomputed = result['Close'].pct_change().dropna()
        shared_idx = result.index.intersection(recomputed.index)
        corr = result.loc[shared_idx, 'Returns'].corr(recomputed.loc[shared_idx])
        assert corr > 0.99

    def test_short_df_raises(self):
        """DataFrame too short to compute rolling windows should drop all rows."""
        df = _make_ohlcv(10)
        result = _add_features(df)
        assert len(result) == 0


class TestConstants:
    def test_lookback_positive(self):
        assert LOOKBACK > 0

    def test_forecast_days_positive(self):
        assert FORECAST_DAYS > 0

    def test_feature_cols_not_empty(self):
        assert len(FEATURE_COLS) >= 3


class TestFetchAndTrain:
    """Integration-style tests that mock yfinance."""

    def _make_mock_ticker(self, n=300):
        idx = pd.bdate_range('2020-01-01', periods=n)
        close = 150 + np.cumsum(np.random.randn(n) * 0.5)
        hist = pd.DataFrame({'Close': close, 'Volume': np.random.randint(1_000_000, 5_000_000, n)}, index=idx)
        ticker_mock = MagicMock()
        ticker_mock.history.return_value = hist
        ticker_mock.info = {'longName': 'Mock Corp'}
        return ticker_mock

    def test_output_keys_present(self):
        with patch('model.yf.Ticker') as mock_yf:
            mock_yf.return_value = self._make_mock_ticker()
            from model import fetch_and_train
            result = fetch_and_train('MOCK', period='5y')

        required_keys = {'ticker', 'company_name', 'period', 'dates', 'actuals',
                         'test_dates', 'predicted', 'forecast_dates',
                         'forecast_prices', 'last_price', 'metrics'}
        assert required_keys.issubset(result.keys())

    def test_forecast_length(self):
        with patch('model.yf.Ticker') as mock_yf:
            mock_yf.return_value = self._make_mock_ticker()
            from model import fetch_and_train
            result = fetch_and_train('MOCK', period='5y')

        assert len(result['forecast_prices']) == FORECAST_DAYS
        assert len(result['forecast_dates']) == FORECAST_DAYS

    def test_metrics_keys(self):
        with patch('model.yf.Ticker') as mock_yf:
            mock_yf.return_value = self._make_mock_ticker()
            from model import fetch_and_train
            result = fetch_and_train('MOCK', period='5y')

        for key in ('mae', 'rmse', 'r2', 'mape'):
            assert key in result['metrics']
            assert isinstance(result['metrics'][key], float)

    def test_raises_on_insufficient_data(self):
        with patch('model.yf.Ticker') as mock_yf:
            ticker_mock = MagicMock()
            ticker_mock.history.return_value = pd.DataFrame({'Close': [100, 101], 'Volume': [1_000_000, 1_000_000]})
            ticker_mock.info = {}
            mock_yf.return_value = ticker_mock
            from model import fetch_and_train
            with pytest.raises(ValueError, match='Not enough data'):
                fetch_and_train('MOCK', period='5y')

    def test_ticker_upcased_in_result(self):
        with patch('model.yf.Ticker') as mock_yf:
            mock_yf.return_value = self._make_mock_ticker()
            from model import fetch_and_train
            result = fetch_and_train('mock', period='5y')

        assert result['ticker'] == 'MOCK'
