import { useState } from 'react'
import { AccessModal } from '../components/AccessModal'
import { Navigation } from '../components/Navigation'
import { useLenis } from '../hooks/useLenis'
import { FeaturesSection } from '../sections/FeaturesSection'
import { Footer } from '../sections/Footer'
import { HeroClip } from '../sections/HeroClip'
import { MainSection } from '../sections/MainSection'
import { OverviewSection } from '../sections/OverviewSection'
import { PricingSection } from '../sections/PricingSection'
import { SecuritySection } from '../sections/SecuritySection'
import { StatsSection } from '../sections/StatsSection'

export function Home() {
  useLenis()
  const [accessOpen, setAccessOpen] = useState(false)

  return (
    <div className="relative">
      <Navigation onRequestAccess={() => setAccessOpen(true)} />
      <main>
        <HeroClip />
        <MainSection />
        <OverviewSection />
        <FeaturesSection />
        <StatsSection />
        <PricingSection />
        <SecuritySection />
      </main>
      <Footer onRequestAccess={() => setAccessOpen(true)} />
      <AccessModal open={accessOpen} onClose={() => setAccessOpen(false)} />
    </div>
  )
}
