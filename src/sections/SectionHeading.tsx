import { Reveal } from '../components/Reveal'

interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  align?: 'left' | 'center'
}

export function SectionHeading({ eyebrow, title, description, align = 'left' }: SectionHeadingProps) {
  const centered = align === 'center'
  return (
    <Reveal className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="text-label uppercase tracking-[0.16em] text-cyan-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-body-l text-slate-400 ${centered ? 'mx-auto' : ''}`}>{description}</p>
      )}
    </Reveal>
  )
}
