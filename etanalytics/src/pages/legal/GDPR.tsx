import { Link } from 'react-router-dom'
import { Eye, Shield, Lock, FileText, CheckCircle, Download, Trash2, Edit, Copy } from 'lucide-react'

const GDPR = () => {
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
          <h1 className="text-5xl font-bold mb-4">GDPR Compliance</h1>
          <p className="text-xl text-gray-400">
            How ETAnalytics complies with the General Data Protection Regulation
          </p>
        </div>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          {/* Overview */}
          <section>
            <h2 className="text-3xl font-bold mb-4">Overview</h2>
            <p className="text-gray-300 mb-4">
              ETAnalytics Ltd. is committed to full compliance with the General Data Protection Regulation (GDPR) and the Irish 
              Data Protection Act 2018. As a data processor handling sensitive shareholder information, we've built GDPR compliance 
              into every aspect of our Services.
            </p>
            <p className="text-gray-300">
              This page explains our GDPR compliance measures, your rights, and how we protect personal data.
            </p>
          </section>

          {/* Our Role */}
          <section>
            <h2 className="text-3xl font-bold mb-4">1. Data Controller vs Data Processor</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6 border-l-4 border-primary-500">
                <h3 className="text-xl font-semibold mb-3">We Are a Data Processor</h3>
                <p className="text-gray-300 text-sm mb-3">
                  For Share Register Data you upload:
                </p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li><strong>You</strong> (the ETF issuer) are the <strong>Data Controller</strong></li>
                  <li><strong>We</strong> (ETAnalytics) are the <strong>Data Processor</strong></li>
                  <li>We process data only on your documented instructions</li>
                  <li>We do not determine processing purposes or means beyond service delivery</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6 border-l-4 border-accent-500">
                <h3 className="text-xl font-semibold mb-3">We Are a Data Controller</h3>
                <p className="text-gray-300 text-sm mb-3">
                  For your account and usage data:
                </p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Your account information (name, email, company)</li>
                  <li>Usage logs and analytics</li>
                  <li>Support communications</li>
                  <li>Payment and billing information</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Processing Agreement */}
          <section>
            <h2 className="text-3xl font-bold mb-4">2. Data Processing Agreement (DPA)</h2>
            <p className="text-gray-300 mb-4">
              All clients receive a Data Processing Agreement (DPA) that meets GDPR Article 28 requirements:
            </p>
            
            <div className="card-glass rounded-xl p-6">
              <h4 className="font-semibold mb-3">Our DPA Includes:</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Processing Instructions</p>
                    <p className="text-gray-400">Clear documentation of what data we process and why</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Confidentiality Obligations</p>
                    <p className="text-gray-400">All personnel handling data are bound by confidentiality</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Security Measures</p>
                    <p className="text-gray-400">Technical and organisational measures detailed in Section 4 below</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Sub-Processor List</p>
                    <p className="text-gray-400">Transparency about third parties processing your data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Data Subject Rights</p>
                    <p className="text-gray-400">Assistance with GDPR requests from shareholders</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Breach Notification</p>
                    <p className="text-gray-400">Commitment to notify you within 24 hours of any data breach</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Audit Rights</p>
                    <p className="text-gray-400">You may audit our compliance annually (or as required by regulation)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Data Return/Deletion</p>
                    <p className="text-gray-400">Return or secure deletion of data upon contract termination</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              The DPA is included in your Service Agreement. Enterprise clients may negotiate specific DPA terms.
            </p>
          </section>

          {/* Legal Basis */}
          <section>
            <h2 className="text-3xl font-bold mb-4">3. Legal Basis for Processing</h2>
            <p className="text-gray-300 mb-4">
              We process personal data only when we have a lawful basis under GDPR Article 6:
            </p>
            
            <div className="space-y-4">
              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2 text-primary-400">Contract Performance (Art. 6(1)(b))</h4>
                <p className="text-gray-300 text-sm mb-2">Processing necessary to deliver our Services:</p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Analysing share register data to identify beneficial owners</li>
                  <li>Generating and managing disclosure requests</li>
                  <li>Providing analysis reports and insights</li>
                  <li>Managing your account and providing support</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2 text-accent-400">Legitimate Interests (Art. 6(1)(f))</h4>
                <p className="text-gray-300 text-sm mb-2">Necessary for our or your legitimate interests (balanced against data subjects' rights):</p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Fraud prevention and security monitoring</li>
                  <li>Service improvement and optimisation</li>
                  <li>Network and information security</li>
                  <li>Business continuity and disaster recovery</li>
                </ul>
                <p className="text-gray-400 text-sm mt-3">
                  We've conducted Legitimate Interest Assessments (LIAs) for these activities and will provide them upon request.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2 text-primary-400">Legal Obligation (Art. 6(1)(c))</h4>
                <p className="text-gray-300 text-sm mb-2">Processing required by law:</p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Compliance with disclosure requests under Irish Companies Act</li>
                  <li>Tax and financial record keeping</li>
                  <li>Response to court orders or regulatory enquiries</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2 text-accent-400">Consent (Art. 6(1)(a))</h4>
                <p className="text-gray-300 text-sm mb-2">Only for optional processing:</p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Marketing communications (you can withdraw consent anytime)</li>
                  <li>Non-essential cookies and tracking</li>
                  <li>Use of testimonials or case studies</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Security Measures */}
          <section>
            <h2 className="text-3xl font-bold mb-4">4. Technical and Organisational Measures</h2>
            <p className="text-gray-300 mb-4">
              GDPR Article 32 requires appropriate technical and organisational security measures. We implement:
            </p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">Technical Measures</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="card-glass rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary-400" />
                      Encryption
                    </h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>TLS 1.3 in transit</li>
                      <li>AES-256 at rest</li>
                      <li>Encrypted backups</li>
                      <li>Secure key management (HSM)</li>
                    </ul>
                  </div>

                  <div className="card-glass rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-accent-400" />
                      Access Controls
                    </h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>Multi-factor authentication (MFA)</li>
                      <li>Role-based access control (RBAC)</li>
                      <li>Principle of least privilege</li>
                      <li>Session management</li>
                    </ul>
                  </div>

                  <div className="card-glass rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2">Infrastructure Security</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>SOC 2 certified cloud providers</li>
                      <li>Network segmentation</li>
                      <li>Firewalls and intrusion detection</li>
                      <li>DDoS protection</li>
                    </ul>
                  </div>

                  <div className="card-glass rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2">Monitoring & Logging</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>24/7 security monitoring</li>
                      <li>Audit trails for all data access</li>
                      <li>Automated threat detection</li>
                      <li>Regular security assessments</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Organisational Measures</h3>
                <div className="card-glass rounded-xl p-6">
                  <ul className="space-y-3 text-gray-300 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Staff Training:</strong> All employees complete data protection training annually</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Confidentiality:</strong> All staff sign confidentiality agreements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Background Checks:</strong> Screening for personnel with data access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Incident Response:</strong> Documented procedures for data breaches</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Data Minimisation:</strong> We collect only data necessary for Services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Privacy by Design:</strong> Data protection built into system architecture</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Data Subject Rights */}
          <section>
            <h2 className="text-3xl font-bold mb-4">5. Exercising Your Data Subject Rights</h2>
            <p className="text-gray-300 mb-4">
              Under GDPR, you have comprehensive rights regarding your personal data. Here's how to exercise them:
            </p>
            
            <div className="space-y-4">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Download className="w-6 h-6 text-primary-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Right to Access (Art. 15)</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      Request a copy of all personal data we hold about you, including:
                    </p>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>Account information and usage history</li>
                      <li>Data processing purposes and legal basis</li>
                      <li>Categories of data and recipients</li>
                      <li>Retention periods</li>
                      <li>Your rights and how to exercise them</li>
                    </ul>
                    <p className="text-primary-400 text-sm mt-3">
                      <strong>How:</strong> Email accounts@etanalytics.co.uk with subject "GDPR Access Request"
                    </p>
                    <p className="text-gray-400 text-sm">
                      <strong>Timeline:</strong> We respond within 30 days (may extend to 60 days for complex requests)
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Edit className="w-6 h-6 text-accent-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Right to Rectification (Art. 16)</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      Correct inaccurate or incomplete personal data. You can update most information directly in your account settings.
                    </p>
                    <p className="text-primary-400 text-sm mt-3">
                      <strong>How:</strong> Update in account settings or email us for assistance
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-6 h-6 text-primary-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Right to Erasure / "Right to be Forgotten" (Art. 17)</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      Request deletion of your personal data in certain circumstances:
                    </p>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>Data no longer necessary for original purpose</li>
                      <li>You withdraw consent (where consent was the legal basis)</li>
                      <li>You object to processing and no overriding legitimate grounds exist</li>
                      <li>Data was unlawfully processed</li>
                      <li>Legal obligation requires deletion</li>
                    </ul>
                    <p className="text-gray-300 text-sm mt-3">
                      <strong>Limitations:</strong> We may retain data where we have legal obligations (e.g., tax records for 7 years) 
                      or legitimate interests that override your rights (e.g., defending legal claims).
                    </p>
                    <p className="text-primary-400 text-sm mt-3">
                      <strong>How:</strong> Email accounts@etanalytics.co.uk with subject "GDPR Erasure Request"
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-accent-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Right to Restrict Processing (Art. 18)</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      Request that we limit how we process your data while:
                    </p>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>You contest the accuracy of data (we'll restrict until verified)</li>
                      <li>Processing is unlawful but you prefer restriction over deletion</li>
                      <li>We no longer need data but you need it for legal claims</li>
                      <li>You've objected to processing (pending verification of our legitimate grounds)</li>
                    </ul>
                    <p className="text-primary-400 text-sm mt-3">
                      <strong>How:</strong> Email accounts@etanalytics.co.uk with subject "GDPR Restriction Request"
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Copy className="w-6 h-6 text-primary-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Right to Data Portability (Art. 20)</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      Receive your personal data in a structured, machine-readable format (JSON, CSV) and transmit it to another 
                      controller where technically feasible.
                    </p>
                    <p className="text-gray-400 text-sm">
                      Applies to data processed by automated means based on consent or contract.
                    </p>
                    <p className="text-primary-400 text-sm mt-3">
                      <strong>How:</strong> Email accounts@etanalytics.co.uk with subject "GDPR Portability Request"
                    </p>
                    <p className="text-gray-400 text-sm">
                      <strong>Timeline:</strong> We provide exports within 30 days
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-accent-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Right to Object (Art. 21)</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      Object to processing based on legitimate interests or for direct marketing.
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Direct Marketing:</strong> We will stop immediately upon receiving your objection.
                    </p>
                    <p className="text-gray-300 text-sm mt-2">
                      <strong>Legitimate Interests:</strong> We will stop unless we can demonstrate compelling legitimate grounds 
                      that override your rights, or the processing is necessary for legal claims.
                    </p>
                    <p className="text-primary-400 text-sm mt-3">
                      <strong>How:</strong> Click "unsubscribe" in emails or email accounts@etanalytics.co.uk
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-glass rounded-xl p-6 mt-6 bg-primary-500/10 border-primary-500/20">
              <h4 className="font-semibold mb-2">How We Process Requests</h4>
              <p className="text-gray-300 text-sm mb-3">
                When you submit a GDPR request:
              </p>
              <ol className="list-decimal list-inside text-gray-400 space-y-2 ml-4 text-sm">
                <li>We verify your identity to prevent unauthorised disclosure</li>
                <li>We assess the request and determine the appropriate response</li>
                <li>We respond within 30 days (or notify you of extension)</li>
                <li>We provide the requested action or explain why we cannot comply</li>
              </ol>
              <p className="text-gray-400 text-sm mt-3">
                <strong>No Fee:</strong> We do not charge for GDPR requests unless they are manifestly unfounded, excessive, 
                or repetitive.
              </p>
            </div>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-3xl font-bold mb-4">6. International Data Transfers</h2>
            <p className="text-gray-300 mb-4">
              We primarily store and process data in EU data centres. Any transfers outside the European Economic Area (EEA) 
              comply with GDPR Chapter V requirements:
            </p>
            
            <div className="card-glass rounded-xl p-6">
              <h4 className="font-semibold mb-3">Transfer Mechanisms</h4>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-white font-medium mb-1">Standard Contractual Clauses (SCCs)</p>
                  <p className="text-gray-400">
                    We use EU Commission-approved Standard Contractual Clauses (2021 version) with all non-EEA service providers.
                  </p>
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Adequacy Decisions</p>
                  <p className="text-gray-400">
                    We may transfer data to countries recognised by the EU Commission as providing adequate protection 
                    (e.g., UK, Switzerland, Canada for commercial organisations).
                  </p>
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Additional Safeguards</p>
                  <p className="text-gray-400">
                    Beyond contractual protections, we implement supplementary measures: encryption, access controls, 
                    regular audits, and transfer impact assessments.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              <strong>Our Sub-Processors:</strong> We maintain a current list of sub-processors and their locations. 
              You may request this list at any time.
            </p>
          </section>

          {/* Data Breach Notification */}
          <section>
            <h2 className="text-3xl font-bold mb-4">7. Data Breach Notification</h2>
            <p className="text-gray-300 mb-4">
              In the event of a personal data breach, we follow GDPR Article 33 and 34 requirements:
            </p>
            
            <div className="space-y-4">
              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Notification to Clients (Controllers)</h4>
                <p className="text-gray-300 text-sm mb-3">
                  As your data processor, we will notify you of any breach <strong className="text-accent-400">within 24 hours</strong> of 
                  becoming aware, including:
                </p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Nature of the breach and data affected</li>
                  <li>Likely consequences and impact</li>
                  <li>Measures taken to address the breach</li>
                  <li>Recommendations for mitigating harm</li>
                  <li>Contact point for further information</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Your Responsibilities</h4>
                <p className="text-gray-300 text-sm mb-3">
                  As the Data Controller for Share Register Data, you are responsible for:
                </p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Assessing whether to notify your supervisory authority (within 72 hours of awareness)</li>
                  <li>Notifying affected data subjects if high risk to their rights and freedoms</li>
                  <li>Documenting the breach for regulatory compliance</li>
                </ul>
                <p className="text-gray-300 text-sm mt-3">
                  We will assist you in meeting your breach notification obligations.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Our Account Data</h4>
                <p className="text-gray-300 text-sm">
                  For breaches affecting your account data (where we are the Controller), we will notify the Irish Data Protection 
                  Commission within 72 hours and notify you directly if the breach poses high risk to your rights.
                </p>
              </div>
            </div>
          </section>

          {/* Data Protection Impact Assessment */}
          <section>
            <h2 className="text-3xl font-bold mb-4">8. Data Protection Impact Assessments (DPIAs)</h2>
            <p className="text-gray-300 mb-4">
              We conduct DPIAs for high-risk processing activities as required by GDPR Article 35. Our DPIAs cover:
            </p>
            
            <div className="card-glass rounded-xl p-6">
              <ul className="space-y-3 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Large-scale processing</strong> of shareholder data across multiple registers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Systematic monitoring</strong> of investor behaviour and flow patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Automated decision-making</strong> in entity matching algorithms</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Processing of sensitive financial information</strong></span>
                </li>
              </ul>
            </div>

            <p className="text-gray-300 mt-4">
              We update DPIAs annually or when processing activities materially change. Copies are available upon request.
            </p>
          </section>

          {/* Records of Processing */}
          <section>
            <h2 className="text-3xl font-bold mb-4">9. Records of Processing Activities</h2>
            <p className="text-gray-300 mb-4">
              In compliance with GDPR Article 30, we maintain detailed records of all processing activities, including:
            </p>
            
            <div className="card-glass rounded-xl p-6">
              <ul className="list-disc list-inside text-gray-300 space-y-2 text-sm">
                <li>Categories of personal data processed</li>
                <li>Purposes of processing and legal basis</li>
                <li>Categories of data subjects (e.g., shareholders, account holders, Authorised Users)</li>
                <li>Categories of recipients to whom data is disclosed</li>
                <li>International transfers and safeguards</li>
                <li>Retention periods</li>
                <li>Technical and organisational security measures</li>
              </ul>
            </div>

            <p className="text-gray-300 mt-4">
              These records are available to supervisory authorities upon request and to you for audit purposes.
            </p>
          </section>

          {/* Supervisory Authority */}
          <section>
            <h2 className="text-3xl font-bold mb-4">10. Supervisory Authority</h2>
            <p className="text-gray-300 mb-4">
              Our lead supervisory authority is the UK Information Commissioner's Office (ICO):
            </p>
            
            <div className="card-glass rounded-xl p-6">
              <p className="text-gray-300 mb-2"><strong>Information Commissioner's Office (UK)</strong></p>
              <p className="text-gray-400 text-sm">Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF, United Kingdom</p>
              <p className="text-gray-400 text-sm">Phone: +44 (0)303 123 1113</p>
              <p className="text-gray-400 text-sm">Website: <a href="https://www.ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">www.ico.org.uk</a></p>
            </div>

            <p className="text-gray-300 mt-4">
              You have the right to lodge a complaint with the ICO or your local supervisory authority if you believe we've 
              mishandled your personal data or violated data protection laws.
            </p>
          </section>

          {/* Your Obligations as Controller */}
          <section>
            <h2 className="text-3xl font-bold mb-4">11. Your Obligations as Data Controller</h2>
            <p className="text-gray-300 mb-4">
              When you upload Share Register Data, you remain the Data Controller. You must:
            </p>
            
            <div className="space-y-3">
              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">✓ Ensure Legal Basis</strong>
                <p className="text-gray-400 text-sm mt-1">
                  You must have a lawful basis under GDPR to process and share shareholder data with us. This may be legitimate interests 
                  (shareholder communication, investor relations) or legal obligation (beneficial ownership disclosure requirements).
                </p>
              </div>

              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">✓ Provide Privacy Notices</strong>
                <p className="text-gray-400 text-sm mt-1">
                  Shareholders must be informed that their data may be processed for beneficial ownership identification. 
                  This is typically done through your ETF prospectus or shareholder communications.
                </p>
              </div>

              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">✓ Respond to Data Subject Requests</strong>
                <p className="text-gray-400 text-sm mt-1">
                  If shareholders contact you with GDPR requests related to data we process on your behalf, notify us promptly. 
                  We'll assist you in responding within required timelines.
                </p>
              </div>

              <div className="card-glass rounded-lg p-4">
                <strong className="text-white">✓ Maintain Processing Records</strong>
                <p className="text-gray-400 text-sm mt-1">
                  Document your lawful basis, processing purposes, and retention periods for shareholder data in your own 
                  GDPR compliance records.
                </p>
              </div>
            </div>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-3xl font-bold mb-4">12. Updates to Our GDPR Compliance</h2>
            <p className="text-gray-300 mb-4">
              We continuously monitor GDPR developments and update our compliance measures accordingly. Changes may include:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Updates to our DPA based on guidance from supervisory authorities</li>
              <li>Enhanced security measures as technology evolves</li>
              <li>New procedures based on regulatory guidance or case law</li>
              <li>Changes to sub-processor lists</li>
            </ul>
            <p className="text-gray-300 mt-4">
              We will notify you of material changes affecting your obligations or rights.
            </p>
          </section>

          {/* Contact DPO */}
          <section>
            <h2 className="text-3xl font-bold mb-4">13. Contact Our Data Protection Officer</h2>
            <div className="card-glass rounded-xl p-8 bg-primary-500/10 border-primary-500/20">
              <p className="text-gray-300 mb-4">
                For GDPR-related questions, data subject requests, or privacy concerns:
              </p>
              <div className="space-y-2 text-gray-300">
                <p><strong>Email:</strong> <a href="mailto:accounts@etanalytics.co.uk" className="text-primary-400 hover:text-primary-300">accounts@etanalytics.co.uk</a></p>
                <p><strong>Subject Line:</strong> GDPR Enquiry / Data Protection Officer</p>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                We respond to GDPR enquiries within 72 hours during business days.
              </p>
            </div>
          </section>

          {/* Legal Disclaimer */}
          <div className="card-glass rounded-xl p-6 mt-12 bg-yellow-500/10 border-yellow-500/20">
            <p className="text-sm text-gray-300">
              <strong>Legal Notice:</strong> This GDPR compliance page is provided as guidance and should be reviewed by 
              qualified data protection counsel. ETAnalytics recommends consulting with GDPR specialists to ensure full 
              compliance with all applicable data protection regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GDPR

