# job-apply-bot

A Python CLI that automates job discovery and application submission. Playwright drives a real browser; Claude identifies form fields and generates answers to custom questions; SQLite tracks every application.

---

## Getting started

```bash
pip install -r requirements.txt
playwright install chromium

# Edit your profile and search criteria
nano config/profile.yaml
nano config/search.yaml

# Discover jobs and apply (LinkedIn)
python cli.py run --source linkedin --limit 10

# Dry-run (discover only, no submissions)
python cli.py run --dry-run

# Check status
python cli.py status

# Full application log
python cli.py report
```

Run tests:

```bash
pytest tests/ -v
```

---

## Features

- **LinkedIn discovery** — scrapes job cards, filters by exclude keywords, deduplicates via SQLite
- **Intelligent form filling** — Claude (`claude-sonnet-4-6`) maps form fields to profile data semantically
- **Q&A answering** — fuzzy matches against a pre-written answer bank first; falls back to Claude generation
- **SQLite tracker** — every job seen is stored; already-applied URLs are never retried
- **Screenshots** — before/after screenshots saved for every application attempt
- **Persistent browser profiles** — per-site Playwright profiles preserve login sessions
- **Rich console output** — colour-coded status messages and summary tables

---

## Configuration

### `config/profile.yaml`

Personal information used to fill application forms.

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
summary: "Backend engineer with 5 years building scalable APIs."
```

### `config/search.yaml`

Job search criteria.

```yaml
job_titles: ["Backend Engineer", "Python Engineer"]
locations: ["San Francisco, CA", "Remote"]
remote_only: false
salary_min: 120000
experience_level: mid
exclude_keywords: ["10+ years", "Staff", "Principal"]
```

### `config/qa_bank.yaml`

Pre-written answers to common application questions. Fuzzy-matched at threshold 80.

```yaml
- question: "Why do you want to work here?"
  answer: "I'm drawn to companies solving hard engineering problems at scale."
- question: "What is your expected salary?"
  answer: "I'm targeting $130,000–$160,000 depending on the full package."
```

---

## Architecture

```
cli.py (Click)
  └── _run()
        ├── load_profile() + load_search_config() + load_qa_bank()
        ├── ApplicationDB  (SQLite, data/applications.db)
        ├── QAAnswerer     (fuzzy match → Claude fallback)
        ├── LinkedInDiscovery (Playwright scraper)
        │     └── filters exclude_keywords + already_seen
        └── Applicator (per job)
              ├── FormFiller → Claude field mapping → fill
              ├── submit button click
              ├── screenshots/
              └── DB mark_applied / mark_failed
```

### Form filling pipeline

1. `page.evaluate()` extracts all visible `input`, `select`, `textarea` fields (label, placeholder, name, id, type)
2. Claude receives the field list as JSON and returns a mapping: each field → `profile.email` / `profile.phone` / `qa:<question>` / `skip`
3. Each field is filled individually in a try/except — one broken field never aborts the rest
4. `QAAnswerer.answer()` is called for any `qa:` mapped field

---

## Project structure

```
job-apply-bot/
├── cli.py                    # Click CLI (run / status / report)
├── requirements.txt
├── config/
│   ├── profile.yaml          # User profile
│   ├── search.yaml           # Search criteria
│   └── qa_bank.yaml          # Pre-written Q&A answers
├── src/
│   ├── tracker/db.py         # SQLite ApplicationDB
│   ├── profile/loader.py     # YAML loaders + dataclasses
│   ├── qa/answerer.py        # Fuzzy match + Claude Q&A
│   ├── engine/
│   │   ├── form_filler.py    # Playwright form filling
│   │   └── applicator.py    # Single-job application orchestrator
│   ├── discovery/
│   │   ├── base.py           # Abstract BaseDiscovery
│   │   └── linkedin.py       # LinkedIn scraper
│   └── notifications/
│       └── notifier.py       # Rich console output
├── data/
│   └── applications.db       # SQLite database (auto-created)
├── screenshots/              # Before/after screenshots per application
├── browser_profiles/         # Playwright persistent browser profiles
│   └── linkedin/             # Login session for LinkedIn
└── tests/
    ├── test_tracker.py       # 15 DB tests (tmp_path fixture)
    └── test_qa.py            # 15 QAAnswerer tests (mocked Claude)
```

---

## Module reference

### `ApplicationDB` — `src/tracker/db.py`

| Method | Description |
|---|---|
| `upsert(app)` | Insert or replace an application record |
| `already_seen(url)` | Returns True if URL is in the database |
| `mark_applied(id, screenshot_path)` | Set status = 'applied' |
| `mark_failed(id, notes)` | Set status = 'failed' |
| `mark_skipped(id, notes)` | Set status = 'skipped' |
| `get_all(status=None)` | Return all (or filtered) Application rows |
| `stats()` | Return `{total, applied, failed, skipped, pending}` counts |

### `QAAnswerer` — `src/qa/answerer.py`

1. Checks `qa_bank` for a fuzzy match (rapidfuzz `fuzz.ratio` ≥ 80) — returns stored answer immediately
2. On miss, calls Claude `claude-sonnet-4-6` with profile context, asking for a 1–3 sentence answer
3. On `APIError` or any exception, returns a safe fallback string

### `FormFiller` — `src/engine/form_filler.py`

Extracts fields via `page.evaluate()`, sends them to Claude for semantic field→profile mapping, fills each with per-field error isolation. Returns `{filled, skipped, errors}`.

### `LinkedInDiscovery` — `src/discovery/linkedin.py`

Opens a persistent Playwright browser context, scrapes up to 20 job cards, filters exclude keywords and already-seen URLs, returns `Application` objects. Detects login walls and returns `[]` gracefully.

---

## Tests

30 tests across 2 suites:

| Suite | Tests | Coverage |
|---|---|---|
| `tests/test_tracker.py` | 15 | upsert, already_seen, mark_applied/failed/skipped, stats, get_all |
| `tests/test_qa.py` | 15 | Fuzzy match, Claude fallback, APIError handling, prompt content |

---

## Notes

- **Login required** — LinkedIn requires a logged-in session. On first run, Playwright will open a visible browser; log in manually. The session is saved to `browser_profiles/linkedin/` and reused on subsequent runs.
- **CAPTCHA** — if a CAPTCHA appears, the run pauses and waits for manual solving.
- **Rate limiting** — a randomized 30–60 second delay between applications is applied automatically.
- **Claude API key** — set `ANTHROPIC_API_KEY` environment variable before running.
