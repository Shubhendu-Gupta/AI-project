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
