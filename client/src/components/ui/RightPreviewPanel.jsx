export default function RightPreviewPanel({
  open = false,
  onClose,
  title,
  children,
  width = 400,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative flex h-full flex-col bg-ent-surface shadow-xl"
        style={{ width: `min(${width}px, 100vw)` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ent-border px-5 py-4">
          <h2 className="text-base font-semibold text-ent-text">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ent-muted hover:bg-ent-bg hover:text-ent-text"
            aria-label="Close panel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
