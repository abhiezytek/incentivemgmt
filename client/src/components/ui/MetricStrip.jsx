export default function MetricStrip({ metrics = [], className = '' }) {
  return (
    <div
      className={`flex flex-wrap items-center divide-x divide-ent-border rounded-xl border border-ent-border bg-ent-surface ${className}`}
    >
      {metrics.map((metric, i) => (
        <div
          key={i}
          className="flex flex-col gap-0.5 px-5 py-3"
        >
          <span className="text-xs text-ent-muted">{metric.label}</span>
          <span
            className="text-lg font-bold"
            style={metric.color ? { color: metric.color } : undefined}
          >
            {metric.value}
          </span>
        </div>
      ))}
    </div>
  )
}
