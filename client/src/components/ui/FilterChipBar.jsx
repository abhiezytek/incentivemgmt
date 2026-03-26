export default function FilterChipBar({ filters = [], onToggle, className = '' }) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto pb-1 ${className}`}
      role="toolbar"
      aria-label="Filters"
    >
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onToggle && onToggle(filter.key)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            filter.active
              ? 'bg-action-blue text-white'
              : 'border border-ent-border bg-ent-surface text-ent-muted hover:border-action-blue hover:text-action-blue'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
