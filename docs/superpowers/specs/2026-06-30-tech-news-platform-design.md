# Tech News Platform — Design Spec

**Date:** 2026-06-30  
**Status:** Approved

---

## Overview

A centralized tech news platform built as a standalone Vite + React + TypeScript app at `/workshop/tech-news-platform`. Users can browse the latest tech news and filter by category or news source/domain. Articles are fetched live from NewsAPI.org and displayed in a responsive card grid.

---

## Architecture

Single-page app. No routing library. One page (`App.tsx`) composes all major components. Data flows one way:

```
URL params → useFilterParams → useNews → NewsGrid → NewsCard
```

Filter state is stored in URL query params (`?category=technology&source=techcrunch`) so filters are bookmarkable and shareable. State is managed with `useState` and custom hooks — no global state library.

### Project structure

```
/workshop/tech-news-platform
├── src/
│   ├── components/
│   │   ├── FilterBar.tsx
│   │   ├── FilterBar.test.tsx
│   │   ├── NewsGrid.tsx
│   │   ├── NewsGrid.test.tsx
│   │   ├── NewsCard.tsx
│   │   └── NewsCard.test.tsx
│   ├── hooks/
│   │   ├── useNews.ts
│   │   ├── useNews.test.ts
│   │   ├── useFilterParams.ts
│   │   └── useFilterParams.test.ts
│   ├── types/
│   │   └── news.ts
│   ├── utils/
│   │   └── formatDate.ts
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   └── index.css
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Components

### `FilterBar`

Two controlled dropdowns rendered side by side.

- **Category dropdown:** Fixed options — All, Technology, Science, Business, Health, Entertainment, Sports, General
- **Source dropdown:** Populated from a one-time fetch to `https://newsapi.org/v2/top-headlines/sources?language=en` on mount; curated to tech-focused sources
- Selecting either filter updates URL params and triggers a fresh fetch
- The two filters are **mutually exclusive** — selecting a category clears the source and vice versa (NewsAPI API constraint)

### `NewsCard`

Displays per article:
- Cover image (top), falls back to a grey placeholder with a newspaper icon if missing
- Title
- Source name + published date (formatted: "Jun 30, 2026")
- "Read more" link — opens original article URL in a new tab (`target="_blank" rel="noopener noreferrer"`)
- Fixed card height; image on top, content below

### `NewsGrid`

- Responsive CSS grid: 1 column (mobile) → 2 columns (tablet) → 3–4 columns (desktop)
- **Loading state:** 3×4 skeleton placeholder cards
- **Error state:** Error banner above grid with retry button
- **Empty state:** "No articles found" message
- Renders up to 20 `NewsCard` components from the `useNews` result

---

## Hooks

### `useFilterParams`

Manages filter state in the URL.

- Reads `?category=` and `?source=` from `window.location.search` on mount
- Exposes: `category: string`, `source: string`, `setFilter(key, value): void`
- `setFilter` calls `history.pushState` to update URL without page reload
- Listens to `popstate` to sync state on browser back/forward navigation

### `useNews`

Fetches articles from NewsAPI based on active filters.

- Accepts `{ category, source }`
- Fetches `https://newsapi.org/v2/top-headlines` with appropriate params
- Re-fetches on filter change via `useEffect` dependency array
- Returns `{ articles, loading, error }`
- API key read from `import.meta.env.VITE_NEWSAPI_KEY` — never hardcoded
- Default load (no filters active): fetches `category=technology`
- Page size: 20 articles fixed

**NewsAPI mutual exclusion:** When `source` is set, the `category` param is omitted. When `category` is set, `source` is omitted.

---

## Error Handling

- **Network/API error:** Dismissible error banner above the grid — "Failed to load news. Try again." with a retry button that re-triggers the fetch
- **Missing image:** Falls back to grey placeholder with newspaper icon
- **Missing API key:** During development, shows a clear setup message ("Add your NewsAPI key to .env") instead of a cryptic fetch error
- All async operations in `useNews` wrapped in `try/catch` per project code style requirements

---

## Testing

| Unit | What's tested |
|------|---------------|
| `useNews` | Loading state, success state, error state, re-fetch on filter change (fetch mocked) |
| `useFilterParams` | Reads URL params on mount, writes params on `setFilter`, syncs on `popstate` |
| `FilterBar` | Renders correct category options, calls `setFilter` on selection change |
| `NewsCard` | Renders article data correctly, image fallback, "Read more" href + target |
| `NewsGrid` | Skeleton on loading, error state render, correct card count on success |

---

## Environment Setup

`.env.example`:
```
VITE_NEWSAPI_KEY=your_api_key_here
```

Users must copy to `.env` and add their NewsAPI.org key (free tier: 100 req/day, developer use only).

---

## Constraints & Assumptions

- NewsAPI free tier: 100 requests/day, no production deployment allowed
- Category and source filters are mutually exclusive (NewsAPI limitation)
- No pagination — fixed 20 articles per request
- No search/keyword input in this version
- English-language articles only (`language=en`)
