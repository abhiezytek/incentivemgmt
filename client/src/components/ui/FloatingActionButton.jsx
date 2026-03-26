export default function FloatingActionButton({
  onClick,
  icon,
  label,
  className = '',
}) {
  return (
    <button
      onClick={onClick}
      className={`group fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-action-blue p-4 text-white shadow-lg transition-all hover:bg-[#1E2A78] hover:shadow-xl active:scale-95 ${className}`}
      aria-label={label || 'Action'}
    >
      {icon || (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      )}
      {label && (
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all group-hover:max-w-xs group-hover:opacity-100">
          {label}
        </span>
      )}
    </button>
  )
}
