# Tech News Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a magazine-style tech news aggregator using HackerNews and Dev.to APIs with rich news cards, category filters, bookmarking, and sharing.

**Architecture:** Layered — shared TypeScript types, custom React hooks (useNewsApi, useBookmarks) that isolate data-fetching and persistence, and pure presentational components wired together in App.tsx. No external state library needed.

**Tech Stack:** React 19, TypeScript (strict), Vite, plain CSS, Vitest + Testing Library

## Global Constraints

- TypeScript strict mode — no `any`, no implicit undefined
- Plain CSS files per component (no Tailwind, no CSS-in-JS) — consistent with existing `App.css`
- Arrow function components only
- Destructure imports: `import { useState } from 'react'`
- Always include error handling in async functions (CLAUDE.md requirement)
- Unit tests required for every new component and utility (CLAUDE.md requirement)
- Color palette: header `#0f172a`, accent `#3b82f6`, card bg `#ffffff`, page bg `#f1f5f9`
- Responsive grid: 3 cols ≥1024px, 2 cols ≥640px, 1 col below
- Run `npm run typecheck` after every task

---

### Task 1: Types and Utility Functions

**Files:**
- Create: `src/types/news.ts`
- Create: `src/utils/gradientPlaceholder.ts`
- Create: `src/utils/timeAgo.ts`
- Create: `src/utils/share.ts`
- Create: `src/utils/gradientPlaceholder.test.ts`
- Create: `src/utils/timeAgo.test.ts`

**Interfaces:**
- Produces: `Article`, `ArticleSource`, `Category` types used by all subsequent tasks
- Produces: `getGradient(title: string): string`
- Produces: `timeAgo(isoString: string): string`
- Produces: `shareArticle(article: Article): Promise<void>`

- [ ] **Step 1: Write failing tests for `getGradient`**

Create `src/utils/gradientPlaceholder.test.ts`:
```ts
import { getGradient } from './gradientPlaceholder'

describe('getGradient', () => {
  it('returns a CSS gradient string', () => {
    const result = getGradient('Hello World')
    expect(result).toMatch(/^linear-gradient/)
  })

  it('is deterministic — same input produces same output', () => {
    expect(getGradient('React News')).toBe(getGradient('React News'))
  })

  it('produces different gradients for different titles', () => {
    expect(getGradient('Title A')).not.toBe(getGradient('Title B'))
  })
})
```

- [ ] **Step 2: Write failing tests for `timeAgo`**

Create `src/utils/timeAgo.test.ts`:
```ts
import { timeAgo } from './timeAgo'

describe('timeAgo', () => {
  it('returns "just now" for times under a minute ago', () => {
    const recent = new Date(Date.now() - 30_000).toISOString()
    expect(timeAgo(recent)).toBe('just now')
  })

  it('returns minutes ago', () => {
    const fiveMin = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(timeAgo(fiveMin)).toBe('5m ago')
  })

  it('returns hours ago', () => {
    const threeHours = new Date(Date.now() - 3 * 60 * 60_000).toISOString()
    expect(timeAgo(threeHours)).toBe('3h ago')
  })

  it('returns days ago', () => {
    const twoDays = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString()
    expect(timeAgo(twoDays)).toBe('2d ago')
  })

  it('returns weeks ago', () => {
    const twoWeeks = new Date(Date.now() - 14 * 24 * 60 * 60_000).toISOString()
    expect(timeAgo(twoWeeks)).toBe('2w ago')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/utils
```
Expected: FAIL — modules not found.

- [ ] **Step 4: Create `src/types/news.ts`**

```ts
export type ArticleSource = 'hackernews' | 'devto'

export interface Article {
  id: string
  source: ArticleSource
  title: string
  description: string | null
  url: string
  imageUrl: string | null
  author: string | null
  authorImage: string | null
  publishedAt: string
  tags: string[]
  score: number
  commentCount: number | null
}

export type Category = 'all' | 'hackernews' | 'devto' | 'ai' | 'security' | 'webdev' | 'career'
```

- [ ] **Step 5: Create `src/utils/gradientPlaceholder.ts`**

```ts
const COLORS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#fccb90', '#d57eeb'],
  ['#a1c4fd', '#c2e9fb'],
]

const hashString = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export const getGradient = (title: string): string => {
  const index = hashString(title) % COLORS.length
  const [from, to] = COLORS[index]
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
}
```

- [ ] **Step 6: Create `src/utils/timeAgo.ts`**

```ts
export const timeAgo = (isoString: string): string => {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}
```

- [ ] **Step 7: Create `src/utils/share.ts`**

```ts
import { Article } from '../types/news'

export const shareArticle = async (article: Article): Promise<void> => {
  if (navigator.share) {
    await navigator.share({ title: article.title, url: article.url })
  } else {
    await navigator.clipboard.writeText(article.url)
  }
}
```

- [ ] **Step 8: Run tests — verify they pass**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/utils
```
Expected: all tests PASS.

- [ ] **Step 9: Typecheck**

```bash
cd /workshop/tech-news-platform && npm run typecheck
```
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
cd /workshop/tech-news-platform && git add src/types src/utils && git commit -m "feat: add Article types and utility functions"
```

---

### Task 2: `useBookmarks` Hook

**Files:**
- Create: `src/hooks/useBookmarks.ts`
- Create: `src/hooks/useBookmarks.test.ts`

**Interfaces:**
- Consumes: `Article` from `src/types/news.ts`
- Produces: `useBookmarks(): { bookmarks: Article[], toggle: (article: Article) => void, isBookmarked: (id: string) => boolean }`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useBookmarks.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react'
import { useBookmarks } from './useBookmarks'
import { Article } from '../types/news'

const mockArticle: Article = {
  id: 'test-1',
  source: 'devto',
  title: 'Test Article',
  description: 'A test',
  url: 'https://example.com/test',
  imageUrl: null,
  author: 'Alice',
  authorImage: null,
  publishedAt: '2026-07-01T00:00:00Z',
  tags: ['react'],
  score: 10,
  commentCount: null,
}

beforeEach(() => localStorage.clear())

describe('useBookmarks', () => {
  it('starts with empty bookmarks', () => {
    const { result } = renderHook(() => useBookmarks())
    expect(result.current.bookmarks).toEqual([])
  })

  it('adds an article when toggled', () => {
    const { result } = renderHook(() => useBookmarks())
    act(() => result.current.toggle(mockArticle))
    expect(result.current.bookmarks).toHaveLength(1)
    expect(result.current.bookmarks[0].id).toBe('test-1')
  })

  it('removes an article when toggled twice', () => {
    const { result } = renderHook(() => useBookmarks())
    act(() => result.current.toggle(mockArticle))
    act(() => result.current.toggle(mockArticle))
    expect(result.current.bookmarks).toHaveLength(0)
  })

  it('isBookmarked returns true after adding', () => {
    const { result } = renderHook(() => useBookmarks())
    act(() => result.current.toggle(mockArticle))
    expect(result.current.isBookmarked('test-1')).toBe(true)
  })

  it('isBookmarked returns false for unknown id', () => {
    const { result } = renderHook(() => useBookmarks())
    expect(result.current.isBookmarked('unknown')).toBe(false)
  })

  it('persists bookmarks to localStorage', () => {
    const { result } = renderHook(() => useBookmarks())
    act(() => result.current.toggle(mockArticle))
    const stored = JSON.parse(localStorage.getItem('tech-news-bookmarks') ?? '[]')
    expect(stored).toHaveLength(1)
  })

  it('loads bookmarks from localStorage on mount', () => {
    localStorage.setItem('tech-news-bookmarks', JSON.stringify([mockArticle]))
    const { result } = renderHook(() => useBookmarks())
    expect(result.current.bookmarks).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/hooks/useBookmarks
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/useBookmarks.ts`**

```ts
import { useState, useEffect } from 'react'
import { Article } from '../types/news'

const STORAGE_KEY = 'tech-news-bookmarks'

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Article[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
  }, [bookmarks])

  const toggle = (article: Article) => {
    setBookmarks(prev =>
      prev.some(b => b.id === article.id)
        ? prev.filter(b => b.id !== article.id)
        : [article, ...prev]
    )
  }

  const isBookmarked = (id: string) => bookmarks.some(b => b.id === id)

  return { bookmarks, toggle, isBookmarked }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/hooks/useBookmarks
```
Expected: all tests PASS.

- [ ] **Step 5: Typecheck**

```bash
cd /workshop/tech-news-platform && npm run typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /workshop/tech-news-platform && git add src/hooks/useBookmarks.ts src/hooks/useBookmarks.test.ts && git commit -m "feat: add useBookmarks hook with localStorage persistence"
```

---

### Task 3: `useNewsApi` Hook

**Files:**
- Create: `src/hooks/useNewsApi.ts`
- Create: `src/hooks/useNewsApi.test.ts`

**Interfaces:**
- Consumes: `Article`, `Category` from `src/types/news.ts`
- Produces: `useNewsApi(category: Category, page: number): { articles: Article[], loading: boolean, error: string | null, totalResults: number }`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useNewsApi.test.ts`:
```ts
import { renderHook, waitFor } from '@testing-library/react'
import { useNewsApi } from './useNewsApi'

const mockHnIds = [1, 2, 3, 4, 5]
const mockHnItem = (id: number) => ({
  id,
  title: `HN Story ${id}`,
  url: `https://example.com/${id}`,
  score: id * 10,
  by: `user${id}`,
  time: Math.floor(new Date('2026-07-01T00:00:00Z').getTime() / 1000),
  descendants: id * 2,
  type: 'story',
})
const mockDevtoArticle = (id: number) => ({
  id,
  title: `Dev.to Article ${id}`,
  description: `Description ${id}`,
  cover_image: `https://images.example.com/${id}.jpg`,
  url: `https://dev.to/article-${id}`,
  published_at: '2026-07-01T00:00:00Z',
  user: { name: `Author ${id}`, profile_image: null },
  tag_list: ['react', 'javascript'],
  public_reactions_count: id * 5,
})

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useNewsApi — hackernews category', () => {
  it('fetches and normalizes HN stories', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => mockHnIds } as Response)
      .mockResolvedValue({ ok: true, json: async () => mockHnItem(1) } as Response)

    const { result } = renderHook(() => useNewsApi('hackernews', 1))
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.articles[0].source).toBe('hackernews')
    expect(result.current.articles[0].title).toBe('HN Story 1')
    expect(result.current.articles[0].description).toBeNull()
  })
})

describe('useNewsApi — devto category', () => {
  it('fetches and normalizes Dev.to articles', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockDevtoArticle(1), mockDevtoArticle(2)],
    } as Response)

    const { result } = renderHook(() => useNewsApi('devto', 1))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.articles[0].source).toBe('devto')
    expect(result.current.articles[0].imageUrl).toBe('https://images.example.com/1.jpg')
    expect(result.current.articles[0].description).toBe('Description 1')
  })
})

describe('useNewsApi — error state', () => {
  it('sets error when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useNewsApi('hackernews', 1))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Failed to load articles. Please try again.')
    expect(result.current.articles).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/hooks/useNewsApi
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/useNewsApi.ts`**

```ts
import { useState, useEffect, useRef } from 'react'
import { Article, Category } from '../types/news'

const HN_BASE = 'https://hacker-news.firebaseio.com/v0'
const DEVTO_BASE = 'https://dev.to/api/articles'
const PAGE_SIZE = 10

const CATEGORY_TO_TAG: Record<string, string> = {
  ai: 'ai',
  security: 'security',
  webdev: 'webdev',
  career: 'career',
  devto: 'javascript',
}

const normalizeHnItem = (item: Record<string, unknown>): Article => ({
  id: String(item.id),
  source: 'hackernews',
  title: String(item.title ?? ''),
  description: null,
  url: String(item.url ?? `https://news.ycombinator.com/item?id=${item.id}`),
  imageUrl: null,
  author: item.by ? String(item.by) : null,
  authorImage: null,
  publishedAt: new Date((Number(item.time) ?? 0) * 1000).toISOString(),
  tags: [],
  score: Number(item.score ?? 0),
  commentCount: item.descendants != null ? Number(item.descendants) : null,
})

const normalizeDevtoArticle = (article: Record<string, unknown>): Article => {
  const user = article.user as Record<string, unknown> | null
  return {
    id: String(article.id),
    source: 'devto',
    title: String(article.title ?? ''),
    description: article.description ? String(article.description) : null,
    url: String(article.url ?? ''),
    imageUrl: article.cover_image ? String(article.cover_image) : null,
    author: user?.name ? String(user.name) : null,
    authorImage: user?.profile_image ? String(user.profile_image) : null,
    publishedAt: String(article.published_at ?? new Date().toISOString()),
    tags: Array.isArray(article.tag_list) ? article.tag_list.map(String) : [],
    score: Number(article.public_reactions_count ?? 0),
    commentCount: null,
  }
}

const fetchHnPage = async (page: number, signal: AbortSignal): Promise<Article[]> => {
  const idsRes = await fetch(`${HN_BASE}/topstories.json`, { signal })
  if (!idsRes.ok) throw new Error('Failed to fetch HN stories')
  const ids: number[] = await idsRes.json()
  const pageIds = ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const items = await Promise.all(
    pageIds.map(id =>
      fetch(`${HN_BASE}/item/${id}.json`, { signal })
        .then(r => r.json())
        .then(normalizeHnItem)
    )
  )
  return items
}

const fetchDevtoPage = async (tag: string, page: number, signal: AbortSignal): Promise<Article[]> => {
  const url = tag
    ? `${DEVTO_BASE}?tag=${tag}&per_page=${PAGE_SIZE}&page=${page}`
    : `${DEVTO_BASE}?per_page=${PAGE_SIZE}&page=${page}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Failed to fetch Dev.to articles')
  const data: Record<string, unknown>[] = await res.json()
  return data.map(normalizeDevtoArticle)
}

export const useNewsApi = (category: Category, page: number) => {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalResults, setTotalResults] = useState(0)
  const cache = useRef<Map<string, Article[]>>(new Map())

  useEffect(() => {
    const key = `${category}-${page}`
    if (cache.current.has(key)) {
      const cached = cache.current.get(key)!
      setArticles(cached)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        let results: Article[] = []

        if (category === 'hackernews') {
          results = await fetchHnPage(page, controller.signal)
          setTotalResults(500)
        } else if (category === 'devto') {
          results = await fetchDevtoPage('', page, controller.signal)
          setTotalResults(100)
        } else if (category === 'all') {
          const [hn, devto] = await Promise.all([
            fetchHnPage(page, controller.signal).then(r => r.slice(0, 5)),
            fetchDevtoPage('', page, controller.signal).then(r => r.slice(0, 5)),
          ])
          results = [...hn, ...devto].sort(
            (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          )
          setTotalResults(600)
        } else {
          const tag = CATEGORY_TO_TAG[category] ?? category
          results = await fetchDevtoPage(tag, page, controller.signal)
          setTotalResults(100)
        }

        cache.current.set(key, results)
        setArticles(results)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError('Failed to load articles. Please try again.')
        setArticles([])
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [category, page])

  return { articles, loading, error, totalResults }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/hooks/useNewsApi
```
Expected: all tests PASS.

- [ ] **Step 5: Typecheck**

```bash
cd /workshop/tech-news-platform && npm run typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /workshop/tech-news-platform && git add src/hooks/useNewsApi.ts src/hooks/useNewsApi.test.ts && git commit -m "feat: add useNewsApi hook for HackerNews and Dev.to"
```

---

### Task 4: `Header` and `FilterBar` Components

**Files:**
- Create: `src/components/Header/Header.tsx`
- Create: `src/components/Header/Header.css`
- Create: `src/components/FilterBar/FilterBar.tsx`
- Create: `src/components/FilterBar/FilterBar.css`
- Create: `src/components/Header/Header.test.tsx`
- Create: `src/components/FilterBar/FilterBar.test.tsx`

**Interfaces:**
- Produces:
  - `Header({ search, onSearchChange }: { search: string, onSearchChange: (v: string) => void })`
  - `FilterBar({ active, onChange }: { active: Category, onChange: (c: Category) => void })`

- [ ] **Step 1: Write failing tests**

Create `src/components/Header/Header.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from './Header'

describe('Header', () => {
  it('renders the logo', () => {
    render(<Header search="" onSearchChange={() => {}} />)
    expect(screen.getByText('Tech News')).toBeInTheDocument()
  })

  it('calls onSearchChange when typing', () => {
    const handler = vi.fn()
    render(<Header search="" onSearchChange={handler} />)
    fireEvent.change(screen.getByPlaceholderText('Search articles...'), {
      target: { value: 'react' },
    })
    expect(handler).toHaveBeenCalledWith('react')
  })
})
```

Create `src/components/FilterBar/FilterBar.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterBar } from './FilterBar'

describe('FilterBar', () => {
  it('renders all category tabs', () => {
    render(<FilterBar active="all" onChange={() => {}} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('HackerNews')).toBeInTheDocument()
    expect(screen.getByText('Dev.to')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('marks the active tab', () => {
    render(<FilterBar active="ai" onChange={() => {}} />)
    expect(screen.getByText('AI').closest('button')).toHaveClass('active')
  })

  it('calls onChange when a tab is clicked', () => {
    const handler = vi.fn()
    render(<FilterBar active="all" onChange={handler} />)
    fireEvent.click(screen.getByText('HackerNews'))
    expect(handler).toHaveBeenCalledWith('hackernews')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/components/Header src/components/FilterBar
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/components/Header/Header.tsx`**

```tsx
import './Header.css'

interface HeaderProps {
  search: string
  onSearchChange: (value: string) => void
}

export const Header = ({ search, onSearchChange }: HeaderProps) => (
  <header className="header">
    <div className="header-inner">
      <div className="header-logo">Tech News</div>
      <input
        className="header-search"
        type="search"
        placeholder="Search articles..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
      />
    </div>
  </header>
)
```

- [ ] **Step 4: Create `src/components/Header/Header.css`**

```css
.header {
  background: #0f172a;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.875rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-logo {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.header-search {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  padding: 0.5rem 0.875rem;
  width: 280px;
  outline: none;
}

.header-search::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.header-search:focus {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}
```

- [ ] **Step 5: Create `src/components/FilterBar/FilterBar.tsx`**

```tsx
import { Category } from '../../types/news'
import './FilterBar.css'

const TABS: { label: string; value: Category }[] = [
  { label: 'All', value: 'all' },
  { label: 'HackerNews', value: 'hackernews' },
  { label: 'Dev.to', value: 'devto' },
  { label: 'AI', value: 'ai' },
  { label: 'Security', value: 'security' },
  { label: 'Web Dev', value: 'webdev' },
  { label: 'Career', value: 'career' },
]

interface FilterBarProps {
  active: Category
  onChange: (category: Category) => void
}

export const FilterBar = ({ active, onChange }: FilterBarProps) => (
  <nav className="filter-bar">
    <div className="filter-bar-inner">
      {TABS.map(tab => (
        <button
          key={tab.value}
          className={`filter-tab${active === tab.value ? ' active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </nav>
)
```

- [ ] **Step 6: Create `src/components/FilterBar/FilterBar.css`**

```css
.filter-bar {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 56px;
  z-index: 90;
}

.filter-bar-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-bar-inner::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.875rem 0.75rem;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
}

.filter-tab:hover {
  color: #1e293b;
}

.filter-tab.active {
  border-bottom-color: #3b82f6;
  color: #3b82f6;
  font-weight: 600;
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/components/Header src/components/FilterBar
```
Expected: all tests PASS.

- [ ] **Step 8: Typecheck**

```bash
cd /workshop/tech-news-platform && npm run typecheck
```

- [ ] **Step 9: Commit**

```bash
cd /workshop/tech-news-platform && git add src/components/Header src/components/FilterBar && git commit -m "feat: add Header and FilterBar components"
```

---

### Task 5: `SkeletonCard` and `NewsCard` Components

**Files:**
- Create: `src/components/SkeletonCard/SkeletonCard.tsx`
- Create: `src/components/SkeletonCard/SkeletonCard.css`
- Create: `src/components/NewsCard/NewsCard.tsx`
- Create: `src/components/NewsCard/NewsCard.css`
- Create: `src/components/NewsCard/NewsCard.test.tsx`

**Interfaces:**
- Consumes: `Article` from `src/types/news.ts`, `getGradient`, `timeAgo`, `shareArticle`
- Produces:
  - `SkeletonCard()`
  - `NewsCard({ article, isBookmarked, onBookmark }: { article: Article, isBookmarked: boolean, onBookmark: () => void })`

- [ ] **Step 1: Write failing tests**

Create `src/components/NewsCard/NewsCard.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { NewsCard } from './NewsCard'
import { Article } from '../../types/news'

const mockArticle: Article = {
  id: '1',
  source: 'devto',
  title: 'How to use React Hooks',
  description: 'A comprehensive guide to hooks.',
  url: 'https://dev.to/hooks',
  imageUrl: 'https://images.example.com/hooks.jpg',
  author: 'Alice',
  authorImage: null,
  publishedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
  tags: ['react'],
  score: 42,
  commentCount: null,
}

describe('NewsCard', () => {
  it('renders the article title', () => {
    render(<NewsCard article={mockArticle} isBookmarked={false} onBookmark={() => {}} />)
    expect(screen.getByText('How to use React Hooks')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<NewsCard article={mockArticle} isBookmarked={false} onBookmark={() => {}} />)
    expect(screen.getByText('A comprehensive guide to hooks.')).toBeInTheDocument()
  })

  it('calls onBookmark when bookmark button clicked', () => {
    const handler = vi.fn()
    render(<NewsCard article={mockArticle} isBookmarked={false} onBookmark={handler} />)
    fireEvent.click(screen.getByLabelText('Bookmark article'))
    expect(handler).toHaveBeenCalled()
  })

  it('shows filled bookmark icon when bookmarked', () => {
    render(<NewsCard article={mockArticle} isBookmarked={true} onBookmark={() => {}} />)
    expect(screen.getByLabelText('Bookmark article')).toHaveClass('bookmarked')
  })

  it('shows score and comment count for HN articles with no description', () => {
    const hnArticle: Article = { ...mockArticle, source: 'hackernews', description: null, commentCount: 15 }
    render(<NewsCard article={hnArticle} isBookmarked={false} onBookmark={() => {}} />)
    expect(screen.getByText(/42 points/)).toBeInTheDocument()
    expect(screen.getByText(/15 comments/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/components/NewsCard
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/SkeletonCard/SkeletonCard.tsx`**

```tsx
import './SkeletonCard.css'

export const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-image" />
    <div className="skeleton-body">
      <div className="skeleton-badge" />
      <div className="skeleton-title" />
      <div className="skeleton-title short" />
      <div className="skeleton-text" />
      <div className="skeleton-text" />
      <div className="skeleton-meta" />
    </div>
  </div>
)
```

- [ ] **Step 4: Create `src/components/SkeletonCard/SkeletonCard.css`**

```css
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.skeleton-image {
  height: 180px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-badge,
.skeleton-title,
.skeleton-text,
.skeleton-meta {
  border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-badge { height: 20px; width: 70px; }
.skeleton-title { height: 18px; width: 100%; }
.skeleton-title.short { width: 70%; }
.skeleton-text { height: 14px; width: 100%; }
.skeleton-meta { height: 14px; width: 60%; margin-top: 0.5rem; }
```

- [ ] **Step 5: Create `src/components/NewsCard/NewsCard.tsx`**

```tsx
import { Article } from '../../types/news'
import { getGradient } from '../../utils/gradientPlaceholder'
import { timeAgo } from '../../utils/timeAgo'
import { shareArticle } from '../../utils/share'
import './NewsCard.css'

interface NewsCardProps {
  article: Article
  isBookmarked: boolean
  onBookmark: () => void
}

export const NewsCard = ({ article, isBookmarked, onBookmark }: NewsCardProps) => {
  const handleShare = async () => {
    try {
      await shareArticle(article)
    } catch {
      // share cancelled or failed silently
    }
  }

  return (
    <article className="news-card">
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="news-card-image-link">
        {article.imageUrl ? (
          <img className="news-card-image" src={article.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="news-card-image-placeholder" style={{ background: getGradient(article.title) }} />
        )}
      </a>
      <div className="news-card-body">
        <span className={`news-card-badge news-card-badge--${article.source}`}>
          {article.source === 'hackernews' ? 'HackerNews' : 'Dev.to'}
          {article.tags[0] ? ` · ${article.tags[0]}` : ''}
        </span>
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="news-card-title-link">
          <h2 className="news-card-title">{article.title}</h2>
        </a>
        {article.description ? (
          <p className="news-card-description">{article.description}</p>
        ) : (
          <p className="news-card-hn-meta">
            {article.score} points{article.commentCount != null ? ` · ${article.commentCount} comments` : ''}
          </p>
        )}
        <div className="news-card-footer">
          <div className="news-card-meta">
            {article.author && <span className="news-card-author">{article.author}</span>}
            <span className="news-card-time">{timeAgo(article.publishedAt)}</span>
          </div>
          <div className="news-card-actions">
            <button className="news-card-action" onClick={handleShare} aria-label="Share article" title="Share">
              ↗
            </button>
            <button
              className={`news-card-action${isBookmarked ? ' bookmarked' : ''}`}
              onClick={onBookmark}
              aria-label="Bookmark article"
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {isBookmarked ? '★' : '☆'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 6: Create `src/components/NewsCard/NewsCard.css`**

```css
.news-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s, transform 0.2s;
}

.news-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.news-card-image-link { display: block; }

.news-card-image,
.news-card-image-placeholder {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}

.news-card-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.news-card-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  align-self: flex-start;
}

.news-card-badge--hackernews {
  background: #fff3e0;
  color: #e65100;
}

.news-card-badge--devto {
  background: #e8f5e9;
  color: #2e7d32;
}

.news-card-title-link { text-decoration: none; color: inherit; }

.news-card-title {
  font-size: 0.975rem;
  font-weight: 700;
  line-height: 1.4;
  color: #1e293b;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-card-description {
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.news-card-hn-meta {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
  flex: 1;
}

.news-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid #f1f5f9;
}

.news-card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.news-card-author {
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}

.news-card-time {
  font-size: 0.75rem;
  color: #94a3b8;
}

.news-card-actions {
  display: flex;
  gap: 0.25rem;
}

.news-card-action {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.375rem;
  border-radius: 6px;
  color: #94a3b8;
  transition: color 0.15s, background 0.15s;
}

.news-card-action:hover {
  background: #f1f5f9;
  color: #475569;
}

.news-card-action.bookmarked {
  color: #f59e0b;
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/components/NewsCard
```
Expected: all tests PASS.

- [ ] **Step 8: Typecheck**

```bash
cd /workshop/tech-news-platform && npm run typecheck
```

- [ ] **Step 9: Commit**

```bash
cd /workshop/tech-news-platform && git add src/components/SkeletonCard src/components/NewsCard && git commit -m "feat: add SkeletonCard and NewsCard components"
```

---

### Task 6: `HeroCard` Component

**Files:**
- Create: `src/components/HeroCard/HeroCard.tsx`
- Create: `src/components/HeroCard/HeroCard.css`
- Create: `src/components/HeroCard/HeroCard.test.tsx`

**Interfaces:**
- Consumes: `Article`, `getGradient`, `timeAgo`, `shareArticle`
- Produces: `HeroCard({ article, isBookmarked, onBookmark }: { article: Article, isBookmarked: boolean, onBookmark: () => void })`

- [ ] **Step 1: Write failing test**

Create `src/components/HeroCard/HeroCard.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { HeroCard } from './HeroCard'
import { Article } from '../../types/news'

const mockArticle: Article = {
  id: '1',
  source: 'devto',
  title: 'The Future of React',
  description: 'React 19 brings massive improvements.',
  url: 'https://dev.to/future-react',
  imageUrl: 'https://images.example.com/react.jpg',
  author: 'Dan Abramov',
  authorImage: null,
  publishedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  tags: ['react', 'javascript'],
  score: 200,
  commentCount: null,
}

describe('HeroCard', () => {
  it('renders the title', () => {
    render(<HeroCard article={mockArticle} isBookmarked={false} onBookmark={() => {}} />)
    expect(screen.getByText('The Future of React')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<HeroCard article={mockArticle} isBookmarked={false} onBookmark={() => {}} />)
    expect(screen.getByText('React 19 brings massive improvements.')).toBeInTheDocument()
  })

  it('calls onBookmark when clicked', () => {
    const handler = vi.fn()
    render(<HeroCard article={mockArticle} isBookmarked={false} onBookmark={handler} />)
    fireEvent.click(screen.getByLabelText('Bookmark article'))
    expect(handler).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/components/HeroCard
```
Expected: FAIL.

- [ ] **Step 3: Create `src/components/HeroCard/HeroCard.tsx`**

```tsx
import { Article } from '../../types/news'
import { getGradient } from '../../utils/gradientPlaceholder'
import { timeAgo } from '../../utils/timeAgo'
import { shareArticle } from '../../utils/share'
import './HeroCard.css'

interface HeroCardProps {
  article: Article
  isBookmarked: boolean
  onBookmark: () => void
}

export const HeroCard = ({ article, isBookmarked, onBookmark }: HeroCardProps) => {
  const handleShare = async () => {
    try {
      await shareArticle(article)
    } catch {
      // share cancelled or failed silently
    }
  }

  return (
    <article className="hero-card">
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="hero-card-image-link">
        {article.imageUrl ? (
          <img className="hero-card-image" src={article.imageUrl} alt="" />
        ) : (
          <div className="hero-card-image-placeholder" style={{ background: getGradient(article.title) }} />
        )}
      </a>
      <div className="hero-card-body">
        <span className={`hero-card-badge hero-card-badge--${article.source}`}>
          {article.source === 'hackernews' ? 'HackerNews' : 'Dev.to'}
          {article.tags[0] ? ` · ${article.tags[0]}` : ''}
        </span>
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hero-card-title-link">
          <h1 className="hero-card-title">{article.title}</h1>
        </a>
        {article.description && (
          <p className="hero-card-description">{article.description}</p>
        )}
        <div className="hero-card-footer">
          <div className="hero-card-meta">
            {article.author && <span className="hero-card-author">{article.author}</span>}
            <span className="hero-card-time">{timeAgo(article.publishedAt)}</span>
          </div>
          <div className="hero-card-actions">
            <button className="hero-card-action" onClick={handleShare} aria-label="Share article">↗ Share</button>
            <button
              className={`hero-card-action${isBookmarked ? ' bookmarked' : ''}`}
              onClick={onBookmark}
              aria-label="Bookmark article"
            >
              {isBookmarked ? '★' : '☆'} {isBookmarked ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Create `src/components/HeroCard/HeroCard.css`**

```css
.hero-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .hero-card { grid-template-columns: 1fr; }
}

.hero-card-image-link { display: block; }

.hero-card-image,
.hero-card-image-placeholder {
  width: 100%;
  height: 100%;
  min-height: 280px;
  object-fit: cover;
  display: block;
}

.hero-card-body {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hero-card-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  align-self: flex-start;
}

.hero-card-badge--hackernews { background: #fff3e0; color: #e65100; }
.hero-card-badge--devto { background: #e8f5e9; color: #2e7d32; }

.hero-card-title-link { text-decoration: none; color: inherit; }

.hero-card-title {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.3;
  color: #0f172a;
  margin: 0;
}

.hero-card-description {
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.6;
  margin: 0;
  flex: 1;
}

.hero-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.hero-card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.hero-card-author { font-size: 0.85rem; font-weight: 600; color: #475569; }
.hero-card-time { font-size: 0.8rem; color: #94a3b8; }

.hero-card-actions { display: flex; gap: 0.5rem; }

.hero-card-action {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.875rem;
  color: #475569;
  transition: background 0.15s, border-color 0.15s;
}

.hero-card-action:hover { background: #f1f5f9; border-color: #cbd5e1; }
.hero-card-action.bookmarked { color: #f59e0b; border-color: #fcd34d; background: #fffbeb; }
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/components/HeroCard
```
Expected: all tests PASS.

- [ ] **Step 6: Typecheck and commit**

```bash
cd /workshop/tech-news-platform && npm run typecheck && git add src/components/HeroCard && git commit -m "feat: add HeroCard component"
```

---

### Task 7: `Pagination` and `Sidebar` Components

**Files:**
- Create: `src/components/Pagination/Pagination.tsx`
- Create: `src/components/Pagination/Pagination.css`
- Create: `src/components/Sidebar/Sidebar.tsx`
- Create: `src/components/Sidebar/Sidebar.css`
- Create: `src/components/Pagination/Pagination.test.tsx`
- Create: `src/components/Sidebar/Sidebar.test.tsx`

**Interfaces:**
- Produces:
  - `Pagination({ page, totalPages, onPageChange }: { page: number, totalPages: number, onPageChange: (p: number) => void })`
  - `Sidebar({ bookmarks, onRemoveBookmark }: { bookmarks: Article[], onRemoveBookmark: (id: string) => void })`

- [ ] **Step 1: Write failing tests**

Create `src/components/Pagination/Pagination.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders current page', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => {}} />)
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
  })

  it('disables Prev on first page', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />)
    expect(screen.getByText('← Prev')).toBeDisabled()
  })

  it('disables Next on last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={() => {}} />)
    expect(screen.getByText('Next →')).toBeDisabled()
  })

  it('calls onPageChange with decremented page on Prev', () => {
    const handler = vi.fn()
    render(<Pagination page={3} totalPages={5} onPageChange={handler} />)
    fireEvent.click(screen.getByText('← Prev'))
    expect(handler).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with incremented page on Next', () => {
    const handler = vi.fn()
    render(<Pagination page={3} totalPages={5} onPageChange={handler} />)
    fireEvent.click(screen.getByText('Next →'))
    expect(handler).toHaveBeenCalledWith(4)
  })
})
```

Create `src/components/Sidebar/Sidebar.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { Article } from '../../types/news'

const mockBookmark: Article = {
  id: 'b1',
  source: 'devto',
  title: 'Bookmarked Article',
  description: null,
  url: 'https://dev.to/b1',
  imageUrl: null,
  author: 'Bob',
  authorImage: null,
  publishedAt: new Date().toISOString(),
  tags: [],
  score: 5,
  commentCount: null,
}

describe('Sidebar', () => {
  it('shows empty state when no bookmarks', () => {
    render(<Sidebar bookmarks={[]} onRemoveBookmark={() => {}} />)
    expect(screen.getByText('No bookmarks yet.')).toBeInTheDocument()
  })

  it('renders bookmark titles', () => {
    render(<Sidebar bookmarks={[mockBookmark]} onRemoveBookmark={() => {}} />)
    expect(screen.getByText('Bookmarked Article')).toBeInTheDocument()
  })

  it('calls onRemoveBookmark with article id', () => {
    const handler = vi.fn()
    render(<Sidebar bookmarks={[mockBookmark]} onRemoveBookmark={handler} />)
    fireEvent.click(screen.getByLabelText('Remove bookmark'))
    expect(handler).toHaveBeenCalledWith('b1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/components/Pagination src/components/Sidebar
```
Expected: FAIL.

- [ ] **Step 3: Create `src/components/Pagination/Pagination.tsx`**

```tsx
import './Pagination.css'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => (
  <div className="pagination">
    <button
      className="pagination-btn"
      disabled={page <= 1}
      onClick={() => onPageChange(page - 1)}
    >
      ← Prev
    </button>
    <span className="pagination-info">Page {page} of {totalPages}</span>
    <button
      className="pagination-btn"
      disabled={page >= totalPages}
      onClick={() => onPageChange(page + 1)}
    >
      Next →
    </button>
  </div>
)
```

- [ ] **Step 4: Create `src/components/Pagination/Pagination.css`**

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem 0;
}

.pagination-btn {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #475569;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  transition: background 0.15s, border-color 0.15s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.pagination-btn:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

.pagination-info {
  color: #64748b;
  font-size: 0.875rem;
}
```

- [ ] **Step 5: Create `src/components/Sidebar/Sidebar.tsx`**

```tsx
import { Article } from '../../types/news'
import { timeAgo } from '../../utils/timeAgo'
import './Sidebar.css'

interface SidebarProps {
  bookmarks: Article[]
  onRemoveBookmark: (id: string) => void
}

export const Sidebar = ({ bookmarks, onRemoveBookmark }: SidebarProps) => (
  <aside className="sidebar">
    <section className="sidebar-section">
      <h2 className="sidebar-heading">Bookmarks</h2>
      {bookmarks.length === 0 ? (
        <p className="sidebar-empty">No bookmarks yet.</p>
      ) : (
        <ul className="sidebar-list">
          {bookmarks.map(article => (
            <li key={article.id} className="sidebar-item">
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="sidebar-item-title">
                {article.title}
              </a>
              <div className="sidebar-item-meta">
                <span className="sidebar-item-source">
                  {article.source === 'hackernews' ? 'HN' : 'Dev.to'}
                </span>
                <span className="sidebar-item-time">{timeAgo(article.publishedAt)}</span>
                <button
                  className="sidebar-remove"
                  onClick={() => onRemoveBookmark(article.id)}
                  aria-label="Remove bookmark"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  </aside>
)
```

- [ ] **Step 6: Create `src/components/Sidebar/Sidebar.css`**

```css
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar-section {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.sidebar-heading {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin: 0 0 1rem;
}

.sidebar-empty {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0;
}

.sidebar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.sidebar-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-item-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  text-decoration: none;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sidebar-item-title:hover { color: #3b82f6; }

.sidebar-item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-item-source {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #94a3b8;
}

.sidebar-item-time { font-size: 0.7rem; color: #cbd5e1; }

.sidebar-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1;
  margin-left: auto;
  padding: 0 0.125rem;
  transition: color 0.15s;
}

.sidebar-remove:hover { color: #ef4444; }
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd /workshop/tech-news-platform && npm run test -- --run src/components/Pagination src/components/Sidebar
```
Expected: all tests PASS.

- [ ] **Step 8: Typecheck and commit**

```bash
cd /workshop/tech-news-platform && npm run typecheck && git add src/components/Pagination src/components/Sidebar && git commit -m "feat: add Pagination and Sidebar components"
```

---

### Task 8: Wire Everything Together in `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: all hooks and components from Tasks 1–7

- [ ] **Step 1: Update `src/index.css`**

```css
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
  background: #f1f5f9;
  color: #1e293b;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; }

button { font-family: inherit; }
```

- [ ] **Step 2: Update `src/App.css`**

```css
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 2rem;
}

.app-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 1023px) {
  .app-layout { grid-template-columns: 1fr; }
  .app-sidebar { display: none; }
}

.app-content { min-width: 0; }

.app-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  color: #dc2626;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.app-error-retry {
  background: #dc2626;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.4rem 0.875rem;
  white-space: nowrap;
}

.app-empty {
  text-align: center;
  padding: 4rem 2rem;
  color: #94a3b8;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 1023px) {
  .app-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 639px) {
  .app-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Replace `src/App.tsx`**

```tsx
import { useState, useMemo } from 'react'
import { useNewsApi } from './hooks/useNewsApi'
import { useBookmarks } from './hooks/useBookmarks'
import { Category } from './types/news'
import { Header } from './components/Header/Header'
import { FilterBar } from './components/FilterBar/FilterBar'
import { HeroCard } from './components/HeroCard/HeroCard'
import { NewsCard } from './components/NewsCard/NewsCard'
import { SkeletonCard } from './components/SkeletonCard/SkeletonCard'
import { Pagination } from './components/Pagination/Pagination'
import { Sidebar } from './components/Sidebar/Sidebar'
import './App.css'

const PAGE_SIZE = 10

const App = () => {
  const [category, setCategory] = useState<Category>('all')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const { articles, loading, error, totalResults } = useNewsApi(category, page)
  const { bookmarks, toggle, isBookmarked } = useBookmarks()

  const filtered = useMemo(() => {
    if (!search.trim()) return articles
    const q = search.toLowerCase()
    return articles.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false)
    )
  }, [articles, search])

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat)
    setPage(1)
    setSearch('')
  }

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const hero = filtered[0]
  const gridArticles = filtered.slice(1)

  return (
    <div className="app">
      <Header search={search} onSearchChange={setSearch} />
      <FilterBar active={category} onChange={handleCategoryChange} />
      <main className="app-main">
        {error && (
          <div className="app-error">
            <span>{error}</span>
            <button
              className="app-error-retry"
              onClick={() => setRetryKey(k => k + 1)}
            >
              Retry
            </button>
          </div>
        )}
        <div className="app-layout">
          <div className="app-content">
            {loading ? (
              <>
                <div style={{ marginBottom: '2rem' }}>
                  <SkeletonCard />
                </div>
                <div className="app-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </>
            ) : filtered.length === 0 ? (
              <div className="app-empty">
                <p>No articles found for this category.</p>
                <p>Try a different filter or search term.</p>
              </div>
            ) : (
              <>
                {hero && (
                  <HeroCard
                    article={hero}
                    isBookmarked={isBookmarked(hero.id)}
                    onBookmark={() => toggle(hero)}
                  />
                )}
                <div className="app-grid">
                  {gridArticles.map(article => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      isBookmarked={isBookmarked(article.id)}
                      onBookmark={() => toggle(article)}
                    />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
          <div className="app-sidebar">
            <Sidebar
              bookmarks={bookmarks}
              onRemoveBookmark={id => {
                const article = bookmarks.find(b => b.id === id)
                if (article) toggle(article)
              }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
```

Note: `retryKey` is declared but its increment triggers a re-render which re-runs `useNewsApi`. To make retry work properly, pass `retryKey` into `useNewsApi`'s dependency. Update the hook's `useEffect` dep array to include `retryKey` by threading it through as a param or via a `useCallback`-wrapped fetch trigger. The simplest approach: add `retryKey` to the `useEffect` deps in `useNewsApi` by accepting it as a third optional argument:

In `src/hooks/useNewsApi.ts`, change the signature:
```ts
export const useNewsApi = (category: Category, page: number, retryKey = 0) => {
```
And add `retryKey` to the `useEffect` dependency array:
```ts
}, [category, page, retryKey])
```

- [ ] **Step 4: Update `useNewsApi` signature for retry support**

In `src/hooks/useNewsApi.ts`, update the function signature and `useEffect` deps:
```ts
export const useNewsApi = (category: Category, page: number, retryKey = 0) => {
  // ... existing state ...

  useEffect(() => {
    // ... existing effect body unchanged ...
  }, [category, page, retryKey])  // add retryKey here
```

Update `src/App.tsx` to pass `retryKey`:
```tsx
const { articles, loading, error, totalResults } = useNewsApi(category, page, retryKey)
```

- [ ] **Step 5: Typecheck**

```bash
cd /workshop/tech-news-platform && npm run typecheck
```
Expected: no errors.

- [ ] **Step 6: Run all tests**

```bash
cd /workshop/tech-news-platform && npm run test -- --run
```
Expected: all tests PASS.

- [ ] **Step 7: Start the dev server and verify the app loads**

```bash
cd /workshop/tech-news-platform && npm run dev
```
Open http://localhost:3000. Verify: header, filter tabs, hero card, grid of news cards, sidebar with bookmarks section all render. Click a category tab — articles reload. Bookmark an article — star fills and it appears in sidebar. Click Next page — grid updates.

- [ ] **Step 8: Commit**

```bash
cd /workshop/tech-news-platform && git add src/App.tsx src/App.css src/index.css src/hooks/useNewsApi.ts && git commit -m "feat: wire all components into App — magazine layout complete"
```
