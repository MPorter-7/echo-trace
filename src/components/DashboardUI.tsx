import { X } from 'lucide-react'
import { useState } from 'react'

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div><p className="text-label uppercase text-gold">{eyebrow}</p><h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-body-m text-ink/60">{description}</p></div>
      {action}
    </header>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="border border-dashed border-ink/20 bg-white px-6 py-14 text-center"><h2 className="text-xl font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-body-s text-ink/55">{description}</p>{action && <div className="mt-6">{action}</div>}</div>
}

export function Modal({ title, description, onClose, children, wide = false }: { title: string; description?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[300] overflow-y-auto bg-ink/60 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`relative mx-auto border border-ink/10 bg-bone p-6 shadow-2xl md:p-9 ${wide ? 'max-w-4xl' : 'max-w-xl'}`}>
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded p-2 text-ink/50 hover:bg-mist hover:text-ink" aria-label="Close"><X size={20} /></button>
        <h2 id="modal-title" className="pr-10 text-3xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-2 text-body-s text-ink/55">{description}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmButton({ label, confirmLabel = 'Click again to confirm', onConfirm, className = '' }: { label: string; confirmLabel?: string; onConfirm: () => void | Promise<void>; className?: string }) {
  const [confirming, setConfirming] = useState(false)
  return <button type="button" className={className} onClick={() => { if (confirming) void onConfirm(); else { setConfirming(true); window.setTimeout(() => setConfirming(false), 4000) } }}>{confirming ? confirmLabel : label}</button>
}
