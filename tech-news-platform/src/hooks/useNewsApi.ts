import { useState, useEffect, useRef } from 'react'
import { Article, Category } from '../types/news'

const HN_BASE = 'https://hacker-news.firebaseio.com/v0'
const DEVTO_BASE = 'https://dev.to/api/articles'
export const PAGE_SIZE = 10

const CATEGORY_TO_TAG: Record<string, string> = {
  ai: 'ai',
  security: 'security',
  webdev: 'webdev',
  career: 'career',
  devto: '',
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
  publishedAt: new Date((item.time != null ? Number(item.time) : 0) * 1000).toISOString(),
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

let hnTopIdsCache: { ids: number[]; fetchedAt: number } | null = null
const HN_IDS_TTL_MS = 5 * 60 * 1000

const getHnTopIds = async (signal: AbortSignal): Promise<number[]> => {
  if (hnTopIdsCache && Date.now() - hnTopIdsCache.fetchedAt < HN_IDS_TTL_MS) {
    return hnTopIdsCache.ids
  }
  const idsRes = await fetch(`${HN_BASE}/topstories.json`, { signal })
  if (!idsRes.ok) throw new Error('Failed to fetch HN stories')
  const ids: number[] = await idsRes.json()
  hnTopIdsCache = { ids, fetchedAt: Date.now() }
  return ids
}

const fetchHnPage = async (page: number, signal: AbortSignal, limit = PAGE_SIZE): Promise<Article[]> => {
  const ids = await getHnTopIds(signal)
  const pageIds = ids.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + limit)
  const items = await Promise.all(
    pageIds.map(id =>
      fetch(`${HN_BASE}/item/${id}.json`, { signal })
        .then(r => r.json())
        .then((item: Record<string, unknown> | null) => item ? normalizeHnItem(item) : null)
    )
  )
  return items.filter((item): item is Article => item !== null)
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

export const useNewsApi = (category: Category, page: number, retryKey = 0) => {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalResults, setTotalResults] = useState(0)
  const cache = useRef<Map<string, { articles: Article[]; totalResults: number }>>(new Map())

  useEffect(() => {
    const key = `${category}-${page}`
    if (retryKey > 0) {
      cache.current.delete(key)
    }
    if (cache.current.has(key)) {
      const { articles: cached, totalResults: cachedTotal } = cache.current.get(key)!
      setArticles(cached)
      setTotalResults(cachedTotal)
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        let results: Article[] = []
        let total = 0

        if (category === 'hackernews') {
          results = await fetchHnPage(page, controller.signal)
          total = 500
        } else if (category === 'all') {
          const [hn, devto] = await Promise.all([
            fetchHnPage(page, controller.signal, 5),
            fetchDevtoPage('', page, controller.signal).then(r => r.slice(0, 5)),
          ])
          results = [...hn, ...devto].sort(
            (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
          )
          total = 600
        } else {
          const tag = CATEGORY_TO_TAG[category] ?? category
          results = await fetchDevtoPage(tag, page, controller.signal)
          total = 100
        }

        setArticles(results)
        setTotalResults(total)
        cache.current.set(key, { articles: results, totalResults: total })
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError('Failed to load articles. Please try again.')
        setArticles([])
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => controller.abort()
  }, [category, page, retryKey])

  return { articles, loading, error, totalResults }
}
