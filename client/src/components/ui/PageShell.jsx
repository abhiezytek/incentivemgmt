export default function PageShell({ children, className = '' }) {
  return (
    <div className={`min-h-full bg-ent-bg p-6 lg:p-8 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  )
}
