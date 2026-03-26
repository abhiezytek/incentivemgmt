const VARIANTS = {
  processed: 'bg-[#7AD67A]/20 text-[#16A34A]',
  success: 'bg-[#7AD67A]/20 text-[#16A34A]',
  hold: 'bg-[#D6A15C]/20 text-[#7A3E00]',
  manual: 'bg-[#D6A15C]/20 text-[#7A3E00]',
  exception: 'bg-red-100 text-[#DC2626]',
  error: 'bg-red-100 text-[#DC2626]',
  pending: 'bg-gray-100 text-gray-600',
  active: 'bg-[#1D4ED8]/10 text-[#1D4ED8]',
}

export default function StatusPill({ status = 'pending', children, className = '' }) {
  const variant = VARIANTS[status] || VARIANTS.pending

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variant} ${className}`}
    >
      {children || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
