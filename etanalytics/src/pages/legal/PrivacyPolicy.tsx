import { Link } from 'react-router-dom'
import { Eye, Shield, Lock, Database, UserCheck, Mail } from 'lucide-react'

const PrivacyPolicy = () => {
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
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: January 2026</p>
        </div>

        <div className="card-glass rounded-xl p-6 mb-8 bg-primary-500/10 border-primary-500/20">
          <p className="text-sm text-gray-300">
            <strong>Important:</strong> This Privacy Policy should be reviewed by qualified legal counsel before publication. 
            This document is provided as a template and may not reflect all legal requirements applicable to your specific situation.
          </p>
        </div>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-3xl font-bold mb-4">1. Introduction</h2>
            <p className="text-gray-300 mb-4">
              ETAnalytics Ltd. ("ETAnalytics", "we", "us", or "our") is committed to protecting your privacy and ensuring 
              the security of your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard 
              information when you use our beneficial ownership analytics platform and related services (the "Services").
            </p>
            <p className="text-gray-300">
              We are registered in the United Kingdom and comply with the General Data Protection Regulation (UK GDPR), 
              the Data Protection Act 2018, and other applicable data protection laws.
            </p>
          </section>

          {/* Data Controller */}
          <section>
            <h2 className="text-3xl font-bold mb-4">2. Data Controller</h2>
            <div className="card-glass rounded-xl p-6">
              <p className="text-gray-300 mb-2">ETAnalytics Ltd.</p>
              <p className="text-gray-400 text-sm">London, United Kingdom</p>
              <p className="text-gray-400 text-sm">Email: <a href="mailto:accounts@etanalytics.co.uk" className="text-primary-400 hover:text-primary-300">accounts@etanalytics.co.uk</a></p>
            </div>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-3xl font-bold mb-4">3. Information We Collect</h2>
            
            <h3 className="text-2xl font-semibold mt-6 mb-3">3.1 Information You Provide</h3>
            <div className="space-y-4">
              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary-400" />
                  Account Information
                </h4>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>Name, email address, job title</li>
                  <li>Company name, registration number</li>
                  <li>Contact details (phone, address)</li>
                  <li>Login credentials (password stored encrypted)</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Database className="w-5 h-5 text-accent-400" />
                  Share Register Data
                </h4>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>Share register files you upload for analysis</li>
                  <li>Shareholder names, account numbers, holdings data</li>
                  <li>ETF product information (ISINs, share classes)</li>
                  <li>Historical register data for trend analysis</li>
                </ul>
                <p className="text-sm text-gray-400 mt-3">
                  <strong>Note:</strong> We process this data solely to provide our Services. 
                  We do not sell, share, or use share register data for any purpose beyond your analysis requirements.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Communication Data</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>Messages, support tickets, and correspondence</li>
                  <li>Feedback and survey responses</li>
                  <li>Records of consent and preferences</li>
                </ul>
              </div>
            </div>

            <h3 className="text-2xl font-semibold mt-6 mb-3">3.2 Information We Collect Automatically</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Usage Data:</strong> Pages viewed, features used, time spent, actions taken</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
              <li><strong>Log Data:</strong> Access times, errors, performance metrics</li>
              <li><strong>Cookies:</strong> Session cookies, preference cookies (see Section 9 for details)</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-3xl font-bold mb-4">4. How We Use Your Information</h2>
            <p className="text-gray-300 mb-4">We process personal data only when we have a legal basis to do so:</p>
            
            <div className="space-y-4">
              <div className="card-glass rounded-xl p-6 border-l-4 border-primary-500">
                <h4 className="font-semibold mb-2">Contract Performance (GDPR Art. 6(1)(b))</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 text-sm">
                  <li>Analyse share register data to identify beneficial owners</li>
                  <li>Generate disclosure requests and manage responses</li>
                  <li>Provide reports, insights, and analytics</li>
                  <li>Deliver customer support and respond to enquiries</li>
                  <li>Process payments and maintain account access</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6 border-l-4 border-accent-500">
                <h4 className="font-semibold mb-2">Legitimate Interests (GDPR Art. 6(1)(f))</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 text-sm">
                  <li>Improve and optimise our Services and user experience</li>
                  <li>Prevent fraud, abuse, and security incidents</li>
                  <li>Conduct analytics to understand product usage</li>
                  <li>Send service updates and important notices</li>
                  <li>Maintain backup and disaster recovery systems</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6 border-l-4 border-primary-500">
                <h4 className="font-semibold mb-2">Consent (GDPR Art. 6(1)(a))</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 text-sm">
                  <li>Send marketing communications (you can opt out anytime)</li>
                  <li>Use non-essential cookies for analytics and preferences</li>
                  <li>Share testimonials or case studies (anonymised)</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6 border-l-4 border-accent-500">
                <h4 className="font-semibold mb-2">Legal Obligation (GDPR Art. 6(1)(c))</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 text-sm">
                  <li>Comply with disclosure requests under Irish Companies Act</li>
                  <li>Respond to court orders or legal process</li>
                  <li>Maintain records for tax and regulatory compliance</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-3xl font-bold mb-4">5. How We Share Your Information</h2>
            <p className="text-gray-300 mb-4">
              We do not sell personal data. We share information only in the following circumstances:
            </p>

            <div className="space-y-4">
              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Service Providers</h4>
                <p className="text-gray-300 text-sm mb-2">
                  We engage third-party companies to perform functions on our behalf:
                </p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Cloud hosting (AWS/Google Cloud/Azure) - data storage and processing</li>
                  <li>Payment processors - secure payment handling</li>
                  <li>Email services - transactional and support emails</li>
                  <li>Analytics tools - usage monitoring and optimisation</li>
                </ul>
                <p className="text-sm text-gray-400 mt-3">
                  All service providers are bound by data processing agreements and process data only as instructed.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Disclosure Requests</h4>
                <p className="text-gray-300 text-sm">
                  When generating beneficial ownership disclosure requests, we share minimal shareholder information 
                  (account name, holding details) with custodians and nominees as required under Irish disclosure laws. 
                  This is necessary to perform our Services.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Legal Requirements</h4>
                <p className="text-gray-300 text-sm">
                  We may disclose information if required by law, court order, or governmental authority, or if 
                  necessary to protect our rights, your safety, or the safety of others.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Business Transfers</h4>
                <p className="text-gray-300 text-sm">
                  In the event of a merger, acquisition, or sale of assets, your data may be transferred. 
                  You will be notified of any such change and your rights regarding your data.
                </p>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-3xl font-bold mb-4">6. Data Security</h2>
            <p className="text-gray-300 mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-primary-400" />
                  <h4 className="font-semibold">Encryption</h4>
                </div>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>TLS 1.3 for data in transit</li>
                  <li>AES-256 for data at rest</li>
                  <li>Encrypted database backups</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-accent-400" />
                  <h4 className="font-semibold">Access Controls</h4>
                </div>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Role-based access control (RBAC)</li>
                  <li>Multi-factor authentication (MFA)</li>
                  <li>Regular access audits</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-primary-400" />
                  <h4 className="font-semibold">Infrastructure</h4>
                </div>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>SOC 2 certified cloud providers</li>
                  <li>Redundant systems and backups</li>
                  <li>Network segmentation</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-5 h-5 text-accent-400" />
                  <h4 className="font-semibold">Monitoring</h4>
                </div>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>24/7 security monitoring</li>
                  <li>Intrusion detection systems</li>
                  <li>Regular penetration testing</li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-6">
              While we implement robust security measures, no system is 100% secure. We cannot guarantee absolute security, 
              but we continually work to enhance our protections.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-3xl font-bold mb-4">7. Data Retention</h2>
            <p className="text-gray-300 mb-4">
              We retain personal data only as long as necessary for the purposes outlined in this policy:
            </p>
            
            <div className="card-glass rounded-xl p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 text-gray-400">Data Type</th>
                    <th className="text-left py-3 text-gray-400">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="py-3">Account information</td>
                    <td className="py-3">Duration of account + 6 months</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3">Share register data</td>
                    <td className="py-3">Duration of contract + 2 years (or as required)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3">Analysis reports</td>
                    <td className="py-3">Duration of contract + 2 years</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3">Communication records</td>
                    <td className="py-3">3 years from last contact</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3">Usage logs</td>
                    <td className="py-3">12 months</td>
                  </tr>
                  <tr>
                    <td className="py-3">Financial/tax records</td>
                    <td className="py-3">7 years (legal requirement)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              You may request earlier deletion of your data, subject to our legal obligations to retain certain records.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-3xl font-bold mb-4">8. Your Rights (GDPR)</h2>
            <p className="text-gray-300 mb-4">Under GDPR, you have the following rights:</p>
            
            <div className="space-y-3">
              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">Right to Access:</strong>
                <span className="text-gray-400 ml-2">Request a copy of your personal data</span>
              </div>
              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">Right to Rectification:</strong>
                <span className="text-gray-400 ml-2">Correct inaccurate or incomplete data</span>
              </div>
              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">Right to Erasure ("Right to be Forgotten"):</strong>
                <span className="text-gray-400 ml-2">Request deletion of your data in certain circumstances</span>
              </div>
              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">Right to Restrict Processing:</strong>
                <span className="text-gray-400 ml-2">Limit how we use your data in specific situations</span>
              </div>
              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">Right to Data Portability:</strong>
                <span className="text-gray-400 ml-2">Receive your data in a machine-readable format</span>
              </div>
              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">Right to Object:</strong>
                <span className="text-gray-400 ml-2">Object to processing based on legitimate interests</span>
              </div>
              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">Right to Withdraw Consent:</strong>
                <span className="text-gray-400 ml-2">Withdraw consent for marketing or non-essential processing</span>
              </div>
            </div>

            <div className="card-glass rounded-xl p-6 mt-6 bg-primary-500/10 border-primary-500/20">
              <h4 className="font-semibold mb-2">How to Exercise Your Rights</h4>
              <p className="text-gray-300 text-sm mb-3">
                To exercise any of these rights, contact us at:
              </p>
              <p className="text-primary-400">
                <Mail className="w-4 h-4 inline mr-2" />
                <a href="mailto:accounts@etanalytics.co.uk">accounts@etanalytics.co.uk</a>
              </p>
              <p className="text-sm text-gray-400 mt-3">
                We will respond within 30 days. If your request is complex, we may extend this by 2 months and will notify you.
              </p>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              <strong>Right to Lodge a Complaint:</strong> You have the right to lodge a complaint with the Irish Data Protection 
              Commission (<a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">www.dataprotection.ie</a>) 
              or your local supervisory authority.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-3xl font-bold mb-4">9. Cookies and Tracking</h2>
            <p className="text-gray-300 mb-4">
              We use cookies and similar technologies to enhance your experience:
            </p>
            
            <div className="space-y-4">
              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Essential Cookies</h4>
                <p className="text-gray-300 text-sm mb-2">Required for the Services to function (cannot be disabled):</p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Session authentication</li>
                  <li>Security and fraud prevention</li>
                  <li>Load balancing</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Analytics Cookies</h4>
                <p className="text-gray-300 text-sm mb-2">Help us understand usage patterns (you can opt out):</p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Page views and navigation</li>
                  <li>Feature usage statistics</li>
                  <li>Performance metrics</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Preference Cookies</h4>
                <p className="text-gray-300 text-sm mb-2">Remember your choices (you can opt out):</p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Language and region settings</li>
                  <li>Display preferences</li>
                  <li>Notification settings</li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              You can control cookies through your browser settings. Note that disabling cookies may affect functionality.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-3xl font-bold mb-4">10. International Data Transfers</h2>
            <p className="text-gray-300 mb-4">
              Your data is primarily stored in EU data centres. If we transfer data outside the EEA, we ensure adequate 
              protection through:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Standard Contractual Clauses (SCCs):</strong> EU-approved contracts with service providers</li>
              <li><strong>Adequacy Decisions:</strong> Transfers to countries deemed adequate by the EU Commission</li>
              <li><strong>Additional Safeguards:</strong> Encryption, access controls, and regular audits</li>
            </ul>
          </section>

          {/* Children */}
          <section>
            <h2 className="text-3xl font-bold mb-4">11. Children's Privacy</h2>
            <p className="text-gray-300">
              Our Services are intended for business use only. We do not knowingly collect information from individuals 
              under 18. If you believe we have inadvertently collected such data, please contact us immediately.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-3xl font-bold mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-300 mb-4">
              We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. 
              We will notify you of material changes by:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Email notification to your registered address</li>
              <li>Prominent notice on our website</li>
              <li>In-app notification when you next log in</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Continued use of our Services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-3xl font-bold mb-4">13. Contact Us</h2>
            <div className="card-glass rounded-xl p-8 bg-primary-500/10 border-primary-500/20">
              <p className="text-gray-300 mb-4">
                If you have questions about this Privacy Policy or how we handle your data:
              </p>
              <div className="space-y-2 text-gray-300">
                <p><strong>Email:</strong> <a href="mailto:accounts@etanalytics.co.uk" className="text-primary-400 hover:text-primary-300">accounts@etanalytics.co.uk</a></p>
                <p><strong>Subject Line:</strong> Privacy Policy Enquiry</p>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                We will respond to privacy enquiries within 72 hours.
              </p>
            </div>
          </section>

          {/* Legal Disclaimer */}
          <div className="card-glass rounded-xl p-6 mt-12 bg-yellow-500/10 border-yellow-500/20">
            <p className="text-sm text-gray-300">
              <strong>Legal Notice:</strong> This Privacy Policy is provided as a template and should be reviewed and 
              customised by qualified legal counsel before publication. ETAnalytics recommends consulting with data 
              protection experts to ensure compliance with all applicable laws in your jurisdiction.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy

