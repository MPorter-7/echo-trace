import { Laptop, ListChecks, DownloadCloud, ShieldOff } from 'lucide-react'

const ITEMS = [
  { icon: Laptop, label: 'Imports analyzed in your browser' },
  { icon: ListChecks, label: 'You approve every record' },
  { icon: DownloadCloud, label: 'Export or delete anytime' },
  { icon: ShieldOff, label: 'No people-search, no tracking' },
]

export function TrustBar() {
  return (
    <section className="border-y border-night-border bg-night">
      <div className="mx-auto grid max-w-content grid-cols-2 gap-x-6 gap-y-4 px-5 py-6 md:grid-cols-4 md:px-10 lg:px-20">
        {ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5">
            <Icon size={16} className="shrink-0 text-cyan-300" aria-hidden="true" />
            <span className="text-body-s text-slate-300">{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
