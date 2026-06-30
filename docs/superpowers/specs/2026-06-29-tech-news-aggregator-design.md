# Tech News Aggregator — Design Spec

**Date:** 2026-06-29  
**Project:** TechPulse — `/workshop/tech-news-aggregator/`  
**Stack:** React 19, TypeScript (strict), Vite, Vitest + React Testing Library

---

## Overview

A single-page app that aggregates tech news from multiple sources (developer-focused and mainstream) into one compact, Hacker News-style feed. Users filter by topic tag; preferences persist in localStorage. No backend, no auth.

---

## Architecture

```
Data Sources (APIs/RSS)
    ↓
Source Hooks (useHackerNews, useReddit, useDevTo, useGitHubTrending, useRSSFeed)
    ↓
Normalization Utils (each source → shared Article type)
    ↓
useNewsFeed (aggregator hook — merges, sorts, deduplicates)
    ↓
useFilters (topic tag state, persisted to localStorage)
    ↓
UI Components (FeedList, ArticleRow, FilterBar, SourceBadge)
```

### Repository Structure

```
/src
  /components
    App.tsx
    Header.tsx
    FilterBar.tsx
    FeedList.tsx
    ArticleRow.tsx
    SourceBadge.tsx
    LoadingState.tsx
    ErrorBanner.tsx
  /hooks
    useHackerNews.ts
    useReddit.ts
    useDevTo.ts
    useGitHubTrending.ts
    useRSSFeed.ts
    useNewsFeed.ts
    useFilters.ts
  /utils
    normalizeHackerNews.ts
    normalizeReddit.ts
    normalizeDevTo.ts
    normalizeGitHub.ts
    normalizeRSS.ts
    tagInference.ts
    timeAgo.ts
  /types
    index.ts
```

---

## Types

```ts
type SourceId = 'hackernews' | 'reddit' | 'devto' | 'github' | 'rss'

type Article = {
  id: string
  title: string
  url: string
  source: SourceId
  sourceName: string      // "Hacker News", "r/programming", "Dev.to", etc.
  publishedAt: Date
  tags: string[]          // ['AI', 'Web Dev', 'Security', ...]
  score?: number          // upvotes/points/stars where available
  commentUrl?: string
  commentCount?: number
}

type FeedState = {
  articles: Article[]
  loading: boolean
  errors: Record<SourceId, Error | null>
}
```

Topic tags: `AI`, `Web Dev`, `Security`, `Open Source`, `DevOps`, `Mobile`, `Cloud`, `Database`

---

## Data Sources

| Source | Method | Auth |
|---|---|---|
| Hacker News | `https://hacker-news.firebaseio.com/v0/` public REST API | None |
| Reddit r/programming + r/webdev | `https://www.reddit.com/r/{sub}.json` | None (rate-limited ~1 req/sec) |
| Dev.to | `https://dev.to/api/articles` | None for read |
| GitHub Trending | `https://github-trending-api.waffle.shop` proxy | None |
| TechCrunch, Wired, Ars Technica, The Verge | RSS via `https://api.rss2json.com/v1/api.json?rss_url=<feed_url>` | Free tier (10k req/day) |

**Fetch strategy:**
- All source hooks fire concurrently on mount via `Promise.allSettled`
- No auto-refresh; user triggers refresh manually via header button
- Last-fetched timestamp displayed in header

**Tag inference (`utils/tagInference.ts`):**  
Keyword map runs over article title + source-provided tags at normalization time. Example mappings:
- `['openai', 'llm', 'gpt', 'gemini', 'claude', 'ai', 'machine learning']` → `AI`
- `['react', 'vue', 'css', 'html', 'javascript', 'typescript', 'frontend', 'nextjs']` → `Web Dev`
- `['vulnerability', 'cve', 'exploit', 'breach', 'security', 'malware']` → `Security`
- `['open source', 'github', 'oss', 'mit license', 'apache']` → `Open Source`
- `['docker', 'kubernetes', 'ci/cd', 'devops', 'terraform', 'helm']` → `DevOps`
- `['ios', 'android', 'swift', 'kotlin', 'flutter', 'react native']` → `Mobile`
- `['aws', 'gcp', 'azure', 'serverless', 'cloud']` → `Cloud`
- `['postgres', 'mysql', 'redis', 'mongodb', 'sql', 'database']` → `Database`

---

## UI Components

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  TechPulse                          [Refresh] [↻ 2m] │
├─────────────────────────────────────────────────────┤
│  [All] [AI] [Web Dev] [Security] [Open Source] [...] │
├─────────────────────────────────────────────────────┤
│  1. Title of article here                            │
│     [HN] ▲ 342  · 87 comments · 3h ago              │
│                                                      │
│  2. Another article title                            │
│     [Dev.to] · Web Dev · 1h ago                     │
│                                                      │
│  3. cool-repo: A new tool for developers             │
│     [GitHub] ★ 1.2k · Open Source · 5h ago          │
└─────────────────────────────────────────────────────┘
```

**Components:**
- `Header` — app name, last-fetched time, refresh button
- `FilterBar` — horizontally scrollable tag pills; "All" clears active tag
- `FeedList` — renders sorted, filtered articles; shows `LoadingState` or `ErrorBanner` as needed
- `ArticleRow` — index, title (external link), `SourceBadge`, score, comment count, time ago
- `SourceBadge` — colored pill per source: HN (orange), Reddit (red), Dev.to (indigo), GitHub (gray), RSS sources (teal)
- `LoadingState` — skeleton rows (10 placeholder rows) while any source is loading
- `ErrorBanner` — inline row per failed source with retry affordance

**Sorting:** Most recent first by `publishedAt`. Score shown for context but not used for ranking.

**Deduplication:** Articles with identical URLs are collapsed to one entry (first occurrence wins).

---

## State & Persistence

**`useFilters` hook:**
- `activeTag: string | null` — null means show all
- Persisted to `localStorage` key `techpulse_filters`
- Selecting an active tag deselects it (toggle behavior)

**`useNewsFeed` hook:**
- Calls all source hooks, merges results, deduplicates by URL, sorts by `publishedAt` desc
- Exposes `{ articles, loading, errors, refresh }`
- `loading` is true while any source is still fetching

---

## Error Handling

- Each source hook catches all fetch/parse errors; returns `error` field, never throws
- `Promise.allSettled` ensures partial failures don't block the feed
- Malformed articles (missing `title` or `url`) filtered out at normalization
- Failed source shows `ErrorBanner` with source name and "retry" link
- RSS2JSON free tier limit (10k/day) noted in README; no in-app handling needed

---

## Testing

| Unit | Coverage |
|---|---|
| `utils/tagInference.ts` | Keyword → tag for known and edge-case titles |
| `utils/normalize*.ts` | Raw API response → valid `Article` for each source |
| `useFilters` | Tag selection, toggle off, localStorage read/write, "All" behavior |
| `useNewsFeed` | Merge, dedup by URL, sort order, error aggregation |
| `ArticleRow` | Title renders as link, score/comment count display, time ago |
| `FilterBar` | Active tag highlighted, click selects/deselects, "All" shown |

Source hooks tested with mocked `fetch` — no real network calls in tests.

---

## Out of Scope (v1)

- User accounts or cross-device sync
- Saved/bookmarked articles
- Auto-refresh / live updates
- Dark mode toggle (can add later)
- Search
- Pagination (load top ~30 per source, ~150–200 articles total)
