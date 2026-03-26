export default function SectionCard({
  sectionLabel,
  title,
  subtitle,
  action,
  children,
  noPadding = false,
  className = '',
}) {
  const hasHeader = sectionLabel || title || action

  return (
    <div
      className={`rounded-xl border border-ent-border bg-ent-surface shadow-sm ${className}`}
    >
      {hasHeader && (
        <div className="flex flex-col gap-1 border-b border-ent-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {sectionLabel && (
              <p className="text-xs font-semibold uppercase tracking-wider text-ent-muted">
                {sectionLabel}
              </p>
            )}
            {title && (
              <h3 className={`text-base font-semibold text-ent-text ${sectionLabel ? 'mt-1' : ''}`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-ent-muted">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  )
}
