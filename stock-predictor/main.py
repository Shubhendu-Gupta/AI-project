import uuid
import re
import asyncio
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from concurrent.futures import ThreadPoolExecutor
import os

from model import fetch_and_train

app = FastAPI(title='Stock Prediction API', version='1.0.0')
executor = ThreadPoolExecutor(max_workers=2)

VALID_PERIODS = {'1y', '2y', '5y', '10y', 'max'}

# In-memory job store: job_id -> {'status': pending|running|done|error, 'result': ..., 'detail': ...}
jobs: dict[str, dict] = {}


def _run_job(job_id: str, ticker: str, period: str) -> None:
    jobs[job_id]['status'] = 'running'
    try:
        result = fetch_and_train(ticker, period)
        jobs[job_id] = {'status': 'done', 'result': result}
    except ValueError as e:
        jobs[job_id] = {'status': 'error', 'code': 422, 'detail': str(e)}
    except Exception as e:
        jobs[job_id] = {'status': 'error', 'code': 500, 'detail': f'Model error: {str(e)}'}


@app.get('/api/predict/submit')
async def submit(
    ticker: str = Query(...),
    period: str = Query('5y'),
):
    """Enqueue a prediction job and return a job_id immediately."""
    ticker = ticker.upper().strip()
    # Allow letters plus an optional exchange suffix like .NS, .BO, .L, .T etc.
    if not re.fullmatch(r'[A-Z]{1,10}(\.[A-Z]{1,4})?', ticker):
        raise HTTPException(status_code=400, detail='Invalid ticker symbol. Use e.g. AAPL, ITC.NS, RELIANCE.NS')
    if period not in VALID_PERIODS:
        raise HTTPException(status_code=400, detail=f'period must be one of {sorted(VALID_PERIODS)}.')

    job_id = str(uuid.uuid4())
    jobs[job_id] = {'status': 'pending'}
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, _run_job, job_id, ticker, period)
    return {'job_id': job_id}


@app.get('/api/predict/result/{job_id}')
async def get_result(job_id: str):
    """Poll for job status. Returns status=done|running|pending|error."""
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail='Job not found.')
    if job['status'] == 'error':
        raise HTTPException(status_code=job['code'], detail=job['detail'])
    if job['status'] in ('pending', 'running'):
        return {'status': job['status']}
    # done
    result = job['result']
    # Clean up after delivery to avoid unbounded memory growth
    del jobs[job_id]
    return {'status': 'done', **result}


@app.get('/api/health')
def health():
    return {'status': 'ok'}


static_dir = os.path.join(os.path.dirname(__file__), 'static')
app.mount('/static', StaticFiles(directory=static_dir), name='static')


@app.get('/')
def index():
    return FileResponse(os.path.join(static_dir, 'index.html'))


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=False)
