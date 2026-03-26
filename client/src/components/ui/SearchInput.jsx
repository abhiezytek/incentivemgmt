export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ent-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-9 w-full rounded-full border border-ent-border bg-ent-bg pl-9 pr-8 text-sm text-ent-text placeholder:text-ent-muted focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={() => onChange && onChange({ target: { value: '' } })}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ent-muted hover:text-ent-text"
          aria-label="Clear search"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
