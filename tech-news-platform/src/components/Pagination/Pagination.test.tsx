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
