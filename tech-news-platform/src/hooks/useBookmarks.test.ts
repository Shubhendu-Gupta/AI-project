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
