import './Pagination.css'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => (
  <div className="pagination">
    <button
      className="pagination-btn"
      disabled={page <= 1}
      onClick={() => onPageChange(page - 1)}
    >
      ← Prev
    </button>
    <span className="pagination-info">Page {page} of {totalPages}</span>
    <button
      className="pagination-btn"
      disabled={page >= totalPages}
      onClick={() => onPageChange(page + 1)}
    >
      Next →
    </button>
  </div>
)
