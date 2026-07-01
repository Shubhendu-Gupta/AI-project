import { Article } from '../../types/news'
import { getGradient } from '../../utils/gradientPlaceholder'
import { timeAgo } from '../../utils/timeAgo'
import { shareArticle } from '../../utils/share'
import './NewsCard.css'

interface NewsCardProps {
  article: Article
  isBookmarked: boolean
  onBookmark: () => void
}

export const NewsCard = ({ article, isBookmarked, onBookmark }: NewsCardProps) => {
  const handleShare = async () => {
    try {
      await shareArticle(article)
    } catch {
      // share cancelled or failed silently
    }
  }

  return (
    <article className="news-card">
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="news-card-image-link">
        {article.imageUrl ? (
          <img className="news-card-image" src={article.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="news-card-image-placeholder" style={{ background: getGradient(article.title) }} />
        )}
      </a>
      <div className="news-card-body">
        <span className={`news-card-badge news-card-badge--${article.source}`}>
          {article.source === 'hackernews' ? 'HackerNews' : 'Dev.to'}
          {article.tags[0] ? ` · ${article.tags[0]}` : ''}
        </span>
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="news-card-title-link">
          <h2 className="news-card-title">{article.title}</h2>
        </a>
        {article.description ? (
          <p className="news-card-description">{article.description}</p>
        ) : (
          <p className="news-card-hn-meta">
            {article.score} points{article.commentCount != null ? ` · ${article.commentCount} comments` : ''}
          </p>
        )}
        <div className="news-card-footer">
          <div className="news-card-meta">
            {article.author && <span className="news-card-author">{article.author}</span>}
            <span className="news-card-time">{timeAgo(article.publishedAt)}</span>
          </div>
          <div className="news-card-actions">
            <button className="news-card-action" onClick={handleShare} aria-label="Share article" title="Share">
              ↗
            </button>
            <button
              className={`news-card-action${isBookmarked ? ' bookmarked' : ''}`}
              onClick={onBookmark}
              aria-label="Bookmark article"
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {isBookmarked ? '★' : '☆'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
