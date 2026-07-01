export type ArticleSource = 'hackernews' | 'devto'

export interface Article {
  id: string
  source: ArticleSource
  title: string
  description: string | null
  url: string
  imageUrl: string | null
  author: string | null
  authorImage: string | null
  publishedAt: string
  tags: string[]
  score: number
  commentCount: number | null
}

export type Category = 'all' | 'hackernews' | 'devto' | 'ai' | 'security' | 'webdev' | 'career'
