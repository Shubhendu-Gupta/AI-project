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
