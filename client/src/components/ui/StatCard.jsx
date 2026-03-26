const COLOR_MAP = {
  blue: 'text-action-blue bg-[#1D4ED8]/10',
  green: 'text-success bg-[#7AD67A]/20',
  yellow: 'text-[#7A3E00] bg-[#D6A15C]/20',
  red: 'text-ent-error bg-red-50',
  grey: 'text-ent-muted bg-gray-100',
}

const ACCENT_MAP = {
  blue: 'border-l-action-blue',
  green: 'border-l-ent-success',
  yellow: 'border-l-ent-hold',
  red: 'border-l-ent-error',
  grey: 'border-l-ent-muted',
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'blue',
  className = '',
  accentColor,
}) {
  const iconColors = COLOR_MAP[color] || COLOR_MAP.blue
  const accent = accentColor ? (ACCENT_MAP[accentColor] || '') : ''

  return (
    <div
      className={`relative flex items-start gap-4 rounded-xl border border-ent-border bg-ent-surface p-5 shadow-sm ${accent ? `border-l-4 ${accent}` : ''} ${className}`}
    >
      {icon && (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconColors}`}
        >
          {icon}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-ent-muted">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-ent-text">{value}</p>
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
              className="h-4 w-4 text-ent-error"
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
              Number(trend) >= 0 ? 'text-success' : 'text-ent-error'
            }`}
          >
            {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
  )
}
