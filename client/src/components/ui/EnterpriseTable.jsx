export default function EnterpriseTable({
  columns = [],
  data = [],
  loading = false,
  onRowClick,
  emptyMessage = 'No data available',
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  className = '',
}) {
  const allSelected =
    data.length > 0 && selectedRows.length === data.length

  function handleSelectAll() {
    if (!onSelectionChange) return
    onSelectionChange(allSelected ? [] : data.map((_, i) => i))
  }

  function handleSelectRow(index) {
    if (!onSelectionChange) return
    onSelectionChange(
      selectedRows.includes(index)
        ? selectedRows.filter((i) => i !== index)
        : [...selectedRows, index]
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ent-border bg-ent-bg">
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-ent-border text-action-blue"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ent-muted"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-4 py-12 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-ent-muted">
                  <svg
                    className="h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Loading…
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-4 py-12 text-center text-ent-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, ri) => (
              <tr
                key={ri}
                onClick={onRowClick ? () => onRowClick(row, ri) : undefined}
                className={`border-b border-ent-border transition-colors last:border-b-0 hover:bg-ent-bg ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${selectedRows.includes(ri) ? 'bg-[#1D4ED8]/5' : 'bg-ent-surface'}`}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(ri)}
                      onChange={() => handleSelectRow(ri)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-ent-border text-action-blue"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-ent-text">
                    {col.render ? col.render(row[col.key], row, ri) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
