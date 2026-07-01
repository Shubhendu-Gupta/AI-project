import { useState, useMemo } from 'react'
import { useNewsApi } from './hooks/useNewsApi'
import { useBookmarks } from './hooks/useBookmarks'
import { Category } from './types/news'
import { Header } from './components/Header/Header'
import { FilterBar } from './components/FilterBar/FilterBar'
import { HeroCard } from './components/HeroCard/HeroCard'
import { NewsCard } from './components/NewsCard/NewsCard'
import { SkeletonCard } from './components/SkeletonCard/SkeletonCard'
import { Pagination } from './components/Pagination/Pagination'
import { Sidebar } from './components/Sidebar/Sidebar'
import './App.css'

const PAGE_SIZE = 10

const App = () => {
  const [category, setCategory] = useState<Category>('all')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const { articles, loading, error, totalResults } = useNewsApi(category, page, retryKey)
  const { bookmarks, toggle, isBookmarked } = useBookmarks()

  const filtered = useMemo(() => {
    if (!search.trim()) return articles
    const q = search.toLowerCase()
    return articles.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false)
    )
  }, [articles, search])

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat)
    setPage(1)
    setSearch('')
  }

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const hero = filtered[0]
  const gridArticles = filtered.slice(1)

  return (
    <div className="app">
      <Header search={search} onSearchChange={setSearch} />
      <FilterBar active={category} onChange={handleCategoryChange} />
      <main className="app-main">
        {error && (
          <div className="app-error">
            <span>{error}</span>
            <button
              className="app-error-retry"
              onClick={() => setRetryKey(k => k + 1)}
            >
              Retry
            </button>
          </div>
        )}
        <div className="app-layout">
          <div className="app-content">
            {loading ? (
              <>
                <div className="app-hero-skeleton">
                  <SkeletonCard />
                </div>
                <div className="app-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </>
            ) : filtered.length === 0 ? (
              <div className="app-empty">
                <p>{search.trim() ? 'No articles match your search.' : 'No articles found for this category.'}</p>
                <p>Try a different filter or search term.</p>
              </div>
            ) : (
              <>
                {hero && (
                  <HeroCard
                    article={hero}
                    isBookmarked={isBookmarked(hero.id)}
                    onBookmark={() => toggle(hero)}
                  />
                )}
                <div className="app-grid">
                  {gridArticles.map(article => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      isBookmarked={isBookmarked(article.id)}
                      onBookmark={() => toggle(article)}
                    />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
          <div className="app-sidebar">
            <Sidebar
              bookmarks={bookmarks}
              onRemoveBookmark={id => {
                const article = bookmarks.find(b => b.id === id)
                if (article) toggle(article)
              }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
