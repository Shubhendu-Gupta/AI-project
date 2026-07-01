import { Category } from '../../types/news'
import './FilterBar.css'

const TABS: { label: string; value: Category }[] = [
  { label: 'All', value: 'all' },
  { label: 'HackerNews', value: 'hackernews' },
  { label: 'Dev.to', value: 'devto' },
  { label: 'AI', value: 'ai' },
  { label: 'Security', value: 'security' },
  { label: 'Web Dev', value: 'webdev' },
  { label: 'Career', value: 'career' },
]

interface FilterBarProps {
  active: Category
  onChange: (category: Category) => void
}

export const FilterBar = ({ active, onChange }: FilterBarProps) => (
  <nav className="filter-bar">
    <div className="filter-bar-inner">
      {TABS.map(tab => (
        <button
          key={tab.value}
          className={`filter-tab${active === tab.value ? ' active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </nav>
)
