import { Article } from '../../types/news'
import { getGradient } from '../../utils/gradientPlaceholder'
import { timeAgo } from '../../utils/timeAgo'
import { shareArticle } from '../../utils/share'
import './HeroCard.css'

interface HeroCardProps {
  article: Article
  isBookmarked: boolean
  onBookmark: () => void
}

export const HeroCard = ({ article, isBookmarked, onBookmark }: HeroCardProps) => {
  const handleShare = async () => {
    try {
      await shareArticle(article)
    } catch {
      // share cancelled or failed silently
    }
  }

  return (
    <article className="hero-card">
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="hero-card-image-link">
        {article.imageUrl ? (
          <img className="hero-card-image" src={article.imageUrl} alt="" />
        ) : (
          <div className="hero-card-image-placeholder" style={{ background: getGradient(article.title) }} />
        )}
      </a>
      <div className="hero-card-body">
        <span className={`hero-card-badge hero-card-badge--${article.source}`}>
          {article.source === 'hackernews' ? 'HackerNews' : 'Dev.to'}
          {article.tags[0] ? ` · ${article.tags[0]}` : ''}
        </span>
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hero-card-title-link">
          <h1 className="hero-card-title">{article.title}</h1>
        </a>
        {article.description && (
          <p className="hero-card-description">{article.description}</p>
        )}
        <div className="hero-card-footer">
          <div className="hero-card-meta">
            {article.author && <span className="hero-card-author">{article.author}</span>}
            <span className="hero-card-time">{timeAgo(article.publishedAt)}</span>
          </div>
          <div className="hero-card-actions">
            <button className="hero-card-action" onClick={handleShare} aria-label="Share article">↗ Share</button>
            <button
              className={`hero-card-action${isBookmarked ? ' bookmarked' : ''}`}
              onClick={onBookmark}
              aria-label="Bookmark article"
            >
              {isBookmarked ? '★' : '☆'} {isBookmarked ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
