import LoadingSpinner from './LoadingSpinner'
import EmptyState from './EmptyState'

export default function Table({
  columns = [],
  data = [],
  loading = false,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data.length) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className={`overflow-auto rounded-lg border border-border ${className}`}>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-primary text-white">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-4 py-3 font-semibold"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-t border-border transition-colors
                ${idx % 2 === 0 ? 'bg-surface' : 'bg-background'}
                hover:bg-primary-50
                ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-text-primary">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
