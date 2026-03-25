export default function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
}) {
  return (
    <div className={`mb-6 flex flex-wrap items-center justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
