"""FastAPI endpoint tests — run with pytest."""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app, jobs

client = TestClient(app)

MOCK_RESULT = {
    'ticker': 'AAPL',
    'company_name': 'Apple Inc.',
    'period': '5y',
    'dates': ['2024-01-01', '2024-01-02'],
    'actuals': [180.0, 182.5],
    'test_dates': ['2024-01-02'],
    'predicted': [181.0],
    'forecast_dates': [f'2024-02-{i:02d}' for i in range(1, 31)],
    'forecast_prices': [190.0 + i * 0.5 for i in range(30)],
    'last_price': 182.5,
    'metrics': {'mae': 1.2, 'rmse': 1.8, 'r2': 0.92, 'mape': 0.7},
}


class TestHealthEndpoint:
    def test_health_ok(self):
        res = client.get('/api/health')
        assert res.status_code == 200
        assert res.json() == {'status': 'ok'}


class TestSubmitEndpoint:
    def test_valid_submit_returns_job_id(self):
        res = client.get('/api/predict/submit?ticker=AAPL&period=5y')
        assert res.status_code == 200
        body = res.json()
        assert 'job_id' in body
        assert isinstance(body['job_id'], str)

    def test_invalid_ticker_rejected(self):
        res = client.get('/api/predict/submit?ticker=A@PL')
        assert res.status_code == 400
        assert 'Invalid ticker' in res.json()['detail']

    def test_exchange_suffix_accepted(self):
        res = client.get('/api/predict/submit?ticker=ITC.NS&period=5y')
        assert res.status_code == 200
        assert 'job_id' in res.json()

    def test_bse_suffix_accepted(self):
        res = client.get('/api/predict/submit?ticker=RELIANCE.BO&period=5y')
        assert res.status_code == 200
        assert 'job_id' in res.json()

    def test_invalid_suffix_rejected(self):
        res = client.get('/api/predict/submit?ticker=ITC.12345')
        assert res.status_code == 400

    def test_invalid_period_rejected(self):
        res = client.get('/api/predict/submit?ticker=AAPL&period=99y')
        assert res.status_code == 400
        assert 'period' in res.json()['detail']

    def test_too_long_ticker_rejected(self):
        res = client.get('/api/predict/submit?ticker=TOOLONGTICKER')
        assert res.status_code == 400

    def test_missing_ticker_returns_422(self):
        res = client.get('/api/predict/submit')
        assert res.status_code == 422

    def test_ticker_uppercased(self):
        res = client.get('/api/predict/submit?ticker=aapl&period=5y')
        assert res.status_code == 200
        job_id = res.json()['job_id']
        assert job_id in jobs

    def test_default_period_is_5y(self):
        with patch('main._run_job') as mock_run:
            res = client.get('/api/predict/submit?ticker=AAPL')
            assert res.status_code == 200


class TestPollEndpoint:
    def test_unknown_job_returns_404(self):
        res = client.get('/api/predict/result/nonexistent-id')
        assert res.status_code == 404

    def test_pending_job_returns_status(self):
        jobs['test-pending'] = {'status': 'pending'}
        res = client.get('/api/predict/result/test-pending')
        assert res.status_code == 200
        assert res.json()['status'] == 'pending'
        del jobs['test-pending']

    def test_running_job_returns_status(self):
        jobs['test-running'] = {'status': 'running'}
        res = client.get('/api/predict/result/test-running')
        assert res.status_code == 200
        assert res.json()['status'] == 'running'
        del jobs['test-running']

    def test_done_job_returns_result_and_cleans_up(self):
        jobs['test-done'] = {'status': 'done', 'result': MOCK_RESULT}
        res = client.get('/api/predict/result/test-done')
        assert res.status_code == 200
        body = res.json()
        assert body['status'] == 'done'
        assert body['ticker'] == 'AAPL'
        assert 'test-done' not in jobs  # cleaned up after delivery

    def test_error_job_returns_correct_code(self):
        jobs['test-err'] = {'status': 'error', 'code': 422, 'detail': 'Not enough data'}
        res = client.get('/api/predict/result/test-err')
        assert res.status_code == 422
        assert 'Not enough data' in res.json()['detail']
        del jobs['test-err']

    def test_done_response_schema(self):
        jobs['test-schema'] = {'status': 'done', 'result': MOCK_RESULT}
        res = client.get('/api/predict/result/test-schema')
        body = res.json()
        for key in ('ticker', 'company_name', 'period', 'dates', 'actuals',
                    'test_dates', 'predicted', 'forecast_dates',
                    'forecast_prices', 'last_price', 'metrics'):
            assert key in body, f"Missing key: {key}"


class TestFrontendServed:
    def test_index_html_served(self):
        res = client.get('/')
        assert res.status_code == 200
        assert b'Stock Prediction' in res.content

    def test_chart_js_served_locally(self):
        res = client.get('/static/chart.umd.min.js')
        assert res.status_code == 200
