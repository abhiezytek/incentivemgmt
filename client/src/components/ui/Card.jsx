export default function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface shadow-sm border-l-4 border-l-primary ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-text-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
