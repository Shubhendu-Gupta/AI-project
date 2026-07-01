import './Header.css'

interface HeaderProps {
  search: string
  onSearchChange: (value: string) => void
}

export const Header = ({ search, onSearchChange }: HeaderProps) => (
  <header className="header">
    <div className="header-inner">
      <div className="header-logo">Tech News</div>
      <input
        className="header-search"
        type="search"
        placeholder="Search articles..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
      />
    </div>
  </header>
)
