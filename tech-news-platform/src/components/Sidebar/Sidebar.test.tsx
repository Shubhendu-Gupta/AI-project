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
