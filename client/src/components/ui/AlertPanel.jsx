const VARIANT_STYLES = {
  info: {
    container: 'border-action-blue/30 bg-[#1D4ED8]/5',
    icon: 'text-action-blue',
    title: 'text-action-blue',
  },
  success: {
    container: 'border-[#16A34A]/30 bg-[#7AD67A]/10',
    icon: 'text-[#16A34A]',
    title: 'text-[#16A34A]',
  },
  warning: {
    container: 'border-[#D6A15C]/30 bg-[#D6A15C]/10',
    icon: 'text-[#7A3E00]',
    title: 'text-[#7A3E00]',
  },
  error: {
    container: 'border-ent-error/30 bg-red-50',
    icon: 'text-ent-error',
    title: 'text-ent-error',
  },
}

const ICONS = {
  info: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
  success: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
}

export default function AlertPanel({
  variant = 'info',
  title,
  message,
  action,
  onDismiss,
  className = '',
}) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.info

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 ${styles.container} ${className}`}
      role="alert"
    >
      <span className={`shrink-0 ${styles.icon}`}>
        {ICONS[variant] || ICONS.info}
      </span>

      <div className="min-w-0 flex-1">
        {title && (
          <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
        )}
        {message && (
          <p className={`text-sm text-ent-text ${title ? 'mt-0.5' : ''}`}>
            {message}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-ent-muted hover:bg-black/5 hover:text-ent-text"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
