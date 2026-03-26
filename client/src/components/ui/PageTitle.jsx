export default function PageTitle({
  title,
  subtitle,
  actions,
  breadcrumb,
  className = '',
}) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumb && (
        <nav className="mb-2 flex items-center gap-1.5 text-sm text-ent-muted">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <svg className="h-3.5 w-3.5 text-ent-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-action-blue">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-ent-text">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ent-text lg:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-ent-muted">{subtitle}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
