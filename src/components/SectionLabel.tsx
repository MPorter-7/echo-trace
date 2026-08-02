interface SectionLabelProps {
  text: string
}

export function SectionLabel({ text }: SectionLabelProps) {
  return (
    <span className="text-label uppercase text-gold block mb-3">
      {text}
    </span>
  )
}
