export const inputClass = 'mt-2 w-full border border-ink/20 bg-white px-4 py-3 text-body-m text-ink outline-none transition placeholder:text-ink/35 focus:border-gold focus:ring-2 focus:ring-gold/25 disabled:opacity-60'
export const labelClass = 'block text-body-s font-medium text-ink'
export const primaryButtonClass = 'inline-flex items-center justify-center rounded-pill bg-ink px-6 py-3 text-body-s font-medium text-bone transition hover:bg-gold hover:text-ink focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:cursor-wait disabled:opacity-55'
export const secondaryButtonClass = 'inline-flex items-center justify-center rounded-pill border border-ink/20 bg-white px-5 py-2.5 text-body-s font-medium text-ink transition hover:border-ink/50 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-55'

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={labelClass} htmlFor={htmlFor}>
      {label}
      {children}
      {hint && <span className="mt-1 block text-micro font-normal text-ink/50">{hint}</span>}
    </label>
  )
}
