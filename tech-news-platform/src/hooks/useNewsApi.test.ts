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
