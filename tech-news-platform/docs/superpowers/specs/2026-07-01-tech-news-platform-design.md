# Tech News Platform — Design Spec
**Date:** 2026-07-01

## Overview

A magazine-style tech news aggregator that pulls articles from **HackerNews** (Firebase API) and **Dev.to** (public API). No API keys required. Works from localhost and CloudFront. Articles are displayed in a rich card grid with a hero story, sidebar, category filters, bookmarking, and sharing.

---

## Data Sources

### HackerNews Firebase API
- Endpoint: `https://hacker-news.firebaseio.com/v0/`
- Fetch top story IDs: `GET /topstories.json` → array of IDs (up to 500)
- Fetch individual story: `GET /item/{id}.json`
- Fields available: `id`, `title`, `url`, `score`, `by` (author), `time` (unix), `descendants` (comment count), `type`
- No images or descriptions — use gradient placeholder image generated from title hash
- No API key, no CORS issues

### Dev.to API
- Endpoint: `https://dev.to/api/articles`
- Fetch articles: `GET /articles?tag={tag}&per_page=20&page={page}`
- Fields available: `id`, `title`, `description`, `cover_image`, `url`, `published_at`, `user.name`, `user.profile_image`, `tag_list`, `reading_time_minutes`, `public_reactions_count`
- No API key required, no CORS issues

---

## Normalized Article Type

Both sources are normalized into a single `Article` type:

```ts
// types/news.ts
type ArticleSource = 'hackernews' | 'devto'

interface Article {
  id: string                    // HN: item id as string; Dev.to: article id as string
  source: ArticleSource
  title: string
  description: string | null    // HN: null; Dev.to: description field
  url: string
  imageUrl: string | null       // HN: null (gradient fallback); Dev.to: cover_image
  author: string | null         // HN: by; Dev.to: user.name
  authorImage: string | null    // HN: null; Dev.to: user.profile_image
  publishedAt: string           // ISO string
  tags: string[]                // HN: []; Dev.to: tag_list
  score: number                 // HN: score; Dev.to: public_reactions_count
  commentCount: number | null   // HN: descendants; Dev.to: null
}

type Category = 'all' | 'hackernews' | 'devto' | 'ai' | 'security' | 'webdev' | 'career'
```

---

## Architecture

```
App.tsx
├── useNewsApi(category, page)     → { articles, loading, error, totalResults }
├── useBookmarks()                 → { bookmarks, toggle, isBookmarked }
│
├── Header                         logo + search input
├── FilterBar                      category tab buttons
├── HeroCard                       first article, large format
├── MainGrid
│   ├── NewsCard (×9 per page)
│   └── Pagination
└── Sidebar
    ├── TrendingList               top 5 HN stories by score
    └── BookmarksList              saved articles from localStorage
```

---

## Component Specs

### `Header`
- Logo: "Tech News" wordmark left-aligned
- Search input right-aligned — filters displayed articles client-side by title/description match
- Dark background (`#0f172a`)

### `FilterBar`
- Tab buttons: **All | HackerNews | Dev.to | AI | Security | Web Dev | Career**
- Active tab highlighted with accent color
- Selecting a source tab (HN/Dev.to) filters by `source`
- Selecting a topic tab (AI/Security/Web Dev/Career) filters Dev.to by tag; shows HN stories for that topic via keyword match on title

### `HeroCard`
- Full-width card at top of main content area
- Large image (or gradient placeholder) left side, text right side
- Shows: category tag, title, description, source name, author, time ago, share button, bookmark button

### `NewsCard`
- Thumbnail image (or gradient placeholder — unique color per article based on title hash)
- Category/source badge
- Title (2-line clamp)
- Description (3-line clamp, null for HN shows score + comment count instead)
- Source name + author + time ago
- Share button (Web Share API, fallback: copy URL to clipboard)
- Bookmark button (filled when bookmarked, outline when not)

### `Sidebar`
- **Trending:** Top 5 HN stories by score — title, score, time ago. Always fetched independently of current filter.
- **Bookmarks:** List of bookmarked articles — title, source, remove button. Empty state: "No bookmarks yet."

### `Pagination`
- Previous / Next buttons + current page indicator
- HN: page through top 500 story IDs in chunks of 10 (fetching 10 items per page)
- Dev.to: use `page` query param

---

## Hook Specs

### `useNewsApi(category: Category, page: number)`
- On mount and when `category` or `page` changes, fetches articles
- HN fetch: get top story IDs → slice 10 for page → parallel fetch each item → normalize
- Dev.to fetch: map category to tag → `GET /articles?tag={tag}&per_page=9&page={page}` → normalize
- "all" category: fetch 5 HN stories + first 4 Dev.to articles → merge, shuffle
- Cache results in `useRef<Map<string, Article[]>>` keyed by `${category}-${page}`
- `AbortController` cancels in-flight fetch on category/page change
- Returns `{ articles: Article[], loading: boolean, error: string | null, totalResults: number }`

### `useBookmarks()`
- Initializes from `localStorage.getItem('tech-news-bookmarks')` → `JSON.parse` → `Article[]`
- `toggle(article)`: if bookmarked remove, else prepend
- `isBookmarked(id)`: checks by `article.id`
- Writes to localStorage on every change via `useEffect`
- Returns `{ bookmarks: Article[], toggle, isBookmarked }`

---

## Utility Functions

### `utils/gradientPlaceholder.ts`
- `getGradient(title: string): string` — deterministic CSS gradient string from title hash
- Used as `background` style on image containers when `imageUrl` is null

### `utils/timeAgo.ts`
- `timeAgo(isoString: string): string` — returns "3h ago", "2d ago", etc.

### `utils/share.ts`
- `shareArticle(article: Article): Promise<void>` — tries `navigator.share`, falls back to `navigator.clipboard.writeText(article.url)`

---

## Loading, Error & Empty States

- **Loading:** Skeleton cards (CSS `@keyframes` shimmer animation) rendered in place of real cards
- **Error:** Inline error banner with retry button — `onClick` re-triggers fetch
- **Empty:** "No articles found for this category" with suggestion to try another tab

---

## Styling

- CSS Modules or plain CSS (consistent with existing `App.css` approach — no Tailwind, no CSS-in-JS)
- Responsive grid: 3 columns ≥1024px, 2 columns ≥640px, 1 column below
- Color palette: dark header `#0f172a`, accent `#3b82f6`, card background `#ffffff`, page background `#f1f5f9`
- Sidebar is hidden on mobile (below 1024px) — full-width grid instead

---

## Testing

- Unit tests required per CLAUDE.md for all new components and utilities
- `useNewsApi`: mock `fetch`, assert normalized output for HN and Dev.to responses
- `useBookmarks`: assert localStorage read/write, toggle behavior
- `getGradient`: assert same input → same output (deterministic)
- `timeAgo`: assert correct output for known inputs
- `NewsCard`: renders title, description, bookmark toggle

---

## File Structure

```
src/
├── types/
│   └── news.ts
├── hooks/
│   ├── useNewsApi.ts
│   └── useBookmarks.ts
├── utils/
│   ├── gradientPlaceholder.ts
│   ├── timeAgo.ts
│   └── share.ts
├── components/
│   ├── Header/
│   ├── FilterBar/
│   ├── HeroCard/
│   ├── NewsCard/
│   ├── MainGrid/
│   ├── Pagination/
│   ├── Sidebar/
│   └── SkeletonCard/
├── App.tsx
├── App.css
├── index.css
└── main.tsx
```
