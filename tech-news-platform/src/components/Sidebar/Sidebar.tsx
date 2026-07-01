import { Article } from '../../types/news'
import { timeAgo } from '../../utils/timeAgo'
import './Sidebar.css'

interface SidebarProps {
  bookmarks: Article[]
  onRemoveBookmark: (id: string) => void
}

export const Sidebar = ({ bookmarks, onRemoveBookmark }: SidebarProps) => (
  <aside className="sidebar">
    <section className="sidebar-section">
      <h2 className="sidebar-heading">Bookmarks</h2>
      {bookmarks.length === 0 ? (
        <p className="sidebar-empty">No bookmarks yet.</p>
      ) : (
        <ul className="sidebar-list">
          {bookmarks.map(article => (
            <li key={article.id} className="sidebar-item">
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="sidebar-item-title">
                {article.title}
              </a>
              <div className="sidebar-item-meta">
                <span className="sidebar-item-source">
                  {article.source === 'hackernews' ? 'HN' : 'Dev.to'}
                </span>
                <span className="sidebar-item-time">{timeAgo(article.publishedAt)}</span>
                <button
                  className="sidebar-remove"
                  onClick={() => onRemoveBookmark(article.id)}
                  aria-label="Remove bookmark"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  </aside>
)
