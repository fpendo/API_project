import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import HeroSection from './HeroSection'
import ProblemSection from './ProblemSection'
import SolutionSection from './SolutionSection'
import ForRegulatorsSection from './ForRegulatorsSection'
import ForDevelopersSection from './ForDevelopersSection'
import ForLandownersSection from './ForLandownersSection'
import ForPlanningSection from './ForPlanningSection'
import TechnologySection from './TechnologySection'
import HowItWorksSection from './HowItWorksSection'
import PricingSection from './PricingSection'
import TrustSection from './TrustSection'
import CTASection from './CTASection'
import Footer from './Footer'
import Navbar from './Navbar'

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  })

  // Progress bar width based on scroll
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <div ref={containerRef} className="relative bg-background-deep">
      {/* Progress bar */}
      <motion.div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-accent-primary to-accent-secondary z-50"
        style={{ width: progressWidth }}
      />
      
      {/* Navigation */}
      <Navbar />
      
      {/* Main content */}
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <ForRegulatorsSection />
        <ForDevelopersSection />
        <ForLandownersSection />
        <ForPlanningSection />
        <TechnologySection />
        <HowItWorksSection />
        <PricingSection />
        <TrustSection />
        <CTASection />
      </main>
      
      <Footer />
    </div>
  )
}

