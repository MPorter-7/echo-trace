interface PillButtonProps {
  text: string
  size?: 'default' | 'large'
  onClick?: () => void
  className?: string
}

export function PillButton({ text, size = 'default', onClick, className = '' }: PillButtonProps) {
  const padding = size === 'large' ? 'px-8 py-4' : 'px-7 py-3.5'
  const fontSize = size === 'large' ? 'text-body-m' : 'text-body-s'
  
  return (
    <button
      onClick={onClick}
      className={`rounded-pill border border-ink bg-bone text-ink font-medium ${padding} ${fontSize} transition-all duration-300 hover:bg-ink hover:text-bone ${className}`}
    >
      {text}
    </button>
  )
}
