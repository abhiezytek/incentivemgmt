const STATUS_COLORS = {
  success: 'bg-[#16A34A]',
  processed: 'bg-[#16A34A]',
  error: 'bg-ent-error',
  exception: 'bg-ent-error',
  warning: 'bg-ent-hold',
  hold: 'bg-ent-hold',
  pending: 'bg-ent-muted',
  active: 'bg-action-blue',
}

export default function TimelineList({ items = [], className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {items.map((item, i) => {
        const dotColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending
        const isLast = i === items.length - 1

        return (
          <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Line + dot */}
            <div className="flex flex-col items-center">
              <div className={`h-3 w-3 shrink-0 rounded-full ${dotColor}`} />
              {!isLast && (
                <div className="w-px flex-1 bg-ent-border" />
              )}
            </div>

            {/* Content */}
            <div className="-mt-0.5 min-w-0 flex-1">
              <p className="text-xs text-ent-muted">{item.timestamp}</p>
              <p className="mt-0.5 text-sm font-medium text-ent-text">
                {item.title}
              </p>
              {item.description && (
                <p className="mt-0.5 text-sm text-ent-muted">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
