import { Link } from 'react-router-dom'
import { Eye, Users, Target, Shield, Globe, Award } from 'lucide-react'

const About = () => {
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

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-5xl font-bold mb-6">About ET Analytics</h1>
        <p className="text-xl text-gray-400 mb-12">
          We're building the infrastructure for beneficial ownership transparency in European ETFs.
        </p>

        {/* Mission */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <div className="card-glass rounded-2xl p-8">
            <p className="text-lg text-gray-300 mb-4">
              ETF issuers manage billions in assets but lack visibility into who actually holds their products. 
              Behind nominee accounts sit wealth managers, private banks, and institutions—the real decision makers 
              driving flows and building portfolios.
            </p>
            <p className="text-lg text-gray-300">
              We built ETAnalytics to change that. Using Ireland's beneficial ownership disclosure framework, 
              we systematically identify investment decision makers across 3-5 layers of custody chains—turning 
              5-15% visibility into 60-93% in 90 days.
            </p>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">What We Do</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-glass rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Entity Matching</h3>
              <p className="text-gray-400">
                We maintain a database of 5,000+ known entities and use AI-powered matching to identify 
                custodians, platforms, and decision makers from share register nominee names.
              </p>
            </div>

            <div className="card-glass rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-accent-500/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-accent-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Disclosure Management</h3>
              <p className="text-gray-400">
                We generate compliant disclosure requests under Irish Companies Act provisions, 
                track responses, and manage the entire process from start to finish.
              </p>
            </div>

            <div className="card-glass rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Investor Analytics</h3>
              <p className="text-gray-400">
                We deliver actionable insights: who's buying, who's selling, concentration risk, 
                distribution ROI, and investor segmentation your capital markets team can use immediately.
              </p>
            </div>

            <div className="card-glass rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-accent-500/20 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-accent-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">European Focus</h3>
              <p className="text-gray-400">
                Built for UCITS ETF issuers domiciled in Ireland and Luxembourg. We understand the regulatory 
                landscape and work within established disclosure frameworks.
              </p>
            </div>
          </div>
        </section>

        {/* Why We Exist */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Why We Exist</h2>
          <div className="card-glass rounded-2xl p-8">
            <p className="text-lg text-gray-300 mb-4">
              The ETF industry has grown to €2.5+ trillion in Europe, yet most issuers can only see nominee names 
              on their share registers: CREST, Euroclear, State Street Nominees. These aren't investors—they're 
              intermediaries in a 3-5 layer custody chain.
            </p>
            <p className="text-lg text-gray-300 mb-4">
              Without knowing who holds their products, issuers can't:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4">
              <li>Prove which distribution partnerships are delivering</li>
              <li>Identify institutional relationships worth protecting or pursuing</li>
              <li>Spot concentration risk before redemptions hit</li>
              <li>Segment investors for targeted engagement</li>
              <li>Understand why flows changed last quarter</li>
            </ul>
            <p className="text-lg text-gray-300">
              The data exists. The legal framework exists (Irish Companies Act disclosure provisions). 
              What was missing was the infrastructure to do this systematically, at scale. That's what we built.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Our Values</h2>
          <div className="space-y-6">
            <div className="card-glass rounded-xl p-6 border-l-4 border-primary-500">
              <h3 className="text-xl font-semibold mb-2">Transparency</h3>
              <p className="text-gray-400">
                We exist to make opaque ownership chains transparent. That starts with how we operate: 
                clear pricing, honest timelines, no surprises.
              </p>
            </div>

            <div className="card-glass rounded-xl p-6 border-l-4 border-accent-500">
              <h3 className="text-xl font-semibold mb-2">Compliance First</h3>
              <p className="text-gray-400">
                Every disclosure request is legally compliant. We work within the regulatory framework, 
                never cutting corners that could create risk for our clients.
              </p>
            </div>

            <div className="card-glass rounded-xl p-6 border-l-4 border-primary-500">
              <h3 className="text-xl font-semibold mb-2">Data Security</h3>
              <p className="text-gray-400">
                Share registers are sensitive. We treat your data with bank-grade security: encryption, 
                access controls, audit trails, GDPR compliance by design.
              </p>
            </div>

            <div className="card-glass rounded-xl p-6 border-l-4 border-accent-500">
              <h3 className="text-xl font-semibold mb-2">Client Success</h3>
              <p className="text-gray-400">
                We succeed when you can answer "who holds our ETFs?" with data, not guesses. 
                Our job is to make you look good to your board.
              </p>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">The Team</h2>
          <div className="card-glass rounded-2xl p-8">
            <p className="text-lg text-gray-300 mb-4">
              ETAnalytics was founded by professionals who've worked in ETF capital markets, investor relations, 
              and regulatory technology. We saw issuers struggling with the same problem repeatedly: 
              knowing who their investors are.
            </p>
            <p className="text-lg text-gray-300">
              Today, we're a team of technologists, former capital markets professionals, and disclosure specialists 
              based across Ireland and the UK. We're backed by investors who understand both fintech and 
              the ETF industry.
            </p>
          </div>
        </section>

        {/* Location */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Where We're Based</h2>
          <div className="card-glass rounded-2xl p-8">
            <p className="text-lg text-gray-300 mb-4">
              <strong className="text-white">ETAnalytics Ltd.</strong><br />
              London, United Kingdom
            </p>
            <p className="text-gray-400">
              We're based in London's financial district, serving ETF issuers across Europe. Most UCITS ETFs are domiciled 
              in Ireland or Luxembourg—we work closely with issuers in both jurisdictions.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="card-glass rounded-2xl p-12 border border-primary-500/20">
            <h2 className="text-3xl font-bold mb-4">Want to Know More?</h2>
            <p className="text-xl text-gray-400 mb-8">
              Let's talk about how we can help you identify your investors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup" className="btn-primary px-8 py-4 text-lg">
                Get Started
              </Link>
              <a 
                href="mailto:accounts@etanalytics.co.uk" 
                className="btn-secondary px-8 py-4 text-lg"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default About

