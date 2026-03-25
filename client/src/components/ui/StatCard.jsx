const COLOR_MAP = {
  blue: 'text-primary bg-primary-50',
  green: 'text-success bg-green-50',
  yellow: 'text-warning bg-amber-50',
  red: 'text-error bg-red-50',
  grey: 'text-accent bg-gray-100',
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'blue',
  className = '',
}) {
  const iconColors = COLOR_MAP[color] || COLOR_MAP.blue

  return (
    <div
      className={`relative flex items-start gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm ${className}`}
    >
      {icon && (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconColors}`}
        >
          {icon}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
      </div>

      {trend !== undefined && trend !== null && (
        <div className="absolute right-4 top-4 flex items-center gap-0.5">
          {Number(trend) >= 0 ? (
            <svg
              className="h-4 w-4 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
          <span
            className={`text-xs font-medium ${
              Number(trend) >= 0 ? 'text-success' : 'text-error'
            }`}
          >
            {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
  )
}
