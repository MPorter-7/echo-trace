import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from './SectionHeading'

const FAQS = [
  {
    q: 'What is EchoTrace?',
    a: 'EchoTrace is a private workspace for recovering your own digital history. It helps you find, review, and organize the accounts, messages, and milestones from your online past, and keep or export the results.',
  },
  {
    q: 'Who is EchoTrace for?',
    a: 'Anyone who wants to reconstruct their own online history — for example after losing access to old accounts, wanting a personal archive, or simply trying to remember what you signed up for over the years. It is only for researching your own history, not other people.',
  },
  {
    q: 'What kind of information can I recover?',
    a: 'Old email and web accounts, forum and social profiles under former usernames, newsletter sign-ups, and personal milestones. You start from things you already know and evidence you authorize, such as your email history or a data export.',
  },
  {
    q: 'Do I have control over my information?',
    a: 'Yes. Nothing is added to your history automatically. Every possible match waits for you to accept, reject, or flag it as uncertain, and each one keeps its source so you can check it.',
  },
  {
    q: 'Can I delete my data?',
    a: 'Yes. You can delete any individual record or file, wipe all of your application data at once, or permanently delete your account. You can also export everything to JSON or CSV first.',
  },
  {
    q: 'Is EchoTrace a people-search service?',
    a: 'No. EchoTrace is not a people-search, background-check, surveillance, or location-tracking tool, and it has no facial recognition or automated scraping. It is designed for recovering your own history and nothing else.',
  },
  {
    q: 'How is my email history handled?',
    a: 'You import a mailbox or Google Takeout export, and it is analyzed locally in your browser. Only the aggregate findings you choose to keep are saved — never raw messages, addresses, or credentials.',
  },
  {
    q: 'How do I get started?',
    a: 'Create your workspace with an email and password, confirm your email, and follow the guided recovery steps. Your verified email automatically becomes your first piece of evidence.',
  },
]

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-20 bg-midnight py-20 md:scroll-mt-24 md:py-28">
      <div className="mx-auto max-w-content px-5 md:px-10 lg:px-20">
        <SectionHeading eyebrow="FAQ" title="Questions people ask first" align="center" />

        <Reveal className="mx-auto mt-12 max-w-3xl">
          <ul className="divide-y divide-night-border rounded-2xl border border-night-border bg-night-raised">
            {FAQS.map((item, index) => {
              const isOpen = open === index
              return (
                <li key={item.q}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${index}`}
                      id={`faq-trigger-${index}`}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-body-m font-medium text-white"
                    >
                      {item.q}
                      <ChevronDown
                        size={18}
                        aria-hidden="true"
                        className={`shrink-0 text-cyan-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${index}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${index}`}
                    hidden={!isOpen}
                    className="px-5 pb-5 text-body-s leading-relaxed text-slate-400"
                  >
                    {item.a}
                  </div>
                </li>
              )
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
