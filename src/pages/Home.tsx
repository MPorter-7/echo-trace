import { useState } from 'react'
import { AccessModal } from '../components/AccessModal'
import { Navigation } from '../components/Navigation'
import { useLenis } from '../hooks/useLenis'
import { Hero } from '../sections/Hero'
import { TrustBar } from '../sections/TrustBar'
import { HowItWorks } from '../sections/HowItWorks'
import { FeatureGrid } from '../sections/FeatureGrid'
import { ExploreDemo } from '../sections/ExploreDemo'
import { PricingSection } from '../sections/PricingSection'
import { PrivacySection } from '../sections/PrivacySection'
import { FaqSection } from '../sections/FaqSection'
import { FinalCta } from '../sections/FinalCta'
import { Footer } from '../sections/Footer'

export function Home() {
  useLenis()
  const [accessOpen, setAccessOpen] = useState(false)
  const openWaitlist = () => setAccessOpen(true)

  return (
    <div className="relative min-h-screen bg-midnight text-slate-100">
      <Navigation onRequestAccess={openWaitlist} />
      <main>
        <Hero onRequestAccess={openWaitlist} />
        <TrustBar />
        <HowItWorks />
        <FeatureGrid />
        <ExploreDemo />
        <PricingSection />
        <PrivacySection />
        <FaqSection />
        <FinalCta onRequestAccess={openWaitlist} />
      </main>
      <Footer />
      <AccessModal open={accessOpen} onClose={() => setAccessOpen(false)} />
    </div>
  )
}
