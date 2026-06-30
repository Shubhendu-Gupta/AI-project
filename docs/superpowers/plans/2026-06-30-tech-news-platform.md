# Tech News Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Vite + React + TypeScript tech news platform at `/workshop/tech-news-platform` with category and source filters backed by NewsAPI.org.

**Architecture:** Single-page app with no routing library. Filter state lives in URL query params (`?category=` / `?source=`), read/written by `useFilterParams`. `useNews` fetches from NewsAPI and re-fetches when filters change. `App.tsx` composes `FilterBar` + `NewsGrid`, and `NewsGrid` renders `NewsCard` items.

**Tech Stack:** Vite 5, React 19, TypeScript 5 (strict), Vitest, @testing-library/react, CSS modules (plain CSS)

## Global Constraints

- TypeScript strict mode enabled in `tsconfig.json`
- All async functions must have `try/catch` error handling
- API key always read from `import.meta.env.VITE_NEWSAPI_KEY` — never hardcoded
- Category and source filters are mutually exclusive (NewsAPI limitation) — setting one clears the other
- Default filter when none set: `category=technology`
- Page size fixed at 20 articles
- English-language articles only (`language=en`)
- No pagination, no search input, no routing library

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/types/news.ts` | TypeScript types: `Article`, `Source`, `FilterState`, `NewsApiResponse`, `SourcesApiResponse` |
| `src/utils/formatDate.ts` | Pure function: format ISO date string → "Jun 30, 2026" |
| `src/hooks/useFilterParams.ts` | Read/write filter state to URL query params; sync on popstate |
| `src/hooks/useNews.ts` | Fetch top-headlines from NewsAPI; manage articles/loading/error state |
| `src/components/NewsCard.tsx` | Single article card: image, title, source, date, read-more link |
| `src/components/NewsGrid.tsx` | Responsive grid: renders NewsCard list, loading skeleton, error state, empty state |
| `src/components/FilterBar.tsx` | Category + source dropdowns; fetches sources list on mount |
| `src/App.tsx` | Root component: composes FilterBar + NewsGrid; wires useFilterParams → useNews |
| `src/index.css` | Global reset and base styles |
| `src/App.css` | App-level layout styles |
| `index.html` | HTML entry point |
| `vite.config.ts` | Vite config with React plugin and test config |
| `.env.example` | Documents required env var |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.css`
- Create: `src/index.css`
- Create: `.env.example`
- Create: `src/setupTests.ts`

**Interfaces:**
- Produces: working `npm run dev`, `npm run test`, `npm run typecheck` commands

- [ ] **Step 1: Create the project directory and package.json**

```bash
mkdir -p /workshop/tech-news-platform
cd /workshop/tech-news-platform
```

Create `/workshop/tech-news-platform/package.json`:

```json
{
  "name": "tech-news-platform",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "~5.6.2",
    "vite": "^5.4.10",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run from `/workshop/tech-news-platform`:
```bash
npm install
```
Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: ['.cloudfront.net'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
})
```

- [ ] **Step 5: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tech News</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create src/setupTests.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Create src/main.tsx**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 8: Create src/index.css**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
  background: #f5f5f5;
  color: #1a1a1a;
  line-height: 1.5;
}

a {
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 9: Create src/App.tsx and src/App.css (stub)**

`src/App.tsx`:
```typescript
import './App.css'

const App = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Tech News</h1>
      </header>
      <main className="app-main">
        <p>Coming soon</p>
      </main>
    </div>
  )
}

export default App
```

`src/App.css`:
```css
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #0f172a;
  color: #fff;
  padding: 1rem 2rem;
}

.app-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
```

- [ ] **Step 10: Create .env.example**

```
VITE_NEWSAPI_KEY=your_api_key_here
```

- [ ] **Step 11: Verify dev server starts**

```bash
npm run dev
```
Expected: `Local: http://localhost:3000/` with no errors.

- [ ] **Step 12: Verify typecheck passes**

```bash
npm run typecheck
```
Expected: no output (exit 0).

- [ ] **Step 13: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold tech-news-platform project"
```

---

## Task 2: Types and formatDate Utility

**Files:**
- Create: `src/types/news.ts`
- Create: `src/utils/formatDate.ts`
- Create: `src/utils/formatDate.test.ts`

**Interfaces:**
- Produces:
  - `Article { source: { id: string | null; name: string }; author: string | null; title: string; description: string | null; url: string; urlToImage: string | null; publishedAt: string; content: string | null }`
  - `Source { id: string; name: string; description: string; url: string; category: string; language: string; country: string }`
  - `FilterState { category: string; source: string }`
  - `NewsApiResponse { status: string; totalResults: number; articles: Article[] }`
  - `SourcesApiResponse { status: string; sources: Source[] }`
  - `formatDate(isoString: string): string` → e.g. `"Jun 30, 2026"`

- [ ] **Step 1: Write the failing test**

Create `src/utils/formatDate.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { formatDate } from './formatDate'

describe('formatDate', () => {
  it('formats an ISO date string to "Mon DD, YYYY"', () => {
    expect(formatDate('2026-06-30T12:00:00Z')).toBe('Jun 30, 2026')
  })

  it('formats January correctly', () => {
    expect(formatDate('2026-01-05T00:00:00Z')).toBe('Jan 5, 2026')
  })

  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- formatDate
```
Expected: FAIL — "Cannot find module './formatDate'"

- [ ] **Step 3: Create src/types/news.ts**

```typescript
export interface ArticleSource {
  id: string | null
  name: string
}

export interface Article {
  source: ArticleSource
  author: string | null
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

export interface Source {
  id: string
  name: string
  description: string
  url: string
  category: string
  language: string
  country: string
}

export interface FilterState {
  category: string
  source: string
}

export interface NewsApiResponse {
  status: string
  totalResults: number
  articles: Article[]
}

export interface SourcesApiResponse {
  status: string
  sources: Source[]
}
```

- [ ] **Step 4: Create src/utils/formatDate.ts**

```typescript
export const formatDate = (isoString: string): string => {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test -- formatDate
```
Expected: PASS — 3 tests passing.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/news.ts src/utils/formatDate.ts src/utils/formatDate.test.ts
git commit -m "feat: add types and formatDate utility"
```

---

## Task 3: useFilterParams Hook

**Files:**
- Create: `src/hooks/useFilterParams.ts`
- Create: `src/hooks/useFilterParams.test.ts`

**Interfaces:**
- Consumes: `FilterState` from `src/types/news.ts`
- Produces: `useFilterParams(): { category: string; source: string; setFilter: (key: keyof FilterState, value: string) => void }`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useFilterParams.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFilterParams } from './useFilterParams'

describe('useFilterParams', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('returns empty strings when no query params are set', () => {
    const { result } = renderHook(() => useFilterParams())
    expect(result.current.category).toBe('')
    expect(result.current.source).toBe('')
  })

  it('reads category from URL on mount', () => {
    window.history.pushState({}, '', '/?category=technology')
    const { result } = renderHook(() => useFilterParams())
    expect(result.current.category).toBe('technology')
  })

  it('reads source from URL on mount', () => {
    window.history.pushState({}, '', '/?source=techcrunch')
    const { result } = renderHook(() => useFilterParams())
    expect(result.current.source).toBe('techcrunch')
  })

  it('setFilter updates URL and state for category', () => {
    const { result } = renderHook(() => useFilterParams())
    act(() => {
      result.current.setFilter('category', 'science')
    })
    expect(result.current.category).toBe('science')
    expect(window.location.search).toContain('category=science')
  })

  it('setFilter clears other filter when setting category', () => {
    window.history.pushState({}, '', '/?source=techcrunch')
    const { result } = renderHook(() => useFilterParams())
    act(() => {
      result.current.setFilter('category', 'science')
    })
    expect(result.current.source).toBe('')
    expect(window.location.search).not.toContain('source=')
  })

  it('setFilter clears other filter when setting source', () => {
    window.history.pushState({}, '', '/?category=technology')
    const { result } = renderHook(() => useFilterParams())
    act(() => {
      result.current.setFilter('source', 'the-verge')
    })
    expect(result.current.category).toBe('')
    expect(window.location.search).not.toContain('category=')
  })

  it('syncs state on popstate event', () => {
    const { result } = renderHook(() => useFilterParams())
    act(() => {
      window.history.pushState({}, '', '/?category=business')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.category).toBe('business')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- useFilterParams
```
Expected: FAIL — "Cannot find module './useFilterParams'"

- [ ] **Step 3: Create src/hooks/useFilterParams.ts**

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { FilterState } from '../types/news'

const readParams = (): FilterState => {
  const params = new URLSearchParams(window.location.search)
  return {
    category: params.get('category') ?? '',
    source: params.get('source') ?? '',
  }
}

export const useFilterParams = () => {
  const [filters, setFilters] = useState<FilterState>(readParams)

  useEffect(() => {
    const onPopState = () => setFilters(readParams())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setFilter = useCallback((key: keyof FilterState, value: string) => {
    const params = new URLSearchParams()
    params.set(key, value)
    window.history.pushState({}, '', `?${params.toString()}`)
    setFilters({ category: '', source: '', [key]: value })
  }, [])

  return { ...filters, setFilter }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- useFilterParams
```
Expected: PASS — 7 tests passing.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useFilterParams.ts src/hooks/useFilterParams.test.ts
git commit -m "feat: add useFilterParams hook with URL state"
```

---

## Task 4: useNews Hook

**Files:**
- Create: `src/hooks/useNews.ts`
- Create: `src/hooks/useNews.test.ts`

**Interfaces:**
- Consumes: `FilterState`, `Article`, `NewsApiResponse` from `src/types/news.ts`
- Produces: `useNews(filters: FilterState): { articles: Article[]; loading: boolean; error: string | null; retry: () => void }`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useNews.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNews } from './useNews'
import type { NewsApiResponse } from '../types/news'

const mockArticle = {
  source: { id: 'techcrunch', name: 'TechCrunch' },
  author: 'John Doe',
  title: 'Test Article',
  description: 'A test article',
  url: 'https://techcrunch.com/test',
  urlToImage: 'https://example.com/image.jpg',
  publishedAt: '2026-06-30T12:00:00Z',
  content: 'Content here',
}

const mockResponse: NewsApiResponse = {
  status: 'ok',
  totalResults: 1,
  articles: [mockArticle],
}

describe('useNews', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('starts in loading state', () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() =>
      useNews({ category: 'technology', source: '' })
    )
    expect(result.current.loading).toBe(true)
    expect(result.current.articles).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns articles on successful fetch', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() =>
      useNews({ category: 'technology', source: '' })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.articles).toHaveLength(1)
    expect(result.current.articles[0].title).toBe('Test Article')
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() =>
      useNews({ category: 'technology', source: '' })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Failed to load news. Try again.')
    expect(result.current.articles).toEqual([])
  })

  it('sets error on non-ok HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ status: 'error', message: 'apiKeyInvalid' }),
    } as Response)

    const { result } = renderHook(() =>
      useNews({ category: 'technology', source: '' })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Failed to load news. Try again.')
  })

  it('uses source param when source is set (no category)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    renderHook(() => useNews({ category: '', source: 'techcrunch' }))
    await waitFor(() => expect(fetch).toHaveBeenCalled())

    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('sources=techcrunch')
    expect(url).not.toContain('category=')
  })

  it('uses category param when category is set (no source)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    renderHook(() => useNews({ category: 'science', source: '' }))
    await waitFor(() => expect(fetch).toHaveBeenCalled())

    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('category=science')
    expect(url).not.toContain('sources=')
  })

  it('defaults to category=technology when both filters are empty', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    renderHook(() => useNews({ category: '', source: '' }))
    await waitFor(() => expect(fetch).toHaveBeenCalled())

    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('category=technology')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- useNews
```
Expected: FAIL — "Cannot find module './useNews'"

- [ ] **Step 3: Create src/hooks/useNews.ts**

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { Article, FilterState } from '../types/news'

const API_BASE = 'https://newsapi.org/v2/top-headlines'

const buildUrl = (filters: FilterState): string => {
  const apiKey = import.meta.env.VITE_NEWSAPI_KEY as string | undefined
  if (!apiKey) throw new Error('MISSING_API_KEY')

  const params = new URLSearchParams({
    language: 'en',
    pageSize: '20',
    apiKey,
  })

  if (filters.source) {
    params.set('sources', filters.source)
  } else {
    params.set('category', filters.category || 'technology')
  }

  return `${API_BASE}?${params.toString()}`
}

export const useNews = (filters: FilterState) => {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchNews = async () => {
      setLoading(true)
      setError(null)

      try {
        const url = buildUrl(filters)
        const res = await fetch(url)
        if (!res.ok) throw new Error('HTTP_ERROR')
        const data = await res.json() as { status: string; articles: Article[] }
        if (!cancelled) setArticles(data.articles)
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error && err.message === 'MISSING_API_KEY'
            ? 'Add your NewsAPI key to .env (VITE_NEWSAPI_KEY)'
            : 'Failed to load news. Try again.'
          setError(message)
          setArticles([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchNews()
    return () => { cancelled = true }
  }, [filters.category, filters.source, retryCount])

  const retry = useCallback(() => setRetryCount(c => c + 1), [])

  return { articles, loading, error, retry }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- useNews
```
Expected: PASS — 7 tests passing.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useNews.ts src/hooks/useNews.test.ts
git commit -m "feat: add useNews hook with NewsAPI integration"
```

---

## Task 5: NewsCard Component

**Files:**
- Create: `src/components/NewsCard.tsx`
- Create: `src/components/NewsCard.css`
- Create: `src/components/NewsCard.test.tsx`

**Interfaces:**
- Consumes: `Article`, `formatDate` from tasks 2
- Produces: `NewsCard({ article: Article }): JSX.Element`

- [ ] **Step 1: Write the failing tests**

Create `src/components/NewsCard.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewsCard } from './NewsCard'
import type { Article } from '../types/news'

const mockArticle: Article = {
  source: { id: 'techcrunch', name: 'TechCrunch' },
  author: 'Jane Smith',
  title: 'Big Tech Announcement',
  description: 'Something happened in tech',
  url: 'https://techcrunch.com/big-announcement',
  urlToImage: 'https://example.com/image.jpg',
  publishedAt: '2026-06-30T10:00:00Z',
  content: 'Full content here',
}

describe('NewsCard', () => {
  it('renders the article title', () => {
    render(<NewsCard article={mockArticle} />)
    expect(screen.getByText('Big Tech Announcement')).toBeInTheDocument()
  })

  it('renders the source name', () => {
    render(<NewsCard article={mockArticle} />)
    expect(screen.getByText('TechCrunch')).toBeInTheDocument()
  })

  it('renders the formatted date', () => {
    render(<NewsCard article={mockArticle} />)
    expect(screen.getByText('Jun 30, 2026')).toBeInTheDocument()
  })

  it('renders read more link with correct href opening in new tab', () => {
    render(<NewsCard article={mockArticle} />)
    const link = screen.getByRole('link', { name: /read more/i })
    expect(link).toHaveAttribute('href', 'https://techcrunch.com/big-announcement')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders article image when urlToImage is present', () => {
    render(<NewsCard article={mockArticle} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg')
    expect(img).toHaveAttribute('alt', 'Big Tech Announcement')
  })

  it('renders placeholder when urlToImage is null', () => {
    const articleNoImage = { ...mockArticle, urlToImage: null }
    render(<NewsCard article={articleNoImage} />)
    const placeholder = document.querySelector('.news-card__image-placeholder')
    expect(placeholder).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- NewsCard
```
Expected: FAIL — "Cannot find module './NewsCard'"

- [ ] **Step 3: Create src/components/NewsCard.tsx**

```typescript
import { useState } from 'react'
import type { Article } from '../types/news'
import { formatDate } from '../utils/formatDate'
import './NewsCard.css'

interface NewsCardProps {
  article: Article
}

export const NewsCard = ({ article }: NewsCardProps) => {
  const [imgError, setImgError] = useState(false)

  return (
    <article className="news-card">
      <div className="news-card__image-wrapper">
        {article.urlToImage && !imgError ? (
          <img
            src={article.urlToImage}
            alt={article.title}
            className="news-card__image"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="news-card__image-placeholder" aria-hidden="true">
            <span className="news-card__placeholder-icon">📰</span>
          </div>
        )}
      </div>
      <div className="news-card__content">
        <h2 className="news-card__title">{article.title}</h2>
        <div className="news-card__meta">
          <span className="news-card__source">{article.source.name}</span>
          <span className="news-card__date">{formatDate(article.publishedAt)}</span>
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="news-card__link"
        >
          Read more
        </a>
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Create src/components/NewsCard.css**

```css
.news-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: box-shadow 0.2s;
}

.news-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.news-card__image-wrapper {
  width: 100%;
  height: 180px;
  overflow: hidden;
  flex-shrink: 0;
}

.news-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.news-card__image-placeholder {
  width: 100%;
  height: 100%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.news-card__placeholder-icon {
  font-size: 2.5rem;
  opacity: 0.4;
}

.news-card__content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.5rem;
}

.news-card__title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
  color: #1a1a1a;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: auto;
}

.news-card__source {
  font-weight: 600;
}

.news-card__link {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #2563eb;
  text-decoration: underline;
}

.news-card__link:hover {
  color: #1d4ed8;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- NewsCard
```
Expected: PASS — 6 tests passing.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/NewsCard.tsx src/components/NewsCard.css src/components/NewsCard.test.tsx
git commit -m "feat: add NewsCard component"
```

---

## Task 6: NewsGrid Component

**Files:**
- Create: `src/components/NewsGrid.tsx`
- Create: `src/components/NewsGrid.css`
- Create: `src/components/NewsGrid.test.tsx`

**Interfaces:**
- Consumes: `Article` from `src/types/news.ts`; `NewsCard` from Task 5
- Produces: `NewsGrid({ articles: Article[]; loading: boolean; error: string | null; onRetry: () => void }): JSX.Element`

- [ ] **Step 1: Write the failing tests**

Create `src/components/NewsGrid.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewsGrid } from './NewsGrid'
import type { Article } from '../types/news'

const makeArticle = (i: number): Article => ({
  source: { id: `source-${i}`, name: `Source ${i}` },
  author: null,
  title: `Article ${i}`,
  description: null,
  url: `https://example.com/${i}`,
  urlToImage: null,
  publishedAt: '2026-06-30T10:00:00Z',
  content: null,
})

describe('NewsGrid', () => {
  it('renders skeleton cards when loading', () => {
    render(<NewsGrid articles={[]} loading={true} error={null} onRetry={() => {}} />)
    const skeletons = document.querySelectorAll('.news-grid__skeleton')
    expect(skeletons.length).toBe(12)
  })

  it('renders error banner when error is set', () => {
    render(
      <NewsGrid
        articles={[]}
        loading={false}
        error="Failed to load news. Try again."
        onRetry={() => {}}
      />
    )
    expect(screen.getByText('Failed to load news. Try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn()
    render(
      <NewsGrid
        articles={[]}
        loading={false}
        error="Failed to load news. Try again."
        onRetry={onRetry}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders empty state when no articles and no error', () => {
    render(<NewsGrid articles={[]} loading={false} error={null} onRetry={() => {}} />)
    expect(screen.getByText('No articles found.')).toBeInTheDocument()
  })

  it('renders correct number of article cards', () => {
    const articles = Array.from({ length: 5 }, (_, i) => makeArticle(i))
    render(<NewsGrid articles={articles} loading={false} error={null} onRetry={() => {}} />)
    expect(screen.getAllByRole('article')).toHaveLength(5)
  })

  it('renders article titles', () => {
    const articles = [makeArticle(1), makeArticle(2)]
    render(<NewsGrid articles={articles} loading={false} error={null} onRetry={() => {}} />)
    expect(screen.getByText('Article 1')).toBeInTheDocument()
    expect(screen.getByText('Article 2')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- NewsGrid
```
Expected: FAIL — "Cannot find module './NewsGrid'"

- [ ] **Step 3: Create src/components/NewsGrid.tsx**

```typescript
import type { Article } from '../types/news'
import { NewsCard } from './NewsCard'
import './NewsGrid.css'

interface NewsGridProps {
  articles: Article[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export const NewsGrid = ({ articles, loading, error, onRetry }: NewsGridProps) => {
  if (loading) {
    return (
      <div className="news-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="news-grid__skeleton" aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="news-grid__error">
        <p>{error}</p>
        <button onClick={onRetry} className="news-grid__retry-btn">
          Retry
        </button>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="news-grid__empty">
        <p>No articles found.</p>
      </div>
    )
  }

  return (
    <div className="news-grid">
      {articles.map((article) => (
        <NewsCard key={article.url} article={article} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create src/components/NewsGrid.css**

```css
.news-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .news-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .news-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .news-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.news-grid__skeleton {
  height: 320px;
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.news-grid__error,
.news-grid__empty {
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

.news-grid__error p {
  margin-bottom: 1rem;
  font-size: 1rem;
  color: #dc2626;
}

.news-grid__retry-btn {
  padding: 0.5rem 1.5rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.news-grid__retry-btn:hover {
  background: #1d4ed8;
}

.news-grid__empty p {
  font-size: 1rem;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- NewsGrid
```
Expected: PASS — 6 tests passing.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/NewsGrid.tsx src/components/NewsGrid.css src/components/NewsGrid.test.tsx
git commit -m "feat: add NewsGrid component with loading, error, and empty states"
```

---

## Task 7: FilterBar Component

**Files:**
- Create: `src/components/FilterBar.tsx`
- Create: `src/components/FilterBar.css`
- Create: `src/components/FilterBar.test.tsx`

**Interfaces:**
- Consumes: `FilterState`, `Source` from `src/types/news.ts`
- Produces: `FilterBar({ category: string; source: string; onFilterChange: (key: keyof FilterState, value: string) => void }): JSX.Element`

- [ ] **Step 1: Write the failing tests**

Create `src/components/FilterBar.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from './FilterBar'
import type { SourcesApiResponse } from '../types/news'

const mockSourcesResponse: SourcesApiResponse = {
  status: 'ok',
  sources: [
    { id: 'techcrunch', name: 'TechCrunch', description: '', url: '', category: 'technology', language: 'en', country: 'us' },
    { id: 'the-verge', name: 'The Verge', description: '', url: '', category: 'technology', language: 'en', country: 'us' },
  ],
}

describe('FilterBar', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSourcesResponse,
    }))
  })

  it('renders category dropdown with all options', async () => {
    render(<FilterBar category="" source="" onFilterChange={() => {}} />)
    const select = screen.getByLabelText(/category/i)
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /all categories/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /technology/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /science/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /business/i })).toBeInTheDocument()
  })

  it('renders source dropdown populated from API', async () => {
    render(<FilterBar category="" source="" onFilterChange={() => {}} />)
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'TechCrunch' })).toBeInTheDocument()
    })
    expect(screen.getByRole('option', { name: 'The Verge' })).toBeInTheDocument()
  })

  it('calls onFilterChange with category when category is selected', async () => {
    const onFilterChange = vi.fn()
    render(<FilterBar category="" source="" onFilterChange={onFilterChange} />)
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'technology')
    expect(onFilterChange).toHaveBeenCalledWith('category', 'technology')
  })

  it('calls onFilterChange with source when source is selected', async () => {
    const onFilterChange = vi.fn()
    render(<FilterBar category="" source="" onFilterChange={onFilterChange} />)
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'TechCrunch' })).toBeInTheDocument()
    })
    await userEvent.selectOptions(screen.getByLabelText(/source/i), 'techcrunch')
    expect(onFilterChange).toHaveBeenCalledWith('source', 'techcrunch')
  })

  it('reflects current category value', () => {
    render(<FilterBar category="science" source="" onFilterChange={() => {}} />)
    expect(screen.getByLabelText(/category/i)).toHaveValue('science')
  })

  it('reflects current source value', async () => {
    render(<FilterBar category="" source="techcrunch" onFilterChange={() => {}} />)
    await waitFor(() => {
      expect(screen.getByLabelText(/source/i)).toHaveValue('techcrunch')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- FilterBar
```
Expected: FAIL — "Cannot find module './FilterBar'"

- [ ] **Step 3: Create src/components/FilterBar.tsx**

```typescript
import { useState, useEffect } from 'react'
import type { FilterState, Source } from '../types/news'
import './FilterBar.css'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'technology', label: 'Technology' },
  { value: 'science', label: 'Science' },
  { value: 'business', label: 'Business' },
  { value: 'health', label: 'Health' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
  { value: 'general', label: 'General' },
]

interface FilterBarProps {
  category: string
  source: string
  onFilterChange: (key: keyof FilterState, value: string) => void
}

export const FilterBar = ({ category, source, onFilterChange }: FilterBarProps) => {
  const [sources, setSources] = useState<Source[]>([])

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const apiKey = import.meta.env.VITE_NEWSAPI_KEY as string | undefined
        if (!apiKey) return
        const res = await fetch(
          `https://newsapi.org/v2/top-headlines/sources?language=en&apiKey=${apiKey}`
        )
        if (!res.ok) return
        const data = await res.json() as { status: string; sources: Source[] }
        setSources(data.sources)
      } catch {
        // silently fail — source dropdown just stays empty
      }
    }
    fetchSources()
  }, [])

  return (
    <div className="filter-bar">
      <div className="filter-bar__group">
        <label htmlFor="category-select" className="filter-bar__label">
          Category
        </label>
        <select
          id="category-select"
          className="filter-bar__select"
          value={category}
          onChange={(e) => onFilterChange('category', e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-bar__group">
        <label htmlFor="source-select" className="filter-bar__label">
          Source
        </label>
        <select
          id="source-select"
          className="filter-bar__select"
          value={source}
          onChange={(e) => onFilterChange('source', e.target.value)}
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create src/components/FilterBar.css**

```css
.filter-bar {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.filter-bar__group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-bar__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-bar__select {
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  min-width: 160px;
}

.filter-bar__select:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-color: #2563eb;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- FilterBar
```
Expected: PASS — 6 tests passing.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/FilterBar.tsx src/components/FilterBar.css src/components/FilterBar.test.tsx
git commit -m "feat: add FilterBar component with category and source dropdowns"
```

---

## Task 8: Wire App Together

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `useFilterParams` (Task 3), `useNews` (Task 4), `FilterBar` (Task 7), `NewsGrid` (Task 6)
- Produces: fully working single-page app

- [ ] **Step 1: Update src/App.tsx**

```typescript
import { useFilterParams } from './hooks/useFilterParams'
import { useNews } from './hooks/useNews'
import { FilterBar } from './components/FilterBar'
import { NewsGrid } from './components/NewsGrid'
import './App.css'

const App = () => {
  const { category, source, setFilter } = useFilterParams()
  const { articles, loading, error, retry } = useNews({ category, source })

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tech News</h1>
      </header>
      <main className="app-main">
        <FilterBar
          category={category}
          source={source}
          onFilterChange={setFilter}
        />
        <NewsGrid
          articles={articles}
          loading={loading}
          error={error}
          onRetry={retry}
        />
      </main>
    </div>
  )
}

export default App
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat: wire App together — FilterBar + NewsGrid with URL-based filter state"
```

---

## Task 9: Environment Setup and README

**Files:**
- Verify: `.env.example` exists with correct content
- Create: `README.md`

**Interfaces:**
- Produces: clear developer onboarding instructions

- [ ] **Step 1: Verify .env.example**

The file should contain exactly:
```
VITE_NEWSAPI_KEY=your_api_key_here
```

- [ ] **Step 2: Create README.md**

```markdown
# Tech News Platform

Centralized tech news platform with category and source filters, powered by NewsAPI.org.

## Setup

1. Get a free API key from [newsapi.org](https://newsapi.org)
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Add your API key to `.env`:
   ```
   VITE_NEWSAPI_KEY=your_actual_key_here
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3000

## Usage

- Use the **Category** dropdown to browse by topic (Technology, Science, Business, etc.)
- Use the **Source** dropdown to filter by news outlet (TechCrunch, The Verge, etc.)
- Category and source filters are mutually exclusive — selecting one clears the other
- Filter state is stored in the URL so you can bookmark or share filtered views

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run typecheck` | TypeScript check |

## Notes

- NewsAPI free tier: 100 requests/day, developer use only
- Articles default to Technology category on first load
```

- [ ] **Step 3: Run full test suite one final time**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 4: Final typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add .env.example README.md
git commit -m "docs: add README with setup and usage instructions"
```
