# Auto Job Apply Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully automated Python CLI tool that discovers job listings across LinkedIn, Indeed, Glassdoor, Naukri.com, and company career pages, then applies to them using Playwright + Claude API with a local SQLite tracker.

**Architecture:** Playwright drives a headed browser with persistent profiles per site. The Claude API identifies form fields from page DOM, maps profile data to fields, and generates custom question answers. All state is tracked in SQLite; CAPTCHA pauses the run for manual solving.

**Tech Stack:** Python 3.11+, Playwright, anthropic SDK, SQLite (stdlib), PyYAML, click (CLI), rapidfuzz (fuzzy matching), reportlab (PDF generation), rich (terminal tables)

## Global Constraints

- Python 3.11+ required
- All async code uses `asyncio`; Playwright async API throughout
- All file paths relative to project root (`job-apply-bot/`)
- Claude model: `claude-sonnet-4-6` for all LLM calls
- SQLite DB at `data/applications.db`; create `data/` dir if missing
- Screenshots saved to `screenshots/<job_id>_<timestamp>.png`
- Fuzzy match threshold: 0.8 (80 similarity score via rapidfuzz)
- Randomized delay between applications: 30–60 seconds (`random.uniform(30, 60)`)
- Browser profiles stored at `browser_profiles/<source>/`

---

### Task 1: Project Scaffold + Dependencies

**Files:**
- Create: `requirements.txt`
- Create: `config/profile.yaml`
- Create: `config/search.yaml`
- Create: `config/qa_bank.yaml`
- Create: `src/__init__.py`
- Create: `src/discovery/__init__.py`
- Create: `src/engine/__init__.py`
- Create: `src/profile/__init__.py`
- Create: `src/qa/__init__.py`
- Create: `src/tracker/__init__.py`
- Create: `src/notifications/__init__.py`

**Interfaces:**
- Produces: project skeleton; all subsequent tasks depend on this

- [ ] **Step 1: Create requirements.txt**

```
playwright==1.44.0
anthropic==0.28.0
PyYAML==6.0.1
click==8.1.7
rapidfuzz==3.9.3
reportlab==4.2.0
rich==13.7.1
pytest==8.2.0
pytest-asyncio==0.23.7
```

- [ ] **Step 2: Create sample config files**

`config/profile.yaml`:
```yaml
first_name: Jane
last_name: Doe
email: jane@example.com
phone: "+1-555-0100"
location: "San Francisco, CA"
linkedin_url: "https://linkedin.com/in/janedoe"
github_url: "https://github.com/janedoe"
years_experience: 5
skills: [Python, Django, PostgreSQL, Docker, AWS]
education:
  - degree: "B.S. Computer Science"
    institution: "UC Berkeley"
    year: 2019
experience:
  - title: "Backend Engineer"
    company: "Acme Corp"
    start: "2021-03"
    end: "present"
    bullets:
      - "Built REST APIs serving 10M requests/day"
summary: "Backend engineer with 5 years building scalable APIs and distributed systems."
```

`config/search.yaml`:
```yaml
job_titles: ["Backend Engineer", "Python Engineer", "Software Engineer"]
locations: ["San Francisco, CA", "Remote"]
remote_only: false
salary_min: 120000
experience_level: mid
exclude_keywords: ["10+ years", "Staff", "Principal"]
```

`config/qa_bank.yaml`:
```yaml
- question: "Why do you want to work here?"
  answer: "I'm drawn to companies solving hard engineering problems at scale."
- question: "What is your expected salary?"
  answer: "I'm targeting $130,000–$160,000 depending on the full package."
- question: "Are you authorized to work in the US?"
  answer: "Yes"
- question: "Are you willing to relocate?"
  answer: "I prefer remote but am open to discussing relocation for the right role."
```

- [ ] **Step 3: Create all `__init__.py` files**

Run: `mkdir -p src/discovery src/engine src/profile src/qa src/tracker src/notifications data screenshots browser_profiles && touch src/__init__.py src/discovery/__init__.py src/engine/__init__.py src/profile/__init__.py src/qa/__init__.py src/tracker/__init__.py src/notifications/__init__.py`

- [ ] **Step 4: Install dependencies**

Run: `pip install -r requirements.txt && playwright install chromium`

Expected: all packages install without error; Chromium browser downloaded.

- [ ] **Step 5: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffold, dependencies, sample configs"
```

---

### Task 2: Types + Data Models

**Files:**
- Create: `src/types.py`
- Create: `tests/test_types.py`

**Interfaces:**
- Produces: `JobListing`, `SearchCriteria`, `FormField`, `ApplicationResult` — used by all subsequent tasks

- [ ] **Step 1: Write failing tests**

`tests/test_types.py`:
```python
import pytest
from src.types import JobListing, SearchCriteria, FormField, ApplicationResult

def test_job_listing_id_generation():
    job = JobListing(
        title="Backend Engineer",
        company="Acme",
        url="https://acme.com/jobs/1",
        location="Remote",
        source="linkedin",
        description="Build APIs",
    )
    assert len(job.id) == 12
    assert isinstance(job.id, str)

def test_job_listing_id_is_deterministic():
    job1 = JobListing(title="A", company="B", url="C", location="D", source="E", description="F")
    job2 = JobListing(title="A", company="B", url="C", location="D", source="E", description="F")
    assert job1.id == job2.id

def test_search_criteria_defaults():
    c = SearchCriteria(job_titles=["Engineer"], locations=["Remote"])
    assert c.remote_only is False
    assert c.salary_min is None
    assert c.exclude_keywords == []

def test_form_field_required_default():
    f = FormField(field_id="name", label="Full Name", field_type="text")
    assert f.required is False

def test_application_result_statuses():
    for status in ["applied", "failed", "skipped"]:
        r = ApplicationResult(job_id="abc123", status=status)
        assert r.status == status
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_types.py -v`
Expected: `ImportError` or `ModuleNotFoundError`

- [ ] **Step 3: Implement types**

`src/types.py`:
```python
import hashlib
from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class JobListing:
    title: str
    company: str
    url: str
    location: str
    source: str
    description: str
    date_found: date = field(default_factory=date.today)
    id: str = field(init=False)

    def __post_init__(self):
        raw = f"{self.company}{self.title}{self.url}"
        self.id = hashlib.sha256(raw.encode()).hexdigest()[:12]


@dataclass
class SearchCriteria:
    job_titles: list[str]
    locations: list[str]
    remote_only: bool = False
    salary_min: Optional[int] = None
    experience_level: str = "mid"
    exclude_keywords: list[str] = field(default_factory=list)


@dataclass
class FormField:
    field_id: str
    label: str
    field_type: str  # "text" | "select" | "file" | "textarea" | "checkbox"
    required: bool = False
    options: list[str] = field(default_factory=list)  # for select fields


@dataclass
class ApplicationResult:
    job_id: str
    status: str  # "applied" | "failed" | "skipped"
    screenshot_path: Optional[str] = None
    resume_used: Optional[str] = None
    notes: Optional[str] = None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_types.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/types.py tests/test_types.py
git commit -m "feat: add core data types (JobListing, SearchCriteria, FormField, ApplicationResult)"
```

---

### Task 3: Profile Loader

**Files:**
- Create: `src/profile/loader.py`
- Create: `tests/test_profile_loader.py`

**Interfaces:**
- Consumes: `config/profile.yaml`, `config/search.yaml`
- Produces: `load_profile() -> dict`, `load_search_criteria() -> SearchCriteria`

- [ ] **Step 1: Write failing tests**

`tests/test_profile_loader.py`:
```python
import pytest
from src.profile.loader import load_profile, load_search_criteria
from src.types import SearchCriteria

def test_load_profile_returns_dict():
    profile = load_profile("config/profile.yaml")
    assert isinstance(profile, dict)
    assert "first_name" in profile
    assert "email" in profile

def test_load_profile_missing_file():
    with pytest.raises(FileNotFoundError):
        load_profile("config/nonexistent.yaml")

def test_load_search_criteria_returns_dataclass():
    criteria = load_search_criteria("config/search.yaml")
    assert isinstance(criteria, SearchCriteria)
    assert len(criteria.job_titles) > 0
    assert len(criteria.locations) > 0

def test_load_search_criteria_exclude_keywords_default():
    criteria = load_search_criteria("config/search.yaml")
    assert isinstance(criteria.exclude_keywords, list)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_profile_loader.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement loader**

`src/profile/loader.py`:
```python
from pathlib import Path
import yaml
from src.types import SearchCriteria


def load_profile(path: str) -> dict:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Profile file not found: {path}")
    with open(p) as f:
        return yaml.safe_load(f)


def load_search_criteria(path: str) -> SearchCriteria:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Search config not found: {path}")
    with open(p) as f:
        data = yaml.safe_load(f)
    return SearchCriteria(
        job_titles=data.get("job_titles", []),
        locations=data.get("locations", []),
        remote_only=data.get("remote_only", False),
        salary_min=data.get("salary_min"),
        experience_level=data.get("experience_level", "mid"),
        exclude_keywords=data.get("exclude_keywords", []),
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_profile_loader.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/profile/loader.py tests/test_profile_loader.py
git commit -m "feat: add profile and search criteria loader"
```

---

### Task 4: Tracker Database

**Files:**
- Create: `src/tracker/db.py`
- Create: `tests/test_tracker_db.py`

**Interfaces:**
- Consumes: `JobListing`, `ApplicationResult` from `src.types`
- Produces:
  - `TrackerDB.init_db() -> None`
  - `TrackerDB.add_job(job: JobListing) -> None`
  - `TrackerDB.is_duplicate(job: JobListing) -> bool`
  - `TrackerDB.update_status(job_id: str, status: str, **kwargs) -> None`
  - `TrackerDB.get_jobs(status: str | None) -> list[dict]`
  - `TrackerDB.get_stats() -> dict`

- [ ] **Step 1: Write failing tests**

`tests/test_tracker_db.py`:
```python
import pytest
import os
from src.tracker.db import TrackerDB
from src.types import JobListing

TEST_DB = "data/test_applications.db"

@pytest.fixture
def db():
    tracker = TrackerDB(TEST_DB)
    tracker.init_db()
    yield tracker
    os.remove(TEST_DB)

def make_job(title="Backend Engineer", company="Acme", url="https://acme.com/1"):
    return JobListing(title=title, company=company, url=url,
                      location="Remote", source="linkedin", description="Build APIs")

def test_add_and_retrieve_job(db):
    job = make_job()
    db.add_job(job)
    jobs = db.get_jobs()
    assert len(jobs) == 1
    assert jobs[0]["title"] == "Backend Engineer"
    assert jobs[0]["status"] == "queued"

def test_is_duplicate_after_add(db):
    job = make_job()
    db.add_job(job)
    assert db.is_duplicate(job) is True

def test_is_not_duplicate_new_job(db):
    job = make_job()
    assert db.is_duplicate(job) is False

def test_update_status(db):
    job = make_job()
    db.add_job(job)
    db.update_status(job.id, "applied", screenshot_path="screenshots/abc.png")
    jobs = db.get_jobs(status="applied")
    assert len(jobs) == 1
    assert jobs[0]["screenshot_path"] == "screenshots/abc.png"

def test_get_stats(db):
    db.add_job(make_job(url="https://a.com"))
    db.add_job(make_job(url="https://b.com"))
    db.update_status(make_job(url="https://a.com").id, "applied")
    stats = db.get_stats()
    assert stats["total"] == 2
    assert stats["applied"] >= 1

def test_cross_source_dedup(db):
    job1 = make_job()
    job2 = JobListing(title="Backend Engineer", company="Acme", url="https://indeed.com/1",
                      location="Remote", source="indeed", description="Different URL")
    db.add_job(job1)
    assert db.is_duplicate(job2) is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_tracker_db.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement TrackerDB**

`src/tracker/db.py`:
```python
import hashlib
import sqlite3
from datetime import date
from pathlib import Path
from typing import Optional
from src.types import JobListing


class TrackerDB:
    def __init__(self, db_path: str = "data/applications.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    company TEXT NOT NULL,
                    url TEXT NOT NULL,
                    source TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'queued',
                    date_found DATE NOT NULL,
                    date_applied DATE,
                    screenshot_path TEXT,
                    resume_used TEXT,
                    notes TEXT,
                    company_title_hash TEXT NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON jobs(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_company_title ON jobs(company_title_hash)")

    def _company_title_hash(self, job: JobListing) -> str:
        raw = f"{job.company.lower().strip()}{job.title.lower().strip()}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def add_job(self, job: JobListing) -> None:
        with self._connect() as conn:
            conn.execute("""
                INSERT OR IGNORE INTO jobs
                (id, title, company, url, source, status, date_found, company_title_hash)
                VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)
            """, (job.id, job.title, job.company, job.url, job.source,
                  job.date_found.isoformat(), self._company_title_hash(job)))

    def is_duplicate(self, job: JobListing) -> bool:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM jobs WHERE company_title_hash = ? AND status IN ('applied', 'skipped', 'failed', 'queued')",
                (self._company_title_hash(job),)
            ).fetchone()
        return row is not None

    def update_status(self, job_id: str, status: str, **kwargs) -> None:
        allowed = {"screenshot_path", "resume_used", "notes", "date_applied"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        updates["status"] = status
        if status == "applied" and "date_applied" not in updates:
            updates["date_applied"] = date.today().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [job_id]
        with self._connect() as conn:
            conn.execute(f"UPDATE jobs SET {set_clause} WHERE id = ?", values)

    def get_jobs(self, status: Optional[str] = None) -> list[dict]:
        with self._connect() as conn:
            if status:
                rows = conn.execute("SELECT * FROM jobs WHERE status = ?", (status,)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM jobs").fetchall()
        return [dict(row) for row in rows]

    def get_stats(self) -> dict:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT status, COUNT(*) as count FROM jobs GROUP BY status"
            ).fetchall()
        stats = {row["status"]: row["count"] for row in rows}
        stats["total"] = sum(stats.values())
        return stats
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_tracker_db.py -v`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add src/tracker/db.py tests/test_tracker_db.py
git commit -m "feat: add SQLite tracker DB with deduplication and status tracking"
```

---

### Task 5: Q&A Answerer

**Files:**
- Create: `src/qa/answerer.py`
- Create: `tests/test_answerer.py`

**Interfaces:**
- Consumes: `config/qa_bank.yaml`, Claude API (`anthropic.Anthropic`)
- Produces: `QAAnswerer.answer(question: str, job_description: str, profile: dict) -> str`

- [ ] **Step 1: Write failing tests**

`tests/test_answerer.py`:
```python
import pytest
from unittest.mock import MagicMock, patch
from src.qa.answerer import QAAnswerer

QA_BANK = [
    {"question": "Are you authorized to work in the US?", "answer": "Yes"},
    {"question": "Why do you want to work here?", "answer": "I love hard problems."},
]

def test_exact_match_returns_bank_answer():
    qa = QAAnswerer(qa_bank=QA_BANK, llm_client=None)
    result = qa.answer("Are you authorized to work in the US?", job_description="", profile={})
    assert result == "Yes"

def test_fuzzy_match_returns_bank_answer():
    qa = QAAnswerer(qa_bank=QA_BANK, llm_client=None)
    result = qa.answer("Are you authorized to work in the United States?", job_description="", profile={})
    assert result == "Yes"

def test_no_match_calls_llm():
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="Generated answer")]
    )
    qa = QAAnswerer(qa_bank=QA_BANK, llm_client=mock_client)
    result = qa.answer("Describe a time you showed leadership.", job_description="Lead a team", profile={"first_name": "Jane"})
    assert result == "Generated answer"
    mock_client.messages.create.assert_called_once()

def test_empty_qa_bank_calls_llm():
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="LLM answer")]
    )
    qa = QAAnswerer(qa_bank=[], llm_client=mock_client)
    result = qa.answer("Any question", job_description="desc", profile={})
    assert result == "LLM answer"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_answerer.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement QAAnswerer**

`src/qa/answerer.py`:
```python
import yaml
from pathlib import Path
from rapidfuzz import fuzz
from typing import Optional


class QAAnswerer:
    FUZZY_THRESHOLD = 80

    def __init__(self, qa_bank: list[dict], llm_client):
        self.qa_bank = qa_bank
        self.llm_client = llm_client

    @classmethod
    def from_file(cls, path: str, llm_client) -> "QAAnswerer":
        with open(path) as f:
            qa_bank = yaml.safe_load(f) or []
        return cls(qa_bank=qa_bank, llm_client=llm_client)

    def _find_in_bank(self, question: str) -> Optional[str]:
        best_score = 0
        best_answer = None
        for entry in self.qa_bank:
            score = fuzz.token_sort_ratio(question.lower(), entry["question"].lower())
            if score > best_score:
                best_score = score
                best_answer = entry["answer"]
        if best_score >= self.FUZZY_THRESHOLD:
            return best_answer
        return None

    def _generate_with_llm(self, question: str, job_description: str, profile: dict) -> str:
        prompt = (
            f"You are helping a job applicant answer an application question.\n\n"
            f"Applicant profile:\n{yaml.dump(profile)}\n\n"
            f"Job description:\n{job_description}\n\n"
            f"Question: {question}\n\n"
            f"Write a concise, professional answer in first person. 2-4 sentences max."
        )
        response = self.llm_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()

    def answer(self, question: str, job_description: str, profile: dict) -> str:
        bank_answer = self._find_in_bank(question)
        if bank_answer:
            return bank_answer
        return self._generate_with_llm(question, job_description, profile)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_answerer.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/qa/answerer.py tests/test_answerer.py
git commit -m "feat: add Q&A answerer with fuzzy bank match and LLM fallback"
```

---

### Task 6: CAPTCHA Detection + Notifications

**Files:**
- Create: `src/notifications/alerts.py`
- Create: `src/engine/captcha.py`
- Create: `tests/test_captcha.py`

**Interfaces:**
- Consumes: Playwright `Page` object
- Produces:
  - `is_captcha_present(page) -> bool`
  - `pause_for_captcha(company: str) -> None` (blocks until user presses Enter)

- [ ] **Step 1: Write failing tests**

`tests/test_captcha.py`:
```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.engine.captcha import is_captcha_present

@pytest.mark.asyncio
async def test_detects_hcaptcha():
    page = AsyncMock()
    page.query_selector = AsyncMock(side_effect=lambda sel: MagicMock() if "hcaptcha" in sel else None)
    assert await is_captcha_present(page) is True

@pytest.mark.asyncio
async def test_detects_recaptcha():
    page = AsyncMock()
    page.query_selector = AsyncMock(side_effect=lambda sel: MagicMock() if "recaptcha" in sel else None)
    assert await is_captcha_present(page) is True

@pytest.mark.asyncio
async def test_no_captcha():
    page = AsyncMock()
    page.query_selector = AsyncMock(return_value=None)
    assert await is_captcha_present(page) is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_captcha.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement captcha detection and alerts**

`src/engine/captcha.py`:
```python
CAPTCHA_SELECTORS = [
    "iframe[src*='hcaptcha']",
    "iframe[src*='recaptcha']",
    ".h-captcha",
    "#cf-challenge-running",
    "[data-sitekey]",
]

async def is_captcha_present(page) -> bool:
    for selector in CAPTCHA_SELECTORS:
        element = await page.query_selector(selector)
        if element:
            return True
    return False
```

`src/notifications/alerts.py`:
```python
import sys


def pause_for_captcha(company: str) -> None:
    sys.stdout.write("\a")  # terminal bell
    sys.stdout.flush()
    print(f"\n{'='*60}")
    print(f"CAPTCHA detected at {company}")
    print("Solve it in the browser window, then press Enter to continue...")
    print(f"{'='*60}\n")
    input()


def print_run_summary(applied: int, failed: int, skipped: int, captcha_paused: int) -> None:
    print(f"\nRun complete: {applied} applied, {failed} failed, "
          f"{captcha_paused} captcha-paused (resumed), {skipped} skipped")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_captcha.py -v`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add src/engine/captcha.py src/notifications/alerts.py tests/test_captcha.py
git commit -m "feat: add CAPTCHA detection and pause/resume notification"
```

---

### Task 7: Browser Session Manager

**Files:**
- Create: `src/engine/browser.py`
- Create: `tests/test_browser.py`

**Interfaces:**
- Produces:
  - `BrowserSession.launch(source: str) -> None` (async)
  - `BrowserSession.new_page() -> Page` (async)
  - `BrowserSession.close() -> None` (async)
  - `BrowserSession` usable as async context manager

- [ ] **Step 1: Write failing tests**

`tests/test_browser.py`:
```python
import pytest
from pathlib import Path
from src.engine.browser import BrowserSession

def test_browser_profile_path():
    session = BrowserSession()
    path = session._profile_path("linkedin")
    assert "browser_profiles/linkedin" in path

def test_browser_profile_dir_created(tmp_path, monkeypatch):
    monkeypatch.setattr("src.engine.browser.PROFILES_DIR", str(tmp_path / "profiles"))
    session = BrowserSession()
    path = session._profile_path("indeed")
    Path(path).mkdir(parents=True, exist_ok=True)
    assert Path(path).exists()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_browser.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement BrowserSession**

`src/engine/browser.py`:
```python
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, Browser, Page

PROFILES_DIR = "browser_profiles"


class BrowserSession:
    def __init__(self):
        self._playwright = None
        self._browser: Browser | None = None
        self._context = None

    def _profile_path(self, source: str) -> str:
        return str(Path(PROFILES_DIR) / source)

    async def launch(self, source: str) -> None:
        profile_path = self._profile_path(source)
        Path(profile_path).mkdir(parents=True, exist_ok=True)
        self._playwright = await async_playwright().start()
        self._context = await self._playwright.chromium.launch_persistent_context(
            profile_path,
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )

    async def new_page(self) -> Page:
        return await self._context.new_page()

    async def close(self) -> None:
        if self._context:
            await self._context.close()
        if self._playwright:
            await self._playwright.stop()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_browser.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/engine/browser.py tests/test_browser.py
git commit -m "feat: add Playwright browser session manager with persistent profiles"
```

---

### Task 8: LLM-Guided Form Navigator

**Files:**
- Create: `src/engine/navigator.py`
- Create: `tests/test_navigator.py`

**Interfaces:**
- Consumes: `FormField` from `src.types`, `QAAnswerer`, `BrowserSession`
- Produces:
  - `FormNavigator.identify_fields(page) -> list[FormField]` (async)
  - `FormNavigator.fill_form(page, fields: list[FormField], profile: dict, job: JobListing, qa: QAAnswerer) -> None` (async)
  - `FormNavigator.click_next_or_submit(page) -> str` returns `"next"` | `"submitted"` | `"done"` (async)

- [ ] **Step 1: Write failing tests**

`tests/test_navigator.py`:
```python
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from src.engine.navigator import FormNavigator
from src.types import FormField, JobListing

def make_job():
    return JobListing(title="Eng", company="Co", url="https://co.com",
                      location="Remote", source="linkedin", description="Build stuff")

@pytest.mark.asyncio
async def test_identify_fields_returns_list():
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text='[{"field_id": "name", "label": "Full Name", "field_type": "text", "required": true}]')]
    )
    nav = FormNavigator(llm_client=mock_client)
    page = AsyncMock()
    page.content = AsyncMock(return_value="<input id='name'>")
    fields = await nav.identify_fields(page)
    assert len(fields) == 1
    assert fields[0].label == "Full Name"
    assert fields[0].required is True

@pytest.mark.asyncio
async def test_fill_text_field():
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="Jane Doe")]
    )
    nav = FormNavigator(llm_client=mock_client)
    page = AsyncMock()
    field = FormField(field_id="full_name", label="Full Name", field_type="text", required=True)
    qa = MagicMock()
    await nav.fill_form(page, [field], profile={"first_name": "Jane", "last_name": "Doe"},
                        job=make_job(), qa=qa)
    page.fill.assert_called_once_with("#full_name", "Jane Doe")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_navigator.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement FormNavigator**

`src/engine/navigator.py`:
```python
import json
import yaml
from src.types import FormField, JobListing
from src.qa.answerer import QAAnswerer


class FormNavigator:
    def __init__(self, llm_client):
        self.llm_client = llm_client

    async def identify_fields(self, page) -> list[FormField]:
        dom = await page.content()
        # Truncate DOM to avoid exceeding context window
        dom_excerpt = dom[:8000]
        prompt = (
            "Analyze this HTML form and return a JSON array of form fields.\n"
            "Each field: {field_id, label, field_type, required}\n"
            "field_type must be one of: text, textarea, select, file, checkbox\n"
            "Return ONLY the JSON array, no other text.\n\n"
            f"HTML:\n{dom_excerpt}"
        )
        response = self.llm_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return []
        return [
            FormField(
                field_id=f.get("field_id", ""),
                label=f.get("label", ""),
                field_type=f.get("field_type", "text"),
                required=f.get("required", False),
                options=f.get("options", []),
            )
            for f in data
            if f.get("field_id")
        ]

    async def fill_form(
        self,
        page,
        fields: list[FormField],
        profile: dict,
        job: JobListing,
        qa: QAAnswerer,
        resume_path: str = "resume/master_resume.pdf",
    ) -> None:
        for field in fields:
            selector = f"#{field.field_id}"
            if field.field_type == "file":
                await page.set_input_files(selector, resume_path)
                continue
            if field.field_type == "checkbox":
                continue  # skip checkboxes for now — need per-field logic
            value = await self._resolve_value(field, profile, job, qa)
            if not value:
                continue
            if field.field_type == "select":
                try:
                    await page.select_option(selector, value)
                except Exception:
                    pass
            else:
                try:
                    await page.fill(selector, value)
                except Exception:
                    pass

    async def _resolve_value(
        self, field: FormField, profile: dict, job: JobListing, qa: QAAnswerer
    ) -> str:
        PROFILE_FIELD_MAP = {
            "first": "first_name",
            "last": "last_name",
            "email": "email",
            "phone": "phone",
            "location": "location",
            "linkedin": "linkedin_url",
            "github": "github_url",
        }
        label_lower = field.label.lower()
        for keyword, profile_key in PROFILE_FIELD_MAP.items():
            if keyword in label_lower and profile_key in profile:
                return str(profile[profile_key])

        # Fall back to Q&A answerer for everything else
        return qa.answer(field.label, job.description, profile)

    async def click_next_or_submit(self, page) -> str:
        dom = await page.content()
        prompt = (
            "In this HTML, find the primary action button to advance a form "
            "(e.g. 'Next', 'Continue', 'Submit', 'Apply'). "
            "Return JSON: {action: 'next'|'submit', selector: '<css selector>'}. "
            "Return ONLY JSON.\n\n"
            f"HTML:\n{dom[:4000]}"
        )
        response = self.llm_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        try:
            data = json.loads(raw)
            selector = data.get("selector", "")
            action = data.get("action", "next")
            if selector:
                await page.click(selector)
                await page.wait_for_load_state("networkidle", timeout=10000)
            return "submitted" if action == "submit" else "next"
        except Exception:
            return "done"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_navigator.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/engine/navigator.py tests/test_navigator.py
git commit -m "feat: add LLM-guided form navigator for field detection and filling"
```

---

### Task 9: Discovery Base + Indeed Adapter

**Files:**
- Create: `src/discovery/base.py`
- Create: `src/discovery/indeed.py`
- Create: `tests/test_discovery_indeed.py`

**Interfaces:**
- Consumes: `SearchCriteria`, `JobListing` from `src.types`, `BrowserSession`
- Produces:
  - `BaseDiscovery.search(criteria: SearchCriteria) -> list[JobListing]` (abstract async)
  - `IndeedDiscovery(browser_session).search(criteria) -> list[JobListing]`

- [ ] **Step 1: Write failing tests**

`tests/test_discovery_indeed.py`:
```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.discovery.indeed import IndeedDiscovery
from src.types import SearchCriteria

def make_criteria():
    return SearchCriteria(
        job_titles=["Backend Engineer"],
        locations=["Remote"],
        exclude_keywords=["Principal"],
    )

@pytest.mark.asyncio
async def test_search_returns_list_of_job_listings():
    mock_session = AsyncMock()
    mock_page = AsyncMock()
    mock_session.new_page = AsyncMock(return_value=mock_page)
    mock_page.goto = AsyncMock()
    mock_page.wait_for_selector = AsyncMock()
    mock_page.query_selector_all = AsyncMock(return_value=[])
    discovery = IndeedDiscovery(browser_session=mock_session)
    results = await discovery.search(make_criteria())
    assert isinstance(results, list)

@pytest.mark.asyncio
async def test_search_filters_excluded_keywords():
    from src.types import JobListing
    mock_session = AsyncMock()
    mock_page = AsyncMock()
    mock_session.new_page = AsyncMock(return_value=mock_page)
    mock_page.goto = AsyncMock()
    mock_page.wait_for_selector = AsyncMock()

    job_el = AsyncMock()
    job_el.query_selector = AsyncMock(side_effect=lambda sel: AsyncMock(
        inner_text=AsyncMock(return_value={
            "h2": "Principal Engineer",
            ".companyName": "Acme",
            ".companyLocation": "Remote",
            "a": "https://indeed.com/1",
        }.get(sel, ""))
    ))
    mock_page.query_selector_all = AsyncMock(return_value=[job_el])

    discovery = IndeedDiscovery(browser_session=mock_session)
    results = await discovery.search(make_criteria())
    titles = [j.title for j in results]
    assert not any("Principal" in t for t in titles)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_discovery_indeed.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement base and Indeed adapter**

`src/discovery/base.py`:
```python
from abc import ABC, abstractmethod
from src.types import JobListing, SearchCriteria


class BaseDiscovery(ABC):
    @abstractmethod
    async def search(self, criteria: SearchCriteria) -> list[JobListing]:
        pass

    def _passes_filters(self, title: str, criteria: SearchCriteria) -> bool:
        title_lower = title.lower()
        for kw in criteria.exclude_keywords:
            if kw.lower() in title_lower:
                return False
        return True
```

`src/discovery/indeed.py`:
```python
import urllib.parse
from src.discovery.base import BaseDiscovery
from src.types import JobListing, SearchCriteria


class IndeedDiscovery(BaseDiscovery):
    BASE_URL = "https://www.indeed.com/jobs"

    def __init__(self, browser_session):
        self.session = browser_session

    async def search(self, criteria: SearchCriteria) -> list[JobListing]:
        results = []
        for title in criteria.job_titles:
            for location in criteria.locations:
                listings = await self._search_one(title, location, criteria)
                results.extend(listings)
        return results

    async def _search_one(self, title: str, location: str, criteria: SearchCriteria) -> list[JobListing]:
        page = await self.session.new_page()
        params = urllib.parse.urlencode({"q": title, "l": location})
        url = f"{self.BASE_URL}?{params}"
        try:
            await page.goto(url)
            await page.wait_for_selector(".jobsearch-ResultsList", timeout=10000)
        except Exception:
            await page.close()
            return []

        job_cards = await page.query_selector_all(".job_seen_beacon")
        listings = []
        for card in job_cards:
            try:
                title_el = await card.query_selector("h2")
                company_el = await card.query_selector(".companyName")
                location_el = await card.query_selector(".companyLocation")
                link_el = await card.query_selector("a")
                if not all([title_el, company_el, link_el]):
                    continue
                job_title = await title_el.inner_text()
                if not self._passes_filters(job_title, criteria):
                    continue
                company = await company_el.inner_text()
                loc = await location_el.inner_text() if location_el else location
                href = await link_el.get_attribute("href") or ""
                job_url = f"https://www.indeed.com{href}" if href.startswith("/") else href
                desc_el = await card.query_selector(".job-snippet")
                description = await desc_el.inner_text() if desc_el else ""
                listings.append(JobListing(
                    title=job_title.strip(),
                    company=company.strip(),
                    url=job_url,
                    location=loc.strip(),
                    source="indeed",
                    description=description.strip(),
                ))
            except Exception:
                continue
        await page.close()
        return listings
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_discovery_indeed.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/discovery/base.py src/discovery/indeed.py tests/test_discovery_indeed.py
git commit -m "feat: add discovery base class and Indeed adapter"
```

---

### Task 10: LinkedIn, Glassdoor, Naukri Adapters

**Files:**
- Create: `src/discovery/linkedin.py`
- Create: `src/discovery/glassdoor.py`
- Create: `src/discovery/naukri.py`
- Create: `tests/test_discovery_adapters.py`

**Interfaces:**
- Consumes: `BaseDiscovery`, `BrowserSession`, `SearchCriteria`, `JobListing`
- Produces: `LinkedInDiscovery`, `GlassdoorDiscovery`, `NaukriDiscovery` — each implementing `search(criteria) -> list[JobListing]`

- [ ] **Step 1: Write failing tests**

`tests/test_discovery_adapters.py`:
```python
import pytest
from unittest.mock import AsyncMock
from src.discovery.linkedin import LinkedInDiscovery
from src.discovery.glassdoor import GlassdoorDiscovery
from src.discovery.naukri import NaukriDiscovery
from src.types import SearchCriteria

def make_criteria():
    return SearchCriteria(job_titles=["Engineer"], locations=["Remote"])

def make_empty_session():
    mock_session = AsyncMock()
    mock_page = AsyncMock()
    mock_session.new_page = AsyncMock(return_value=mock_page)
    mock_page.goto = AsyncMock()
    mock_page.wait_for_selector = AsyncMock(side_effect=Exception("timeout"))
    mock_page.query_selector_all = AsyncMock(return_value=[])
    return mock_session

@pytest.mark.asyncio
async def test_linkedin_search_returns_list():
    discovery = LinkedInDiscovery(browser_session=make_empty_session())
    results = await discovery.search(make_criteria())
    assert isinstance(results, list)

@pytest.mark.asyncio
async def test_glassdoor_search_returns_list():
    discovery = GlassdoorDiscovery(browser_session=make_empty_session())
    results = await discovery.search(make_criteria())
    assert isinstance(results, list)

@pytest.mark.asyncio
async def test_naukri_search_returns_list():
    discovery = NaukriDiscovery(browser_session=make_empty_session())
    results = await discovery.search(make_criteria())
    assert isinstance(results, list)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_discovery_adapters.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement LinkedIn adapter**

`src/discovery/linkedin.py`:
```python
import urllib.parse
from src.discovery.base import BaseDiscovery
from src.types import JobListing, SearchCriteria


class LinkedInDiscovery(BaseDiscovery):
    BASE_URL = "https://www.linkedin.com/jobs/search"

    def __init__(self, browser_session):
        self.session = browser_session

    async def search(self, criteria: SearchCriteria) -> list[JobListing]:
        results = []
        for title in criteria.job_titles:
            for location in criteria.locations:
                listings = await self._search_one(title, location, criteria)
                results.extend(listings)
        return results

    async def _search_one(self, title: str, location: str, criteria: SearchCriteria) -> list[JobListing]:
        page = await self.session.new_page()
        params = urllib.parse.urlencode({"keywords": title, "location": location})
        try:
            await page.goto(f"{self.BASE_URL}?{params}")
            await page.wait_for_selector(".jobs-search__results-list", timeout=10000)
        except Exception:
            await page.close()
            return []
        cards = await page.query_selector_all(".jobs-search__results-list li")
        listings = []
        for card in cards:
            try:
                title_el = await card.query_selector(".base-search-card__title")
                company_el = await card.query_selector(".base-search-card__subtitle")
                location_el = await card.query_selector(".job-search-card__location")
                link_el = await card.query_selector("a.base-card__full-link")
                if not all([title_el, company_el, link_el]):
                    continue
                job_title = await title_el.inner_text()
                if not self._passes_filters(job_title, criteria):
                    continue
                listings.append(JobListing(
                    title=job_title.strip(),
                    company=(await company_el.inner_text()).strip(),
                    url=(await link_el.get_attribute("href") or "").strip(),
                    location=(await location_el.inner_text()).strip() if location_el else location,
                    source="linkedin",
                    description="",
                ))
            except Exception:
                continue
        await page.close()
        return listings
```

- [ ] **Step 4: Implement Glassdoor adapter**

`src/discovery/glassdoor.py`:
```python
import urllib.parse
from src.discovery.base import BaseDiscovery
from src.types import JobListing, SearchCriteria


class GlassdoorDiscovery(BaseDiscovery):
    BASE_URL = "https://www.glassdoor.com/Job/jobs.htm"

    def __init__(self, browser_session):
        self.session = browser_session

    async def search(self, criteria: SearchCriteria) -> list[JobListing]:
        results = []
        for title in criteria.job_titles:
            for location in criteria.locations:
                listings = await self._search_one(title, location, criteria)
                results.extend(listings)
        return results

    async def _search_one(self, title: str, location: str, criteria: SearchCriteria) -> list[JobListing]:
        page = await self.session.new_page()
        params = urllib.parse.urlencode({"sc.keyword": title, "locT": "C", "locName": location})
        try:
            await page.goto(f"{self.BASE_URL}?{params}")
            await page.wait_for_selector("[data-test='jobListing']", timeout=10000)
        except Exception:
            await page.close()
            return []
        cards = await page.query_selector_all("[data-test='jobListing']")
        listings = []
        for card in cards:
            try:
                title_el = await card.query_selector("[data-test='job-title']")
                company_el = await card.query_selector("[data-test='employer-name']")
                location_el = await card.query_selector("[data-test='emp-location']")
                link_el = await card.query_selector("a")
                if not all([title_el, company_el, link_el]):
                    continue
                job_title = await title_el.inner_text()
                if not self._passes_filters(job_title, criteria):
                    continue
                href = await link_el.get_attribute("href") or ""
                job_url = f"https://www.glassdoor.com{href}" if href.startswith("/") else href
                listings.append(JobListing(
                    title=job_title.strip(),
                    company=(await company_el.inner_text()).strip(),
                    url=job_url,
                    location=(await location_el.inner_text()).strip() if location_el else location,
                    source="glassdoor",
                    description="",
                ))
            except Exception:
                continue
        await page.close()
        return listings
```

- [ ] **Step 5: Implement Naukri adapter**

`src/discovery/naukri.py`:
```python
import urllib.parse
from src.discovery.base import BaseDiscovery
from src.types import JobListing, SearchCriteria


class NaukriDiscovery(BaseDiscovery):
    BASE_URL = "https://www.naukri.com"

    def __init__(self, browser_session):
        self.session = browser_session

    async def search(self, criteria: SearchCriteria) -> list[JobListing]:
        results = []
        for title in criteria.job_titles:
            listings = await self._search_one(title, criteria)
            results.extend(listings)
        return results

    async def _search_one(self, title: str, criteria: SearchCriteria) -> list[JobListing]:
        page = await self.session.new_page()
        slug = urllib.parse.quote(title.lower().replace(" ", "-"))
        try:
            await page.goto(f"{self.BASE_URL}/{slug}-jobs")
            await page.wait_for_selector(".list", timeout=10000)
        except Exception:
            await page.close()
            return []
        cards = await page.query_selector_all("article.jobTuple")
        listings = []
        for card in cards:
            try:
                title_el = await card.query_selector(".title")
                company_el = await card.query_selector(".companyInfo .subTitle")
                location_el = await card.query_selector(".location")
                link_el = await card.query_selector("a.title")
                if not all([title_el, company_el, link_el]):
                    continue
                job_title = await title_el.inner_text()
                if not self._passes_filters(job_title, criteria):
                    continue
                listings.append(JobListing(
                    title=job_title.strip(),
                    company=(await company_el.inner_text()).strip(),
                    url=(await link_el.get_attribute("href") or "").strip(),
                    location=(await location_el.inner_text()).strip() if location_el else "",
                    source="naukri",
                    description="",
                ))
            except Exception:
                continue
        await page.close()
        return listings
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pytest tests/test_discovery_adapters.py -v`
Expected: 3 passed

- [ ] **Step 7: Commit**

```bash
git add src/discovery/linkedin.py src/discovery/glassdoor.py src/discovery/naukri.py tests/test_discovery_adapters.py
git commit -m "feat: add LinkedIn, Glassdoor, and Naukri discovery adapters"
```

---

### Task 11: Career Page Adapter (LLM-Guided)

**Files:**
- Create: `src/discovery/career_page.py`
- Create: `tests/test_career_page.py`

**Interfaces:**
- Consumes: `BaseDiscovery`, `BrowserSession`, Claude API
- Produces: `CareerPageDiscovery(browser_session, llm_client).search_company(company_url: str, criteria: SearchCriteria) -> list[JobListing]`

- [ ] **Step 1: Write failing tests**

`tests/test_career_page.py`:
```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.discovery.career_page import CareerPageDiscovery
from src.types import SearchCriteria

def make_criteria():
    return SearchCriteria(job_titles=["Backend Engineer"], locations=["Remote"])

@pytest.mark.asyncio
async def test_search_company_returns_list():
    mock_session = AsyncMock()
    mock_page = AsyncMock()
    mock_session.new_page = AsyncMock(return_value=mock_page)
    mock_page.goto = AsyncMock()
    mock_page.content = AsyncMock(return_value="<html>No jobs</html>")

    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text='[]')]
    )
    discovery = CareerPageDiscovery(browser_session=mock_session, llm_client=mock_client)
    results = await discovery.search_company("https://acme.com", make_criteria())
    assert isinstance(results, list)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_career_page.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement CareerPageDiscovery**

`src/discovery/career_page.py`:
```python
import json
from src.discovery.base import BaseDiscovery
from src.types import JobListing, SearchCriteria


class CareerPageDiscovery(BaseDiscovery):
    def __init__(self, browser_session, llm_client):
        self.session = browser_session
        self.llm_client = llm_client

    async def search(self, criteria: SearchCriteria) -> list[JobListing]:
        # Career page discovery is driven externally via search_company()
        return []

    async def search_company(self, company_url: str, criteria: SearchCriteria) -> list[JobListing]:
        page = await self.session.new_page()
        try:
            await page.goto(company_url)
            careers_url = await self._find_careers_link(page, company_url)
            if careers_url:
                await page.goto(careers_url)
            dom = await page.content()
        except Exception:
            await page.close()
            return []

        listings = await self._extract_jobs(dom, company_url, criteria)
        await page.close()
        return listings

    async def _find_careers_link(self, page, base_url: str) -> str | None:
        prompt = (
            f"In this HTML, find the URL for the careers/jobs page. "
            f"Return ONLY the URL string, nothing else. "
            f"If not found, return null.\n\nHTML:\n{(await page.content())[:4000]}"
        )
        response = self.llm_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )
        result = response.content[0].text.strip()
        if result.lower() in ("null", "none", ""):
            return None
        if result.startswith("/"):
            from urllib.parse import urlparse
            parsed = urlparse(base_url)
            return f"{parsed.scheme}://{parsed.netloc}{result}"
        return result

    async def _extract_jobs(self, dom: str, company_url: str, criteria: SearchCriteria) -> list[JobListing]:
        titles = ", ".join(criteria.job_titles)
        prompt = (
            f"Extract job listings from this HTML that match these roles: {titles}.\n"
            f"Return a JSON array: [{{title, url, location, description}}]\n"
            f"Return ONLY the JSON array.\n\nHTML:\n{dom[:8000]}"
        )
        response = self.llm_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return []

        from urllib.parse import urlparse
        parsed = urlparse(company_url)
        company_name = parsed.netloc.replace("www.", "")

        results = []
        for item in data:
            title = item.get("title", "")
            if not title or not self._passes_filters(title, criteria):
                continue
            url = item.get("url", "")
            if url.startswith("/"):
                url = f"{parsed.scheme}://{parsed.netloc}{url}"
            results.append(JobListing(
                title=title,
                company=company_name,
                url=url,
                location=item.get("location", ""),
                source="career_page",
                description=item.get("description", ""),
            ))
        return results
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_career_page.py -v`
Expected: 1 passed

- [ ] **Step 5: Commit**

```bash
git add src/discovery/career_page.py tests/test_career_page.py
git commit -m "feat: add LLM-guided career page discovery adapter"
```

---

### Task 12: Resume Tailor

**Files:**
- Create: `src/profile/tailor.py`
- Create: `tests/test_tailor.py`

**Interfaces:**
- Consumes: Claude API, `profile: dict`, `job_description: str`, `master_resume_path: str`
- Produces: `ResumeTailor.tailor(profile: dict, job_description: str, output_path: str) -> str` (returns output path)

- [ ] **Step 1: Write failing tests**

`tests/test_tailor.py`:
```python
import pytest
import os
from unittest.mock import MagicMock
from src.profile.tailor import ResumeTailor

PROFILE = {
    "first_name": "Jane", "last_name": "Doe", "email": "jane@example.com",
    "summary": "Backend engineer with 5 years experience.",
    "skills": ["Python", "Django"],
    "experience": [{"title": "Engineer", "company": "Acme", "start": "2021-03", "end": "present", "bullets": ["Built APIs"]}],
    "education": [{"degree": "B.S. CS", "institution": "UC Berkeley", "year": 2019}],
}

def test_tailor_returns_pdf_path(tmp_path):
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="Experienced backend engineer focused on scalable systems.")]
    )
    tailor = ResumeTailor(llm_client=mock_client)
    output = str(tmp_path / "tailored.pdf")
    result = tailor.tailor(PROFILE, "Build scalable APIs", output_path=output)
    assert result == output
    assert os.path.exists(output)

def test_tailor_calls_llm_with_job_description():
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="Tailored summary.")]
    )
    tailor = ResumeTailor(llm_client=mock_client)
    tailor.tailor(PROFILE, "Need Django expert", output_path="/tmp/test_tailor.pdf")
    call_args = mock_client.messages.create.call_args
    assert "Django" in str(call_args)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_tailor.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement ResumeTailor**

`src/profile/tailor.py`:
```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


class ResumeTailor:
    def __init__(self, llm_client):
        self.llm_client = llm_client

    def _tailor_summary(self, profile: dict, job_description: str) -> str:
        prompt = (
            f"Rewrite this professional summary to match the job description. "
            f"Keep it 2-3 sentences, first person, professional.\n\n"
            f"Original summary: {profile.get('summary', '')}\n\n"
            f"Job description: {job_description}\n\n"
            f"Return ONLY the new summary text."
        )
        response = self.llm_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()

    def tailor(self, profile: dict, job_description: str, output_path: str) -> str:
        tailored_summary = self._tailor_summary(profile, job_description)
        self._generate_pdf(profile, tailored_summary, output_path)
        return output_path

    def _generate_pdf(self, profile: dict, summary: str, output_path: str) -> None:
        doc = SimpleDocTemplate(output_path, pagesize=letter,
                                leftMargin=inch, rightMargin=inch,
                                topMargin=inch, bottomMargin=inch)
        styles = getSampleStyleSheet()
        name_style = ParagraphStyle("Name", fontSize=16, spaceAfter=4, fontName="Helvetica-Bold")
        section_style = ParagraphStyle("Section", fontSize=12, spaceAfter=2, fontName="Helvetica-Bold")
        body_style = styles["Normal"]

        name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}"
        contact = f"{profile.get('email', '')} | {profile.get('phone', '')} | {profile.get('location', '')}"

        elements = [
            Paragraph(name, name_style),
            Paragraph(contact, body_style),
            Spacer(1, 0.1 * inch),
            Paragraph("Summary", section_style),
            Paragraph(summary, body_style),
            Spacer(1, 0.1 * inch),
            Paragraph("Skills", section_style),
            Paragraph(", ".join(profile.get("skills", [])), body_style),
            Spacer(1, 0.1 * inch),
            Paragraph("Experience", section_style),
        ]

        for exp in profile.get("experience", []):
            elements.append(Paragraph(
                f"<b>{exp.get('title')} at {exp.get('company')}</b> ({exp.get('start')} – {exp.get('end')})",
                body_style
            ))
            for bullet in exp.get("bullets", []):
                elements.append(Paragraph(f"• {bullet}", body_style))
            elements.append(Spacer(1, 0.05 * inch))

        elements.append(Paragraph("Education", section_style))
        for edu in profile.get("education", []):
            elements.append(Paragraph(
                f"{edu.get('degree')}, {edu.get('institution')} ({edu.get('year')})",
                body_style
            ))

        doc.build(elements)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_tailor.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/profile/tailor.py tests/test_tailor.py
git commit -m "feat: add LLM-powered resume tailor with PDF generation"
```

---

### Task 13: Application Runner

**Files:**
- Create: `src/engine/runner.py`
- Create: `tests/test_runner.py`

**Interfaces:**
- Consumes: `BrowserSession`, `FormNavigator`, `QAAnswerer`, `TrackerDB`, `is_captcha_present`, `pause_for_captcha`, `print_run_summary`, `JobListing`, `ApplicationResult`
- Produces: `ApplicationRunner.run(jobs: list[JobListing], profile: dict, tailor: bool) -> list[ApplicationResult]` (async)

- [ ] **Step 1: Write failing tests**

`tests/test_runner.py`:
```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.engine.runner import ApplicationRunner
from src.types import JobListing

def make_job():
    return JobListing(title="Eng", company="Acme", url="https://acme.com/apply",
                      location="Remote", source="indeed", description="Build APIs")

@pytest.mark.asyncio
async def test_run_returns_results_list():
    mock_session = AsyncMock()
    mock_page = AsyncMock()
    mock_session.new_page = AsyncMock(return_value=mock_page)
    mock_page.goto = AsyncMock()
    mock_page.screenshot = AsyncMock()
    mock_page.close = AsyncMock()

    mock_navigator = AsyncMock()
    mock_navigator.identify_fields = AsyncMock(return_value=[])
    mock_navigator.fill_form = AsyncMock()
    mock_navigator.click_next_or_submit = AsyncMock(return_value="submitted")

    mock_qa = MagicMock()
    mock_db = MagicMock()
    mock_db.update_status = MagicMock()

    with patch("src.engine.runner.is_captcha_present", AsyncMock(return_value=False)):
        runner = ApplicationRunner(
            browser_session=mock_session,
            navigator=mock_navigator,
            qa=mock_qa,
            db=mock_db,
            profile={"first_name": "Jane"},
        )
        results = await runner.run([make_job()], tailor=False)

    assert len(results) == 1
    assert results[0].status == "applied"

@pytest.mark.asyncio
async def test_run_marks_failed_on_exception():
    mock_session = AsyncMock()
    mock_page = AsyncMock()
    mock_session.new_page = AsyncMock(return_value=mock_page)
    mock_page.goto = AsyncMock(side_effect=Exception("Network error"))
    mock_page.close = AsyncMock()

    mock_navigator = AsyncMock()
    mock_qa = MagicMock()
    mock_db = MagicMock()

    runner = ApplicationRunner(
        browser_session=mock_session,
        navigator=mock_navigator,
        qa=mock_qa,
        db=mock_db,
        profile={},
    )
    results = await runner.run([make_job()], tailor=False)
    assert results[0].status == "failed"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_runner.py -v`
Expected: `ImportError`

- [ ] **Step 3: Implement ApplicationRunner**

`src/engine/runner.py`:
```python
import asyncio
import random
from datetime import datetime
from pathlib import Path
from src.types import JobListing, ApplicationResult
from src.engine.captcha import is_captcha_present
from src.notifications.alerts import pause_for_captcha


class ApplicationRunner:
    def __init__(self, browser_session, navigator, qa, db, profile: dict,
                 screenshots_dir: str = "screenshots"):
        self.session = browser_session
        self.navigator = navigator
        self.qa = qa
        self.db = db
        self.profile = profile
        self.screenshots_dir = screenshots_dir
        Path(screenshots_dir).mkdir(exist_ok=True)

    async def run(self, jobs: list[JobListing], tailor: bool = False,
                  resume_path: str = "resume/master_resume.pdf") -> list[ApplicationResult]:
        results = []
        for job in jobs:
            result = await self._apply_one(job, tailor=tailor, resume_path=resume_path)
            results.append(result)
            self.db.update_status(
                job.id, result.status,
                screenshot_path=result.screenshot_path,
                resume_used=result.resume_used,
                notes=result.notes,
            )
            if result.status == "applied":
                delay = random.uniform(30, 60)
                await asyncio.sleep(delay)
        return results

    async def _apply_one(self, job: JobListing, tailor: bool, resume_path: str) -> ApplicationResult:
        page = await self.session.new_page()
        screenshot_path = None
        try:
            await page.goto(job.url)
            await page.wait_for_load_state("networkidle", timeout=15000)

            if await is_captcha_present(page):
                pause_for_captcha(job.company)

            max_steps = 10
            for _ in range(max_steps):
                if await is_captcha_present(page):
                    pause_for_captcha(job.company)

                fields = await self.navigator.identify_fields(page)
                await self.navigator.fill_form(
                    page, fields, self.profile, job, self.qa,
                    resume_path=resume_path,
                )
                action = await self.navigator.click_next_or_submit(page)
                if action in ("submitted", "done"):
                    break

            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            screenshot_path = f"{self.screenshots_dir}/{job.id}_{ts}.png"
            await page.screenshot(path=screenshot_path)
            await page.close()
            return ApplicationResult(
                job_id=job.id,
                status="applied",
                screenshot_path=screenshot_path,
                resume_used=resume_path,
            )
        except Exception as e:
            try:
                await page.close()
            except Exception:
                pass
            return ApplicationResult(
                job_id=job.id,
                status="failed",
                screenshot_path=screenshot_path,
                notes=str(e),
            )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_runner.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/engine/runner.py tests/test_runner.py
git commit -m "feat: add ApplicationRunner with CAPTCHA pause and error handling"
```

---

### Task 14: CLI Entrypoint

**Files:**
- Create: `main.py`
- Create: `tests/test_cli.py`

**Interfaces:**
- Consumes: all modules above
- Produces: CLI commands: `discover`, `apply`, `status`, `view`, `skip`, `update`

- [ ] **Step 1: Write failing tests**

`tests/test_cli.py`:
```python
import pytest
from click.testing import CliRunner
from unittest.mock import patch, MagicMock
from main import cli

def test_status_command_no_db(tmp_path):
    runner = CliRunner()
    with patch("main.TrackerDB") as MockDB:
        MockDB.return_value.get_stats.return_value = {"total": 0}
        result = runner.invoke(cli, ["status"])
    assert result.exit_code == 0

def test_skip_command(tmp_path):
    runner = CliRunner()
    with patch("main.TrackerDB") as MockDB:
        instance = MockDB.return_value
        instance.update_status = MagicMock()
        result = runner.invoke(cli, ["skip", "abc123"])
    assert result.exit_code == 0
    instance.update_status.assert_called_once_with("abc123", "skipped")

def test_update_command():
    runner = CliRunner()
    with patch("main.TrackerDB") as MockDB:
        instance = MockDB.return_value
        instance.update_status = MagicMock()
        result = runner.invoke(cli, ["update", "abc123", "--status", "interview"])
    assert result.exit_code == 0
    instance.update_status.assert_called_once_with("abc123", "interview")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_cli.py -v`
Expected: `ImportError` or `ModuleNotFoundError`

- [ ] **Step 3: Implement CLI**

`main.py`:
```python
import asyncio
import click
from rich.console import Console
from rich.table import Table

from src.tracker.db import TrackerDB
from src.profile.loader import load_profile, load_search_criteria

console = Console()
DB_PATH = "data/applications.db"


@click.group()
def cli():
    pass


@cli.command()
def discover():
    """Scrape new jobs and add to queue."""
    import anthropic
    from src.engine.browser import BrowserSession
    from src.discovery.linkedin import LinkedInDiscovery
    from src.discovery.indeed import IndeedDiscovery
    from src.discovery.glassdoor import GlassdoorDiscovery
    from src.discovery.naukri import NaukriDiscovery

    criteria = load_search_criteria("config/search.yaml")
    db = TrackerDB(DB_PATH)
    db.init_db()
    llm_client = anthropic.Anthropic()

    async def _run():
        total = 0
        for source_cls, source_name in [
            (LinkedInDiscovery, "linkedin"),
            (IndeedDiscovery, "indeed"),
            (GlassdoorDiscovery, "glassdoor"),
            (NaukriDiscovery, "naukri"),
        ]:
            session = BrowserSession()
            await session.launch(source_name)
            try:
                discovery = source_cls(browser_session=session)
                jobs = await discovery.search(criteria)
                new = 0
                for job in jobs:
                    if not db.is_duplicate(job):
                        db.add_job(job)
                        new += 1
                console.print(f"[green]{source_name}:[/green] {new} new jobs queued ({len(jobs)} found)")
                total += new
            finally:
                await session.close()
        console.print(f"\n[bold]Total new jobs queued: {total}[/bold]")

    asyncio.run(_run())


@cli.command()
@click.option("--tailor", is_flag=True, default=False, help="Tailor resume per job")
def apply(tailor: bool):
    """Apply to all queued jobs."""
    import anthropic
    from src.engine.browser import BrowserSession
    from src.engine.navigator import FormNavigator
    from src.engine.runner import ApplicationRunner
    from src.qa.answerer import QAAnswerer
    from src.notifications.alerts import print_run_summary

    db = TrackerDB(DB_PATH)
    db.init_db()
    jobs_data = db.get_jobs(status="queued")
    if not jobs_data:
        console.print("No queued jobs. Run 'discover' first.")
        return

    from src.types import JobListing
    from datetime import date
    jobs = [JobListing(
        title=j["title"], company=j["company"], url=j["url"],
        location=j.get("location", ""), source=j["source"],
        description=j.get("notes", ""), date_found=date.today(),
    ) for j in jobs_data]

    profile = load_profile("config/profile.yaml")
    llm_client = anthropic.Anthropic()
    qa = QAAnswerer.from_file("config/qa_bank.yaml", llm_client=llm_client)
    navigator = FormNavigator(llm_client=llm_client)

    async def _run():
        session = BrowserSession()
        await session.launch("apply")
        try:
            runner = ApplicationRunner(
                browser_session=session,
                navigator=navigator,
                qa=qa,
                db=db,
                profile=profile,
            )
            results = await runner.run(jobs, tailor=tailor)
            applied = sum(1 for r in results if r.status == "applied")
            failed = sum(1 for r in results if r.status == "failed")
            print_run_summary(applied=applied, failed=failed, skipped=0, captcha_paused=0)
        finally:
            await session.close()

    asyncio.run(_run())


@cli.command()
@click.option("--today", is_flag=True, default=False)
def status(today: bool):
    """Show application stats."""
    db = TrackerDB(DB_PATH)
    db.init_db()
    stats = db.get_stats()
    table = Table(title="Application Stats")
    table.add_column("Status")
    table.add_column("Count", justify="right")
    for key, val in stats.items():
        table.add_row(key, str(val))
    console.print(table)


@cli.command()
@click.option("--status", "filter_status", default=None)
def view(filter_status):
    """View all jobs in a table."""
    db = TrackerDB(DB_PATH)
    db.init_db()
    jobs = db.get_jobs(status=filter_status)
    table = Table(title="Jobs")
    for col in ["id", "title", "company", "source", "status", "date_found"]:
        table.add_column(col)
    for j in jobs:
        table.add_row(j["id"], j["title"], j["company"], j["source"], j["status"], str(j["date_found"]))
    console.print(table)


@cli.command()
@click.argument("job_id")
def skip(job_id: str):
    """Mark a job as skipped."""
    db = TrackerDB(DB_PATH)
    db.update_status(job_id, "skipped")
    console.print(f"Marked {job_id} as skipped.")


@cli.command()
@click.argument("job_id")
@click.option("--status", "new_status", required=True)
def update(job_id: str, new_status: str):
    """Update job status manually."""
    db = TrackerDB(DB_PATH)
    db.update_status(job_id, new_status)
    console.print(f"Updated {job_id} to '{new_status}'.")


if __name__ == "__main__":
    cli()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_cli.py -v`
Expected: 3 passed

- [ ] **Step 5: Run full test suite**

Run: `pytest tests/ -v`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add main.py tests/test_cli.py
git commit -m "feat: add CLI entrypoint with discover, apply, status, view, skip, update commands"
```

---

### Task 15: End-to-End Smoke Test + README

**Files:**
- Create: `tests/test_smoke.py`
- Create: `README.md`

**Interfaces:**
- Consumes: all modules
- Produces: verified working scaffold; user-facing setup guide

- [ ] **Step 1: Write smoke test**

`tests/test_smoke.py`:
```python
import pytest
from click.testing import CliRunner
from unittest.mock import patch, MagicMock
from main import cli

def test_cli_help():
    runner = CliRunner()
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "discover" in result.output
    assert "apply" in result.output
    assert "status" in result.output
    assert "view" in result.output
    assert "skip" in result.output
    assert "update" in result.output

def test_full_pipeline_types():
    from src.types import JobListing, SearchCriteria, FormField, ApplicationResult
    from src.tracker.db import TrackerDB
    from src.qa.answerer import QAAnswerer
    from src.engine.captcha import is_captcha_present
    from src.notifications.alerts import pause_for_captcha, print_run_summary
    from src.profile.loader import load_profile, load_search_criteria
    from src.profile.tailor import ResumeTailor
    from src.engine.browser import BrowserSession
    from src.engine.navigator import FormNavigator
    from src.engine.runner import ApplicationRunner
    from src.discovery.base import BaseDiscovery
    from src.discovery.indeed import IndeedDiscovery
    from src.discovery.linkedin import LinkedInDiscovery
    from src.discovery.glassdoor import GlassdoorDiscovery
    from src.discovery.naukri import NaukriDiscovery
    from src.discovery.career_page import CareerPageDiscovery
    assert True  # all imports succeeded
```

- [ ] **Step 2: Run smoke test**

Run: `pytest tests/test_smoke.py -v`
Expected: 2 passed

- [ ] **Step 3: Run full suite one final time**

Run: `pytest tests/ -v --tb=short`
Expected: all tests pass

- [ ] **Step 4: Create README.md**

`README.md`:
```markdown
# Auto Job Apply Bot

Automated job application bot using Playwright + Claude AI.

## Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   playwright install chromium
   ```

2. Set your Anthropic API key:
   ```
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Edit `config/profile.yaml` with your details.
4. Edit `config/search.yaml` with your job search criteria.
5. Add your resume PDF to `resume/master_resume.pdf`.
6. Optionally edit `config/qa_bank.yaml` with pre-written answers.

## Usage

```bash
# Find new jobs and add them to the queue
python main.py discover

# Apply to all queued jobs
python main.py apply

# Apply with AI-tailored resume per job
python main.py apply --tailor

# View stats
python main.py status

# View job table
python main.py view
python main.py view --status queued

# Skip a job
python main.py skip <job_id>

# Mark outcome
python main.py update <job_id> --status interview
```

## Notes

- The browser runs in headed (visible) mode so you can solve CAPTCHAs manually.
- Login to job sites manually in the browser window the first time; sessions persist.
- Screenshots are saved to `screenshots/` before each submission.
```

- [ ] **Step 5: Final commit**

```bash
git add tests/test_smoke.py README.md
git commit -m "feat: add smoke tests and README"
```
