import { shareArticle } from './share'
import { Article } from '../types/news'

const mockArticle: Article = {
  id: '1',
  source: 'devto',
  title: 'Test Article',
  description: null,
  url: 'https://example.com/test',
  imageUrl: null,
  author: null,
  authorImage: null,
  publishedAt: '2026-07-01T00:00:00Z',
  tags: [],
  score: 0,
  commentCount: null,
}

describe('shareArticle', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses navigator.share when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true })
    await shareArticle(mockArticle)
    expect(shareMock).toHaveBeenCalledWith({ title: mockArticle.title, url: mockArticle.url })
  })

  it('falls back to clipboard when navigator.share is unavailable', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    const clipboardMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: clipboardMock }, configurable: true })
    await shareArticle(mockArticle)
    expect(clipboardMock).toHaveBeenCalledWith(mockArticle.url)
  })

  it('does not throw when share fails', async () => {
    const shareMock = vi.fn().mockRejectedValue(new Error('User cancelled'))
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true })
    await expect(shareArticle(mockArticle)).resolves.not.toThrow()
  })
})
