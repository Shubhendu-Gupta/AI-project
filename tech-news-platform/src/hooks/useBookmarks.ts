import { useState, useEffect } from 'react'
import { Article } from '../types/news'

const STORAGE_KEY = 'tech-news-bookmarks'

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Article[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
  }, [bookmarks])

  const toggle = (article: Article) => {
    setBookmarks(prev =>
      prev.some(b => b.id === article.id)
        ? prev.filter(b => b.id !== article.id)
        : [article, ...prev]
    )
  }

  const isBookmarked = (id: string) => bookmarks.some(b => b.id === id)

  return { bookmarks, toggle, isBookmarked }
}
