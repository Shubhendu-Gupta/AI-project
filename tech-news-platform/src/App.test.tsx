import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the header logo', () => {
    render(<App />)
    expect(screen.getByText('Tech News')).toBeInTheDocument()
  })

  it('renders filter tabs', () => {
    render(<App />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('HackerNews')).toBeInTheDocument()
  })

  it('shows loading skeletons initially', () => {
    render(<App />)
    // skeletons are shown while loading
    const skeletons = document.querySelectorAll('.skeleton-card')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty state when no articles returned', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('No articles found for this category.')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows error banner and retry button when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load articles. Please try again.')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
