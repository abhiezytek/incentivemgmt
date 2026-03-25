const VARIANT_CLASSES = {
  blue: 'bg-primary-50 text-primary',
  green: 'bg-green-50 text-success',
  yellow: 'bg-amber-50 text-warning',
  red: 'bg-red-50 text-error',
  grey: 'bg-gray-100 text-accent',
}

export default function Badge({
  children,
  variant = 'blue',
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.blue}
        ${className}`}
    >
      {children}
    </span>
  )
}
