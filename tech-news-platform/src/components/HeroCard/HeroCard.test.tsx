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
