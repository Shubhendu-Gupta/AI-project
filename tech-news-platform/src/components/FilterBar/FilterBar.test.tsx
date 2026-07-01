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
