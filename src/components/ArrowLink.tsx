interface ArrowLinkProps {
  text: string
  href?: string
  className?: string
  light?: boolean
  onClick?: () => void
}

export function ArrowLink({ text, href = '#', className = '', light = false, onClick }: ArrowLinkProps) {
  const textColor = light ? 'text-bone' : 'text-ink'
  const hoverColor = light ? 'hover:text-gold' : 'hover:text-gold'
  
  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-body-s font-medium ${textColor} ${hoverColor} transition-colors duration-200 group ${className}`}
    >
      {text}
      <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
        →
      </span>
    </a>
  )
}
