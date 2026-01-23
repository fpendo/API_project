import { Link } from 'react-router-dom'
import { Eye, Mail, MessageSquare, Phone, MapPin, Send } from 'lucide-react'

const Contact = () => {
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
      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Get In Touch</h1>
          <p className="text-xl text-gray-400">
            Ready to identify your investors? Have questions? We're here to help.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Methods */}
          <div className="space-y-8">
            <div className="card-glass rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Sales & Onboarding</h3>
                  <p className="text-gray-400 mb-3">
                    Want to get started or learn more about our services?
                  </p>
                  <a 
                    href="mailto:accounts@etanalytics.co.uk" 
                    className="text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    accounts@etanalytics.co.uk
                  </a>
                </div>
              </div>
            </div>

            <div className="card-glass rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-accent-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Customer Support</h3>
                  <p className="text-gray-400 mb-3">
                    Existing clients: Questions about your analysis or reports?
                  </p>
                  <a 
                    href="mailto:accounts@etanalytics.co.uk" 
                    className="text-accent-400 hover:text-accent-300 transition-colors"
                  >
                    accounts@etanalytics.co.uk
                  </a>
                </div>
              </div>
            </div>

            <div className="card-glass rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Office Location</h3>
                  <p className="text-gray-400">
                    ETAnalytics Ltd.<br />
                    London, United Kingdom
                  </p>
                </div>
              </div>
            </div>

            {/* Response Times */}
            <div className="card-glass rounded-xl p-6 bg-primary-500/10 border border-primary-500/20">
              <h3 className="text-lg font-semibold mb-3">Response Times</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Sales enquiries: <span className="text-white">Within 24 hours</span></li>
                <li>• Demo requests: <span className="text-white">Same business day</span></li>
                <li>• Client support: <span className="text-white">Within 12 hours</span></li>
                <li>• Urgent issues: <span className="text-white">Within 4 hours</span></li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div className="card-glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="Your ETF issuer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  I'm interested in *
                </label>
                <select
                  required
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="">Select an option...</option>
                  <option value="demo">Requesting a demo</option>
                  <option value="pricing">Learning about pricing</option>
                  <option value="technical">Technical questions</option>
                  <option value="partnership">Partnership opportunities</option>
                  <option value="support">Customer support</option>
                  <option value="other">Other enquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  placeholder="Tell us about your needs..."
                />
              </div>

              <button
                type="submit"
                className="w-full btn-primary py-4 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send Message
              </button>

              <p className="text-sm text-gray-500 text-center">
                We'll respond within 24 hours during business days.
              </p>
            </form>
          </div>
        </div>

        {/* FAQ Quick Links */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">Looking for quick answers?</p>
          <Link to="/#faq" className="text-primary-400 hover:text-primary-300 transition-colors">
            Check our FAQ section →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Contact

