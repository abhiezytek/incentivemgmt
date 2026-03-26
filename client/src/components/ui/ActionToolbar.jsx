export default function ActionToolbar({ children, leftContent, className = '' }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border border-ent-border bg-ent-surface px-4 py-2.5 ${className}`}
    >
      <div className="text-sm text-ent-muted">{leftContent}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
