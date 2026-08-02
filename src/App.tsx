import { useState } from 'react'
import { useLenis } from './hooks/useLenis'
import { Navigation } from './components/Navigation'
import { AccessModal } from './components/AccessModal'
import { HeroClip } from './sections/HeroClip'
import { MainSection } from './sections/MainSection'
import { OverviewSection } from './sections/OverviewSection'
import { FeaturesSection } from './sections/FeaturesSection'
import { StatsSection } from './sections/StatsSection'
import { SecuritySection } from './sections/SecuritySection'
import { Footer } from './sections/Footer'

function App() {
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
        <SecuritySection />
      </main>
      <Footer onRequestAccess={() => setAccessOpen(true)} />
      <AccessModal open={accessOpen} onClose={() => setAccessOpen(false)} />
    </div>
  )
}

export default App
