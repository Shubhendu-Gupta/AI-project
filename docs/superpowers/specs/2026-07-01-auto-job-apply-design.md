# Auto Job Apply Bot — Design Spec

**Date:** 2026-07-01
**Type:** Personal automation tool (Python CLI)

---

## Overview

A personal, fully automated job application bot. It discovers job listings across multiple platforms, fills application forms using Playwright + LLM-guided navigation, and submits them hands-off. CAPTCHA challenges pause the run and prompt the user to solve manually before continuing. All applications are tracked in a local SQLite database.

---

## Tech Stack

- **Language:** Python
- **Browser automation:** Playwright (persistent browser profile for staying logged in)
- **LLM:** Claude API — for form field identification, profile-to-field mapping, custom question answering, resume tailoring
- **Database:** SQLite (local file)
- **Config format:** YAML
- **Resume format:** PDF (master) + LLM-tailored per-job variants

---

## Repository Structure

```
job-apply-bot/
├── config/
│   ├── profile.yaml        # structured profile (personal info, skills, experience)
│   ├── search.yaml         # job search criteria (titles, locations, salary, etc.)
│   └── qa_bank.yaml        # pre-written answers to common application questions
├── resume/
│   └── master_resume.pdf   # master resume uploaded to applications
├── data/
│   └── applications.db     # SQLite tracker database
├── screenshots/            # per-application screenshots before submit
├── src/
│   ├── discovery/          # per-site job scrapers
│   │   ├── base.py         # abstract adapter interface
│   │   ├── linkedin.py
│   │   ├── indeed.py
│   │   ├── glassdoor.py
│   │   ├── naukri.py
│   │   └── career_page.py  # LLM-guided arbitrary company career pages
│   ├── engine/             # Playwright + LLM form filler
│   │   ├── browser.py      # Playwright session management
│   │   ├── navigator.py    # LLM-guided field detection and filling
│   │   └── captcha.py      # CAPTCHA detection and pause/resume logic
│   ├── profile/
│   │   ├── loader.py       # loads profile.yaml and master resume
│   │   └── tailor.py       # LLM-based resume tailoring per job
│   ├── qa/
│   │   └── answerer.py     # fuzzy match qa_bank, fall back to LLM generation
│   ├── tracker/
│   │   └── db.py           # SQLite read/write, deduplication
│   └── notifications/
│       └── alerts.py       # terminal bell, CAPTCHA pause prompt
├── main.py                 # CLI entrypoint
└── requirements.txt
```

---

## Data Flow

```
search.yaml
    ↓
Discovery (per-site adapters)
    ↓
JobListing list → dedup against tracker DB
    ↓
Application Engine (Playwright + LLM)
    ├── LLM identifies form fields from page DOM/screenshot
    ├── Maps profile.yaml fields → form fields
    ├── Checks qa_bank.yaml for custom questions (fuzzy match)
    │       └── Falls back to LLM-generated answer if not found
    ├── Optionally tailors resume to job description
    ├── CAPTCHA detected? → pause, notify user, await keypress, resume
    └── Submit → screenshot → log to tracker DB
```

---

## Discovery Module

Each job board is an adapter implementing:
```python
class BaseDiscovery:
    def search(self, criteria: SearchCriteria) -> list[JobListing]
```

**Supported sources:**
| Source | Auth required | Method |
|---|---|---|
| LinkedIn | Yes (login) | Playwright scrape |
| Indeed | No | Playwright scrape |
| Glassdoor | Yes (login) | Playwright scrape |
| Naukri.com | Yes (login) | Playwright scrape |
| Company career pages | No | LLM-guided navigation |

**JobListing schema:**
```yaml
id: sha256(company + title + url)[:12]
title: str
company: str
location: str
url: str
source: str          # "linkedin" | "indeed" | "glassdoor" | "naukri" | "career_page"
description: str
date_found: date
```

**Deduplication:** Jobs already in the tracker DB with status `applied`, `skipped`, or `failed` are excluded. Cross-source duplicates matched on `(company + title)` hash.

**search.yaml fields:**
- `job_titles`: list of role keywords
- `locations`: list of cities or "Remote"
- `remote_only`: bool
- `salary_min`: optional integer
- `experience_level`: "entry" | "mid" | "senior"
- `exclude_keywords`: list of strings to exclude from titles/descriptions

---

## Application Engine

### Browser Session
- Playwright runs in headed mode (visible browser) to allow CAPTCHA solving
- Persistent browser profile directory per site to maintain login sessions
- Randomized delay between applications: 30–60 seconds

### LLM-Guided Navigation
For each job page:
1. Dump page DOM + screenshot to LLM
2. LLM returns structured field map: `[{field_id, label, type, required}]`
3. Engine maps each field to `profile.yaml` using LLM (e.g., "First Name" → `profile.first_name`)
4. Fields filled via Playwright `fill()` / `select_option()` / `set_input_files()`
5. Multi-step forms: LLM identifies "Next" buttons and the engine paginates through

### Resume Handling
- Default: upload `master_resume.pdf` as-is
- Optional tailoring (enabled per-run via CLI flag `--tailor`): LLM rewrites resume summary and reorders bullet points to match job description keywords; saved as temp PDF before upload

### Custom Question Handling
1. Extract question text from form
2. Fuzzy match against `qa_bank.yaml` (threshold: 0.8 similarity)
3. If match found: use pre-written answer (optionally personalized by LLM for the specific company)
4. If no match: LLM generates answer using job description + full profile as context
5. New LLM-generated answers are optionally saved back to `qa_bank.yaml` for reuse

### CAPTCHA Handling
- Detect common CAPTCHA patterns (hCaptcha, reCAPTCHA, Cloudflare challenge)
- Pause run, bring browser window to foreground
- Print: `"CAPTCHA detected at <Company> — solve it in the browser window, then press Enter to continue"`
- On Enter: resume from the exact step that was paused

### Error Handling
- Unexpected page state / unresolvable required field → log as `failed` with screenshot, skip to next job
- Login session expired → log warning, skip all jobs for that source in current run
- Network timeout → retry once, then mark `failed`

---

## Tracker Database

**File:** `data/applications.db`

**`jobs` table:**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | hash of company+title+url |
| title | TEXT | |
| company | TEXT | |
| url | TEXT | |
| source | TEXT | |
| status | TEXT | `queued \| applied \| skipped \| failed \| interview \| rejected` |
| date_found | DATE | |
| date_applied | DATE | nullable |
| screenshot_path | TEXT | nullable |
| resume_used | TEXT | filename of resume PDF used |
| notes | TEXT | error messages, LLM notes |

---

## CLI Interface

```bash
# Discover new jobs and add to queue
python main.py discover

# Apply to all queued jobs
python main.py apply

# Apply with resume tailoring
python main.py apply --tailor

# Show stats
python main.py status

# View all jobs in terminal table
python main.py view

# Filter view by status
python main.py view --status queued

# Skip a specific job
python main.py skip <job_id>

# Mark a job outcome manually
python main.py update <job_id> --status interview
```

---

## Notifications

- **CAPTCHA pause:** Terminal bell (`\a`) + message + browser brought to foreground
- **Run summary** (printed at end of each `apply` run):
  ```
  Run complete: 12 applied, 2 failed, 1 captcha-paused (resumed), 3 skipped
  ```
- **Optional daily cron summary:** `python main.py status --today` prints a table of the day's applications

---

## Configuration Files

### profile.yaml (excerpt)
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
```

### qa_bank.yaml (excerpt)
```yaml
- question: "Why do you want to work here?"
  answer: "I'm drawn to companies that..."
- question: "What is your expected salary?"
  answer: "I'm looking for a range of $X–$Y depending on the full package."
- question: "Are you authorized to work in the US?"
  answer: "Yes"
```

### search.yaml (excerpt)
```yaml
job_titles: ["Backend Engineer", "Python Engineer", "Software Engineer"]
locations: ["San Francisco, CA", "Remote"]
remote_only: false
salary_min: 120000
experience_level: mid
exclude_keywords: ["10+ years", "Staff", "Principal"]
```

---

## Out of Scope

- Web UI / dashboard (CLI only)
- Multi-user support
- Paid CAPTCHA solving services
- Automatic interview scheduling
- Cover letter generation (can be added later as a qa_bank entry)
