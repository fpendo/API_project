import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Eye,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Globe,
  Building2,
  Users,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Play,
  Layers,
  Target,
  LineChart,
  Database,
  Lock,
  Clock,
  Menu,
  X,
  Quote,
  AlertTriangle,
  Unlock,
  FileText,
  Bell,
  ChevronDown,
  Briefcase
} from 'lucide-react'
import InvestorLoginModal from '../components/InvestorLoginModal'

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showInvestorModal, setShowInvestorModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  const staggerChildren = {
    initial: {},
    animate: { transition: { staggerChildren: 0.1 } }
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-dark-950/90 backdrop-blur-xl border-b border-white/5' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold">ET Analytics</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="#problem" className="text-gray-400 hover:text-white transition-colors text-sm">Problem</a>
              <a href="#solution" className="text-gray-400 hover:text-white transition-colors text-sm">Solution</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</a>
              <Link to="/demo-login" className="text-gray-400 hover:text-white transition-colors text-sm">Demo</Link>
              <button
                onClick={() => setShowInvestorModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/30 hover:border-amber-500/60 transition-all text-sm font-semibold shadow-lg shadow-amber-500/10"
              >
                <Briefcase className="w-4 h-4" />
                Investor Pack
              </button>
              <Link to="/signup" className="btn-primary flex items-center gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <button 
              className="md:hidden text-gray-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-dark-900 border-b border-white/5 px-6 py-4"
          >
            <div className="flex flex-col gap-4">
              <a href="#problem" className="text-gray-400 hover:text-white">The Problem</a>
              <a href="#solution" className="text-gray-400 hover:text-white">Solution</a>
              <a href="#how-it-works" className="text-gray-400 hover:text-white">How It Works</a>
              <a href="#pricing" className="text-gray-400 hover:text-white">Pricing</a>
              <Link to="/demo-login" className="text-gray-400 hover:text-white">Try Demo</Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  setShowInvestorModal(true)
                }}
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300"
              >
                <Briefcase className="w-4 h-4" />
                Investor Pack
              </button>
              <Link to="/signup" className="btn-primary text-center">Get Started</Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Investor Login Modal */}
      <InvestorLoginModal
        isOpen={showInvestorModal}
        onClose={() => setShowInvestorModal(false)}
        onSuccess={() => {
          setShowInvestorModal(false)
          navigate('/investors')
        }}
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute inset-0 grid-bg" />
        
        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm mb-8">
              <Unlock className="w-4 h-4" />
              <span>Unlock Your Beneficial Ownership Data</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              Know Your Investors.
              <br />
              <span className="gradient-text">Grow Your Assets.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-400 max-w-4xl mx-auto mb-12">
              <span className="text-white font-medium">We show you who actually holds your ETFs.</span> Wealth managers. Private banks. Institutions. Family offices. 
              Know who's buying, who's selling, where to focus.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link 
                to="/signup" 
                className="btn-primary text-lg px-8 py-4 flex items-center gap-2"
              >
                See Who Owns Your ETFs <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/demo-login" 
                className="btn-secondary text-lg px-8 py-4 flex items-center gap-2"
              >
                <Play className="w-5 h-5" /> Explore Demo <span className="text-gray-500 text-sm ml-1">(No signup)</span>
              </Link>
            </div>

            {/* Stats Row - With Narrative Context */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { value: '$3.1T', label: 'European ETF AUM', subtext: 'Zero visibility into who owns it' },
                { value: '78%', label: 'Irish Domiciled', subtext: 'Covered by statutory disclosure' },
                { value: '93%', label: 'Avg. Discovery', subtext: 'Typical visibility within 90 days' },
                { value: '70+', label: 'ETF Issuers', subtext: 'Could benefit from ownership data' }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="text-center p-4 rounded-xl bg-dark-900/50 border border-white/5"
                >
                  <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">{stat.value}</div>
                  <div className="text-white text-sm font-medium">{stat.label}</div>
                  <div className="text-gray-500 text-xs mt-1">{stat.subtext}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500">
          <span className="text-sm">Discover the problem</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronRight className="w-5 h-5 rotate-90" />
          </motion.div>
        </div>
      </section>

      {/* Problem Section - Quote-Led, Consequence-Focused */}
      <section id="problem" className="relative py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="grid lg:grid-cols-2 gap-16 items-center"
          >
            <motion.div variants={fadeInUp}>
              {/* Opening Quote */}
              <div className="relative mb-8 p-6 rounded-xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20">
                <blockquote className="text-2xl md:text-3xl font-medium text-white mb-4">
                  "My board wants to know who holds our ETFs. I can't give them the full picture."
                </blockquote>
                <p className="text-gray-400 text-sm">— Head of Capital Markets, Top 10 European ETF Issuer</p>
              </div>

              <p className="text-xl text-gray-400 mb-8">
                Most ETF issuers can only see 
                <span className="text-gray-300 font-mono text-base mx-1">CREST</span>, 
                <span className="text-gray-300 font-mono text-base mx-1">EUROCLEAR</span>, and other nominee names. 
                <span className="text-white font-medium"> We reveal the actual investors behind them.</span>
              </p>
              
              <p className="text-lg text-gray-400 mb-8">
                ETAnalytics traces through 3-5 layers of custodians and platforms to identify the 
                <span className="text-white font-medium"> wealth managers, private banks, family offices, and institutions</span> making the allocation decisions.
              </p>

              {/* Consequences - What they CAN'T do */}
              <div className="space-y-4 mb-8">
                <p className="text-sm text-red-400/80 uppercase tracking-wide font-medium">Without ownership visibility, you can't:</p>
                {[
                  'Prove to your board which distribution partnerships are delivering',
                  'Identify institutional relationships worth protecting (or pursuing)',
                  'Segment your investor base for targeted marketing',
                  'Spot concentration risk before it becomes a redemption crisis',
                  'Understand why flows suddenly changed last quarter'
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-gray-300">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Opportunity */}
              <div className="p-4 rounded-xl bg-accent-500/10 border border-accent-500/20">
                <div className="flex items-start gap-3">
                  <Unlock className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300 text-sm">
                    The data exists. The disclosure framework is proven. <span className="text-white font-medium">Issuers who identify their investors are making better capital allocation and distribution decisions.</span> This is your opportunity to join them.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="relative">
              {/* Custody Chain Visualization */}
              <div className="card-glass rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
                
                <h3 className="text-lg font-semibold mb-6 text-gray-300">Your Share Register Shows:</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl border border-primary-500/30">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <div className="font-medium">Your ETF</div>
                      <div className="text-sm text-primary-400">You see this layer</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-gradient-to-b from-purple-500 to-gray-600" />
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl opacity-80">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Database className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium font-mono text-sm">EUROCLEAR BANK NOMINEES</div>
                      <div className="text-sm text-gray-500">Central Securities Depository</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-gradient-to-b from-blue-500 to-gray-600" />
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl opacity-70">
                    <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-medium font-mono text-sm">BNY MELLON NOMINEES</div>
                      <div className="text-sm text-gray-500">Global Custodian</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-gradient-to-b from-yellow-500 to-gray-600" />
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl opacity-60">
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium font-mono text-sm">CACEIS NOMINEES</div>
                      <div className="text-sm text-gray-500">Sub-Custodian</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-gradient-to-b from-green-500 to-gray-600" />
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-accent-500/20 to-primary-500/20 rounded-xl border border-accent-500/30">
                    <div className="w-12 h-12 rounded-lg bg-accent-500/30 flex items-center justify-center">
                      <Target className="w-6 h-6 text-accent-400" />
                    </div>
                    <div>
                      <div className="font-medium text-accent-400 font-mono text-sm">BREWIN DOLPHIN NOMINEES</div>
                      <div className="text-sm text-gray-400">Investment Decision Maker (Wealth Manager)</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20">
                  <p className="text-sm text-center text-primary-400">
                    <span className="font-semibold">ETAnalytics traces the chain</span> to the institutional decision maker — 
                    wealth managers, private banks, family offices, and institutions allocating to your ETF
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Solution Section - Outcome Focused */}
      <section id="solution" className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-50" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm mb-6">
              <Shield className="w-4 h-4" />
              <span>Powered by Irish Statutory Disclosure Rights</span>
            </motion.div>
            
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-6">
              Turn Your Share Register Into <span className="gradient-text">Distribution Strategy</span>
            </motion.h2>
            
            <motion.p variants={fadeInUp} className="text-xl text-gray-400 max-w-3xl mx-auto">
              ETAnalytics is the only platform that operationalizes Irish statutory disclosure rights — 
              automatically identifying institutional allocators (wealth managers, private banks, family offices, asset managers) 
              and tracing custody chains <span className="text-white">so you don't have to.</span>
            </motion.p>
          </motion.div>

          {/* Feature Grid - Outcome Focused */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Database,
                title: 'Know Immediately What You Own',
                description: 'Upload your register. Within minutes, our database of 5,000+ entities identifies wealth managers, private banks, family offices, and institutional allocators.',
                result: '60-70% identified before a single disclosure is sent',
                color: 'primary'
              },
              {
                icon: FileText,
                title: 'We Handle the Paperwork',
                description: 'Irish-domiciled ETFs have statutory rights to request beneficial ownership data. We generate compliant notices, track responses, and reconcile chains.',
                result: 'Full visibility within 90 days, not 9 months',
                color: 'accent'
              },
              {
                icon: Target,
                title: 'See Which Partners Drive Flows',
                description: 'Finally answer the questions your board has been asking: Which wealth managers are growing? Which private banks are net sellers? Which institutions hold significant positions?',
                result: 'Data-driven distribution strategy, not guesswork',
                color: 'primary'
              },
              {
                icon: Bell,
                title: 'Never Be Surprised Again',
                description: 'Track daily changes in known entity holdings. Get alerts when major positions shift. Spot trends before they show up in monthly reports.',
                result: 'Early warning for redemption risk and opportunities',
                color: 'accent'
              },
              {
                icon: Globe,
                title: '78% Market Coverage',
                description: 'Ireland dominates European ETF domicile. One jurisdiction covers the vast majority of the market — and we\'re the experts.',
                result: 'One platform for €2.4T in assets',
                color: 'primary'
              },
              {
                icon: BarChart3,
                title: 'Board-Ready Reports',
                description: 'No more scrambling before quarterly reviews. Export ownership breakdowns, distribution analytics, and trend reports instantly.',
                result: 'Walk into board meetings with answers, not excuses',
                color: 'accent'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-glass card-hover rounded-2xl p-8 flex flex-col"
              >
                <div className={`w-14 h-14 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-7 h-7 text-${feature.color}-400`} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 mb-4 flex-grow">{feature.description}</p>
                <div className={`text-sm font-medium text-${feature.color}-400 pt-4 border-t border-white/10`}>
                  → {feature.result}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - You/We Format */}
      <section id="how-it-works" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-6">
              From Register to <span className="gradient-text">Revenue Intelligence</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-gray-400 max-w-2xl mx-auto">
              We do the heavy lifting. You get the insights.
            </motion.p>
          </motion.div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: '01',
                  title: 'Upload Register',
                  youDo: 'Send us your quarterly share register (CSV from your registrar)',
                  weDo: 'Ingest the data, validate formatting, prepare for analysis',
                  time: '5 minutes',
                  icon: Database
                },
                {
                  step: '02',
                  title: 'Instant Matching',
                  youDo: 'Review automatic match results in your dashboard',
                  weDo: 'Cross-reference every nominee against 5,000+ known entities (wealth managers, private banks, institutions, family offices)',
                  time: 'Minutes (automated)',
                  icon: Target
                },
                {
                  step: '03',
                  title: 'Disclosure Requests',
                  youDo: 'Authorize us to send disclosure notices on your behalf',
                  weDo: 'Generate compliant requests, send to custodians, track responses',
                  time: '2-4 weeks for responses',
                  icon: Shield
                },
                {
                  step: '04',
                  title: 'Ownership Intelligence',
                  youDo: 'Access your dashboard, download reports, brief your board',
                  weDo: 'Reconcile all disclosures, attribute ownership to decision-making institutions, surface key relationships',
                  time: 'Full analysis within 90 days',
                  icon: BarChart3
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative"
                >
                  <div className="card-glass rounded-2xl p-6 h-full">
                    <div className="text-6xl font-bold text-white/5 absolute top-4 right-4">
                      {item.step}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-4 relative z-10">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-4">{item.title}</h3>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-primary-400 font-medium">You:</span>
                        <p className="text-gray-400 mt-1">{item.youDo}</p>
                      </div>
                      <div>
                        <span className="text-accent-400 font-medium">We:</span>
                        <p className="text-gray-400 mt-1">{item.weDo}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-500">{item.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-dark-800 border border-white/10">
              <Lock className="w-5 h-5 text-accent-400" />
              <span className="text-gray-400 text-sm">
                Your data is encrypted, never shared, and you retain full ownership. GDPR compliant.
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-6">
              The Ownership Data <span className="gradient-text">Your Competitors Already Have</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-gray-400 max-w-2xl mx-auto">
              Leading European ETF issuers are already using beneficial ownership data to drive their distribution strategy. 
              <span className="text-white"> Can you afford to keep flying blind?</span>
            </motion.p>
          </motion.div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                quote: "We spent 18 months trying to build this capability in-house. ETAnalytics delivered in 90 days what our team couldn't do in a year.",
                role: "Head of Capital Markets",
                company: "Major European Issuer"
              },
              {
                quote: "For the first time, I can walk into a board meeting and actually explain who owns our £8B in ETF assets.",
                role: "Head of Distribution",
                company: "UK-based Asset Manager"
              },
              {
                quote: "The ROI was immediate. We identified three major wealth management firms holding significant positions that we didn't even know existed.",
                role: "ETF Product Manager",
                company: "Global Asset Manager"
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-glass rounded-2xl p-8"
              >
                <Quote className="w-8 h-8 text-primary-500/30 mb-4" />
                <p className="text-gray-300 mb-6 text-lg leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <p className="text-white font-medium">{testimonial.role}</p>
                  <p className="text-gray-500 text-sm">{testimonial.company}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust Markers */}
          <div className="flex flex-wrap justify-center gap-6 mb-16">
            {[
              'Irish Companies Act compliance expertise',
              'GDPR & data protection certified',
              'Enterprise-grade security',
              'Trusted by issuers managing €500B+ AUM'
            ].map((marker, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800/50 border border-white/5">
                <CheckCircle className="w-4 h-4 text-accent-400" />
                <span className="text-gray-400 text-sm">{marker}</span>
              </div>
            ))}
          </div>

          {/* Target Customers */}
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-6 uppercase tracking-wide">Designed for issuers like</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[
                'BlackRock', 'Vanguard', 'State Street', 'Amundi', 'Invesco', 'DWS',
                'UBS', 'HSBC', 'WisdomTree', 'JP Morgan', 'Franklin Templeton', 'VanEck'
              ].map((name, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 rounded-lg bg-dark-800/30 border border-white/5 hover:border-primary-500/30 transition-colors"
                >
                  <span className="text-gray-500 text-sm font-medium">{name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - ROI Framing */}
      <section id="pricing" className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-6">
              What's Your Ownership Blind Spot <span className="gradient-text">Costing You?</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-gray-400 max-w-3xl mx-auto">
              Most ETF issuers spend £100-300K annually on market intelligence that doesn't answer the fundamental question: 
              <span className="text-white"> who actually owns our products?</span> ETAnalytics fills that gap.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {[
              {
                name: 'Starter',
                price: '£80,000',
                period: '/year',
                description: 'For issuers with growing ETF ranges seeking first-time ownership visibility',
                features: [
                  'Up to 10 ETF products',
                  'Quarterly comprehensive analysis',
                  'Daily tracking for matched entities',
                  'Full entity database access',
                  'Email support (48h response)'
                ],
                roiNote: 'Less than the cost of one failed distribution partnership',
                cta: 'Get Started',
                highlighted: false
              },
              {
                name: 'Professional',
                price: '£150,000',
                period: '/year',
                description: 'For established issuers who need ongoing distribution intelligence',
                features: [
                  'Up to 50 ETF products',
                  'Monthly comprehensive analysis',
                  'Daily tracking with alerts',
                  'Custom entity tagging & segmentation',
                  'API access for CRM integration',
                  'Priority support (24h response)'
                ],
                roiNote: 'Identify one £1B+ relationship and this pays for itself',
                cta: 'Get Started',
                highlighted: true
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                description: 'For global issuers requiring bespoke solutions',
                features: [
                  'Unlimited ETF products',
                  'On-demand analysis (any frequency)',
                  'Real-time tracking & alerts',
                  'Custom integrations (Salesforce, Bloomberg)',
                  'Dedicated account manager',
                  'SLA guarantee with penalties'
                ],
                roiNote: 'Contact us to discuss your requirements',
                cta: 'Contact Sales',
                highlighted: false
              }
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-8 relative ${
                  plan.highlighted 
                    ? 'bg-gradient-to-b from-primary-500/20 to-dark-800 border-2 border-primary-500/50' 
                    : 'card-glass'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-500 rounded-full text-sm font-medium">
                    Recommended
                  </div>
                )}
                
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-6">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-gray-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mb-6 p-3 rounded-lg bg-accent-500/10 border border-accent-500/20">
                  <p className="text-xs text-accent-400">{plan.roiNote}</p>
                </div>

                <Link
                  to={plan.name === 'Enterprise' ? '/signup?plan=enterprise' : `/signup?plan=${plan.name.toLowerCase()}`}
                  className={`w-full py-3 rounded-lg font-medium transition-all block text-center ${
                    plan.highlighted 
                      ? 'bg-primary-500 hover:bg-primary-400 text-white' 
                      : 'border border-white/20 hover:border-primary-400 hover:text-primary-400'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pilot Option */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-4 px-6 py-4 rounded-xl bg-dark-800 border border-white/10">
              <Zap className="w-5 h-5 text-primary-400" />
              <span className="text-gray-300">
                <span className="font-medium text-white">Not ready to commit?</span> Try a single-fund pilot for £25,000 to see results before signing a full contract.
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-32">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-6">
              Frequently Asked <span className="gradient-text">Questions</span>
            </motion.h2>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                q: "How is this different from market intelligence providers like Broadridge or IHS Markit?",
                a: "Market intelligence shows you industry trends and estimated flows. It doesn't tell you which wealth managers, private banks, and institutions actually own YOUR products. We do. Our data comes from statutory disclosure requests, not estimates."
              },
              {
                q: "Can't we do this ourselves using Irish law?",
                a: "Technically, yes. Practically, it requires legal expertise, systematic tracking, and months of follow-up with custodians. Our clients tried DIY first — that's how they found us. We've built the infrastructure to do this at scale."
              },
              {
                q: "What if custodians don't respond to disclosure requests?",
                a: "Irish law requires a response within 14 days. We track compliance and escalate non-responders. In practice, we achieve 95%+ response rates because custodians know the legal requirements."
              },
              {
                q: "Do you identify individual retail investors?",
                a: "No. We identify institutional decision makers: wealth managers, private banks, family offices, asset managers, and institutions. For execution-only platforms (where retail investors self-direct), we stop at the platform level — that's the decision point."
              },
              {
                q: "How accurate is the data?",
                a: "Entity matching is 95%+ accurate for our database of 5,000+ known entities. Disclosure responses are 100% accurate — they come directly from custodians. We clearly flag any uncertainty in reports."
              },
              {
                q: "Is our share register data secure?",
                a: "Yes. We're GDPR compliant, use encrypted storage, and can sign NDAs. Your share register data is never shared with anyone, period. We're building SOC 2 compliance currently."
              },
              {
                q: "What's the typical ROI?",
                a: "Clients typically identify 2-5 previously unknown institutional relationships within the first quarter. A single £100M+ relationship discovered is worth more than the annual subscription many times over."
              }
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card-glass rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium text-white pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-400">{faq.a}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section - Urgency */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Still Managing Billions <span className="gradient-text">in the Dark?</span>
            </h2>
            <p className="text-xl text-gray-400 mb-4">
              Every quarter that passes without ownership data is another quarter of:
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {[
                'Distribution spend you can\'t justify',
                'Relationships you don\'t know you\'re losing',
                'Competitors getting smarter'
              ].map((item, i) => (
                <span key={i} className="px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {item}
                </span>
              ))}
            </div>
            <p className="text-xl text-white font-medium mb-8">
              The data exists. The legal right exists. You're just not using it. <span className="gradient-text">Let's change that.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link 
                to="/signup" 
                className="btn-primary text-lg px-8 py-4 flex items-center gap-2"
              >
                See Who Owns Your ETFs <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/demo-login" 
                className="btn-secondary text-lg px-8 py-4 flex items-center gap-2"
              >
                <Play className="w-5 h-5" /> Try Demo First
              </Link>
            </div>

            {/* Urgency */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm">
              <Clock className="w-4 h-4" />
              <span>We onboard 3 new issuers per quarter. Q2 2026 slots filling now.</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold">ET Analytics</span>
              </div>
              <p className="text-gray-500">
                The only ownership analytics platform built for ETF issuers. Know your investors. Grow your assets.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-500">
                <li><a href="#solution" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">API Documentation</a></li>
                <li><Link to="/demo-login" className="hover:text-white">Try Demo</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-500">
                <li><Link to="/about" className="hover:text-white">About</Link></li>
                <li><Link to="/careers" className="hover:text-white">Careers</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
                <li><a href="mailto:accounts@etanalytics.co.uk" className="hover:text-white">Press</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-500">
                <li><Link to="/legal/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link to="/legal/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link to="/legal/gdpr" className="hover:text-white">GDPR</Link></li>
                <li><Link to="/legal/security" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2026 Exchange Traded Analytics. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <a href="mailto:accounts@etanalytics.co.uk" className="hover:text-white transition-colors">
                accounts@etanalytics.co.uk
              </a>
              <span>•</span>
              <span>Leveraging Irish beneficial ownership legislation</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
