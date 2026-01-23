import { Link } from 'react-router-dom'
import { Eye, MapPin, Clock, Users, Target, TrendingUp, Zap, Heart } from 'lucide-react'

const Careers = () => {
  const benefits = [
    {
      icon: Target,
      title: 'Meaningful Work',
      description: 'Help ETF issuers understand who their investors are. Every disclosure request matters.'
    },
    {
      icon: TrendingUp,
      title: 'Growth Opportunity',
      description: 'Join early, shape the product, grow with the company. Equity options for all employees.'
    },
    {
      icon: Users,
      title: 'Learn from the Best',
      description: 'Work with former capital markets professionals and experienced tech builders.'
    },
    {
      icon: Zap,
      title: 'Move Fast',
      description: 'Small team, short feedback loops. See your work in production within days.'
    },
    {
      icon: Heart,
      title: 'Work-Life Balance',
      description: 'Flexible hours, hybrid work, generous time off. We trust you to manage your time.'
    },
    {
      icon: MapPin,
      title: 'London Base',
      description: 'Financial district location. Close to ETF issuers across UK and Europe.'
    }
  ]

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold">ET Analytics</span>
            </Link>
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-12 text-center">
        <h1 className="text-5xl font-bold mb-6">Join Us</h1>
        <p className="text-xl text-gray-400 mb-8">
          We're building the infrastructure for beneficial ownership transparency in European ETFs. 
          Help us solve a problem that affects €2.5+ trillion in assets.
        </p>
      </div>

      {/* Why Join */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Why ETAnalytics?</h2>
          <div className="card-glass rounded-2xl p-8 mb-8">
            <p className="text-lg text-gray-300 mb-4">
              Most ETF issuers can only see nominee accounts on their share registers. They don't know who actually 
              holds their products—the wealth managers, private banks, and institutions driving billions in flows.
            </p>
            <p className="text-lg text-gray-300">
              We're solving this. Using Ireland's beneficial ownership framework, we systematically identify investment 
              decision makers across complex custody chains. It's a hard problem—regulatory complexity, data infrastructure, 
              entity matching, relationship management—but it matters. Every issuer we work with gets better data to make 
              better decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="card-glass rounded-xl p-6">
                <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray-400 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Current Openings */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Current Openings</h2>
          <div className="card-glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-500/20 flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4">No Open Positions at This Time</h3>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              We're not actively hiring right now, but we're always interested in meeting exceptional people.
            </p>
            <p className="text-gray-400 mb-8">
              If you think you'd be a great fit for ETAnalytics, we'd still like to hear from you. 
              Send us your CV and we'll keep you in mind for future opportunities.
            </p>
            <a 
              href="mailto:accounts@etanalytics.co.uk?subject=Future Opportunities"
              className="btn-secondary px-8 py-4 inline-block"
            >
              Send Us Your CV
            </a>
          </div>
        </section>

        {/* What We Look For */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">What We Look For</h2>
          <div className="card-glass rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Must-Haves</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-accent-400 mt-1">✓</span>
                    <span><strong>Ownership mindset:</strong> You take problems end-to-end</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-400 mt-1">✓</span>
                    <span><strong>Clear communication:</strong> Explain complex things simply</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-400 mt-1">✓</span>
                    <span><strong>High standards:</strong> You care about quality and details</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-400 mt-1">✓</span>
                    <span><strong>Curiosity:</strong> Ask why things work the way they do</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Nice-to-Haves</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400 mt-1">+</span>
                    <span>Experience in fintech, regtech, or financial services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400 mt-1">+</span>
                    <span>Worked at early-stage startups before</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400 mt-1">+</span>
                    <span>Understanding of ETFs, custody, or capital markets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400 mt-1">+</span>
                    <span>Based in London or willing to relocate</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Hiring Process */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Hiring Process</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-400">1</span>
              </div>
              <h3 className="font-semibold mb-2">Apply</h3>
              <p className="text-sm text-gray-400">Send CV and cover letter explaining why you're interested</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-400">2</span>
              </div>
              <h3 className="font-semibold mb-2">Initial Call</h3>
              <p className="text-sm text-gray-400">30-min chat with team member (culture fit, motivation)</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-400">3</span>
              </div>
              <h3 className="font-semibold mb-2">Skills Assessment</h3>
              <p className="text-sm text-gray-400">Role-specific task or case study (paid if &gt;2 hours)</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-400">4</span>
              </div>
              <h3 className="font-semibold mb-2">Final Interview</h3>
              <p className="text-sm text-gray-400">Meet the team, discuss role in depth, align on expectations</p>
            </div>
          </div>
          <p className="text-center text-gray-400 mt-8">
            Typical timeline: 2-3 weeks from application to offer. We move quickly.
          </p>
        </section>

        {/* Don't See Your Role? */}
        <section className="text-center">
          <div className="card-glass rounded-2xl p-12 border border-accent-500/20">
            <h2 className="text-3xl font-bold mb-4">Don't See Your Role?</h2>
            <p className="text-xl text-gray-400 mb-8">
              We're always looking for exceptional people. If you think you'd be a great fit, reach out.
            </p>
            <a 
              href="mailto:accounts@etanalytics.co.uk?subject=General Application"
              className="btn-primary px-8 py-4 text-lg inline-block"
            >
              Send Us Your CV
            </a>
          </div>
        </section>

        {/* Footer Note */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>ETAnalytics is an equal opportunity employer.</p>
          <p className="mt-2">
            We value diversity and are committed to creating an inclusive environment for all employees.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Careers

