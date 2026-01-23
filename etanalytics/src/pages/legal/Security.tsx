import { Link } from 'react-router-dom'
import { Eye, Shield, Lock, Server, CheckCircle, AlertTriangle, FileText, Users, Database, Eye as EyeIcon, Activity, Zap } from 'lucide-react'

const Security = () => {
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
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Security</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Your share register data is sensitive. We protect it with bank-grade security measures.
          </p>
        </div>

        {/* Security Overview */}
        <div className="card-glass rounded-2xl p-8 mb-12 border border-primary-500/20">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-400 mb-2">256-bit</div>
              <div className="text-sm text-gray-400">AES Encryption</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent-400 mb-2">24/7</div>
              <div className="text-sm text-gray-400">Security Monitoring</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-400 mb-2">SOC 2</div>
              <div className="text-sm text-gray-400">Certified Infrastructure</div>
            </div>
          </div>
        </div>

        <div className="prose prose-invert prose-lg max-w-none space-y-12">
          {/* Infrastructure Security */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Infrastructure Security</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <Server className="w-5 h-5 text-primary-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Cloud Infrastructure</h3>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>EU-based data centres (Ireland, Germany)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>SOC 2 Type II certified providers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>ISO 27001 certified infrastructure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Physical security and access controls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Redundant power, cooling, and networking</span>
                  </li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                    <Database className="w-5 h-5 text-accent-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Data Storage</h3>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Encrypted at rest (AES-256)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Encrypted in transit (TLS 1.3)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Database-level encryption</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Automated backups (encrypted)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Point-in-time recovery capability</span>
                  </li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Network Security</h3>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Web Application Firewall (WAF)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>DDoS protection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Network segmentation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Intrusion Detection System (IDS)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Regular vulnerability scanning</span>
                  </li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-accent-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Encryption Details</h3>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>TLS 1.3 for all connections</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Perfect Forward Secrecy (PFS)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>HSTS (HTTP Strict Transport Security)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Secure key storage (AWS KMS/equivalent)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Bcrypt password hashing (cost factor 12)</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Access Controls */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Access Controls & Authentication</h2>
            
            <div className="space-y-6">
              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">User Authentication</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-primary-400">Authentication Methods</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>Multi-factor authentication (MFA) required for all accounts</li>
                      <li>TOTP or SMS-based 2FA</li>
                      <li>Secure session management</li>
                      <li>Automatic session timeout (30 minutes idle)</li>
                      <li>Password strength requirements enforced</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-accent-400">Password Security</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>Minimum 8 characters</li>
                      <li>Requires upper/lowercase, numbers, symbols</li>
                      <li>Bcrypt hashing (never stored in plaintext)</li>
                      <li>Password reset via secure email verification</li>
                      <li>Protection against brute force attacks</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Role-Based Access Control (RBAC)</h3>
                <p className="text-gray-300 text-sm mb-4">
                  We implement granular permissions based on user roles:
                </p>
                <div className="grid md:grid-cols-4 gap-4 text-sm">
                  <div className="card-glass rounded-lg p-4 bg-primary-500/10">
                    <p className="font-semibold mb-2">Admin</p>
                    <p className="text-gray-400 text-xs">Full access to all features and settings</p>
                  </div>
                  <div className="card-glass rounded-lg p-4 bg-accent-500/10">
                    <p className="font-semibold mb-2">Issuer</p>
                    <p className="text-gray-400 text-xs">Upload registers, view reports</p>
                  </div>
                  <div className="card-glass rounded-lg p-4 bg-primary-500/10">
                    <p className="font-semibold mb-2">Analyst</p>
                    <p className="text-gray-400 text-xs">Process registers, manage workflows</p>
                  </div>
                  <div className="card-glass rounded-lg p-4 bg-accent-500/10">
                    <p className="font-semibold mb-2">View-Only</p>
                    <p className="text-gray-400 text-xs">Read access to reports only</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-4">
                  Each role has minimum necessary permissions. Users can only access data relevant to their function.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Internal Access Controls</h3>
                <p className="text-gray-300 text-sm mb-4">
                  ETAnalytics staff access to production data is strictly controlled:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 text-sm">
                  <li><strong>Principle of Least Privilege:</strong> Staff can only access data necessary for their role</li>
                  <li><strong>Just-In-Time Access:</strong> Temporary elevated permissions only when needed</li>
                  <li><strong>Audit Logging:</strong> All data access is logged with user, timestamp, and action</li>
                  <li><strong>Background Checks:</strong> Security screening for all personnel with data access</li>
                  <li><strong>Confidentiality Agreements:</strong> All staff sign NDAs and data protection agreements</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Application Security */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Application Security</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Secure Development</h3>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Secure coding standards (OWASP Top 10)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Code reviews for all changes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Automated security scanning in CI/CD</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Dependency vulnerability scanning</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Security-focused architecture reviews</span>
                  </li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-accent-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Runtime Protection</h3>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>SQL injection prevention (parameterised queries)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>XSS protection (content security policy)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>CSRF protection (tokens)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Rate limiting and abuse prevention</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Input validation and sanitisation</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Monitoring and Response */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Monitoring & Incident Response</h2>
            
            <div className="space-y-6">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-primary-400" />
                  </div>
                  <h3 className="text-xl font-semibold">24/7 Security Monitoring</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-gray-300">What We Monitor</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>Failed login attempts</li>
                      <li>Unusual access patterns</li>
                      <li>Data export activities</li>
                      <li>System performance anomalies</li>
                      <li>API abuse or suspicious requests</li>
                      <li>Infrastructure health</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-gray-300">Alert Triggers</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>Multiple failed login attempts</li>
                      <li>Access from unusual locations</li>
                      <li>Large data downloads</li>
                      <li>Privilege escalation attempts</li>
                      <li>Configuration changes</li>
                      <li>Error rate spikes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Incident Response Plan</h3>
                <p className="text-gray-300 text-sm mb-4">
                  We maintain a documented incident response plan with clear procedures:
                </p>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl font-bold text-red-400">1</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">Detect</p>
                    <p className="text-gray-400 text-xs">Identify and assess incident</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl font-bold text-yellow-400">2</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">Contain</p>
                    <p className="text-gray-400 text-xs">Isolate affected systems</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl font-bold text-primary-400">3</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">Resolve</p>
                    <p className="text-gray-400 text-xs">Fix vulnerability, restore service</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-accent-500/20 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl font-bold text-accent-400">4</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">Notify</p>
                    <p className="text-gray-400 text-xs">Inform clients within 24 hours</p>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-6 bg-red-500/10 border-red-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-2">Data Breach Protocol</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      If we detect a data breach affecting your data:
                    </p>
                    <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4 text-sm">
                      <li><strong>Within 24 hours:</strong> We notify you with preliminary details</li>
                      <li><strong>Within 72 hours:</strong> Full incident report with impact assessment</li>
                      <li><strong>Ongoing:</strong> Regular updates until resolved</li>
                      <li><strong>Post-incident:</strong> Root cause analysis and remediation plan</li>
                    </ul>
                    <p className="text-gray-300 text-sm mt-3">
                      We assist you in determining whether notification to supervisory authorities or data subjects is required.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Compliance & Auditing */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Compliance & Auditing</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Certifications & Standards</h3>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>ISO 27001:</strong> Information Security Management (in progress)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>SOC 2 Type II:</strong> Service organisation controls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>GDPR Compliant:</strong> Verified by external auditors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Cyber Essentials:</strong> UK Government scheme (pending)</span>
                  </li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                    <EyeIcon className="w-5 h-5 text-accent-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Security Assessments</h3>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Penetration Testing:</strong> Annual third-party pen tests</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Vulnerability Scanning:</strong> Weekly automated scans</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Security Audits:</strong> Quarterly internal reviews</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Compliance Reviews:</strong> Annual GDPR compliance audit</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Protection */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Data Protection Measures</h2>
            
            <div className="space-y-6">
              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Data Lifecycle Security</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-primary-400">1. Data at Rest</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>AES-256 encryption for all databases</li>
                      <li>Encrypted file storage</li>
                      <li>Encrypted backup archives</li>
                      <li>Secure key management (separate from data)</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-accent-400">2. Data in Transit</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>TLS 1.3 for all connections (TLS 1.2 minimum)</li>
                      <li>Certificate pinning for API clients</li>
                      <li>Secure websocket connections</li>
                      <li>VPN for internal communications</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-primary-400">3. Data in Use</h4>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                      <li>Memory encryption where available</li>
                      <li>Secure processing environments</li>
                      <li>No storage of data in logs</li>
                      <li>Secure credential management</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Data Retention & Deletion</h3>
                <p className="text-gray-300 text-sm mb-4">
                  We follow strict data retention policies:
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-20 text-gray-500 flex-shrink-0">Active</div>
                    <div className="text-gray-300">Data retained and accessible during your subscription</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-20 text-gray-500 flex-shrink-0">Post-termination</div>
                    <div className="text-gray-300">90-day grace period for data export, then deleted</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-20 text-gray-500 flex-shrink-0">Backups</div>
                    <div className="text-gray-300">Purged from backups within 30 days of deletion request</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-20 text-gray-500 flex-shrink-0">Logs</div>
                    <div className="text-gray-300">Security logs retained 12 months, then automatically deleted</div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-4">
                  <strong>Secure Deletion:</strong> We use cryptographic erasure (destroy encryption keys) and overwriting 
                  methods to ensure data cannot be recovered.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Backup & Recovery</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Automated Backups:</strong> Daily incremental, weekly full backups</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Geo-Redundant:</strong> Backups stored in multiple EU regions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Encrypted:</strong> All backups encrypted at rest</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Tested:</strong> Monthly restore tests to verify integrity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>RTO/RPO:</strong> 4-hour recovery time, &lt;1 hour data loss maximum</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Third-Party Security */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Third-Party & Vendor Security</h2>
            
            <div className="card-glass rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Sub-Processor Vetting</h3>
              <p className="text-gray-300 text-sm mb-4">
                All third-party vendors with access to data undergo security assessments:
              </p>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                  <span>Security questionnaires and audits</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                  <span>Review of certifications (SOC 2, ISO 27001)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                  <span>Data Processing Agreements with all sub-processors</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                  <span>Annual re-assessment of security posture</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                  <span>Contractual security and confidentiality obligations</span>
                </li>
              </ul>
            </div>

            <div className="card-glass rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4">Current Sub-Processors</h3>
              <p className="text-gray-400 text-sm mb-4">
                We maintain a current list of sub-processors who may access or process your data:
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-gray-400">Service</th>
                    <th className="text-left py-2 text-gray-400">Provider</th>
                    <th className="text-left py-2 text-gray-400">Location</th>
                    <th className="text-left py-2 text-gray-400">Purpose</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="py-3">Cloud Hosting</td>
                    <td className="py-3">AWS / Google Cloud</td>
                    <td className="py-3">EU (Ireland)</td>
                    <td className="py-3">Infrastructure</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3">Email</td>
                    <td className="py-3">Mailgun</td>
                    <td className="py-3">EU</td>
                    <td className="py-3">Transactional emails</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3">Monitoring</td>
                    <td className="py-3">Sentry / DataDog</td>
                    <td className="py-3">EU/US (SCC)</td>
                    <td className="py-3">Error tracking</td>
                  </tr>
                  <tr>
                    <td className="py-3">Support</td>
                    <td className="py-3">Intercom</td>
                    <td className="py-3">EU/US (SCC)</td>
                    <td className="py-3">Customer support</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-gray-400 text-sm mt-4">
                Updated list available at: <a href="mailto:accounts@etanalytics.co.uk" className="text-primary-400 hover:text-primary-300">accounts@etanalytics.co.uk</a>
              </p>
            </div>
          </section>

          {/* Business Continuity */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Business Continuity & Disaster Recovery</h2>
            
            <div className="card-glass rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Availability Commitment</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-primary-500/10">
                  <div className="text-2xl font-bold text-primary-400 mb-1">99.9%</div>
                  <div className="text-xs text-gray-400">Uptime SLA</div>
                  <div className="text-xs text-gray-500 mt-1">(Professional & Enterprise)</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent-500/10">
                  <div className="text-2xl font-bold text-accent-400 mb-1">&lt;4 hrs</div>
                  <div className="text-xs text-gray-400">Recovery Time</div>
                  <div className="text-xs text-gray-500 mt-1">(RTO)</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-primary-500/10">
                  <div className="text-2xl font-bold text-primary-400 mb-1">&lt;1 hr</div>
                  <div className="text-xs text-gray-400">Data Loss</div>
                  <div className="text-xs text-gray-500 mt-1">(RPO)</div>
                </div>
              </div>
              
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                  <span><strong>Multi-Region Deployment:</strong> Services deployed across multiple availability zones</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                  <span><strong>Automated Failover:</strong> Automatic switching to backup systems</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                  <span><strong>Load Balancing:</strong> Distributed traffic across multiple servers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                  <span><strong>Health Monitoring:</strong> Continuous service health checks</span>
                </li>
              </ul>
            </div>

            <div className="card-glass rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4">Disaster Recovery Plan</h3>
              <p className="text-gray-300 text-sm mb-4">
                Our documented disaster recovery plan covers:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 text-sm">
                <li>Data centre failure or regional outage</li>
                <li>Cyberattack or ransomware incident</li>
                <li>Natural disaster or force majeure event</li>
                <li>Critical system or infrastructure failure</li>
                <li>Key personnel unavailability</li>
              </ul>
              <p className="text-gray-300 text-sm mt-4">
                We test our DR plan quarterly and update it based on lessons learned.
              </p>
            </div>
          </section>

          {/* Employee Security */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Employee Security & Training</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-400" />
                  </div>
                  <h3 className="text-xl font-semibold">HR Security Practices</h3>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Background checks for all employees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Signed confidentiality and data protection agreements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Clear desk and screen lock policies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Immediate access revocation upon termination</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span>Device security requirements (encryption, MDM)</span>
                  </li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-accent-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Security Training</h3>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Onboarding:</strong> Security and data protection training for all new hires</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Annual:</strong> Mandatory refresher training for all staff</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Phishing Tests:</strong> Regular simulated phishing campaigns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Incident Drills:</strong> Quarterly incident response exercises</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
                    <span><strong>Updates:</strong> Training on new threats and vulnerabilities</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Responsible Disclosure */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Responsible Disclosure</h2>
            
            <div className="card-glass rounded-xl p-8 border border-accent-500/20">
              <h3 className="text-xl font-semibold mb-4">Security Researchers Welcome</h3>
              <p className="text-gray-300 mb-4">
                We value the security research community and welcome responsible disclosure of vulnerabilities. 
                If you discover a security issue:
              </p>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-white font-medium mb-2">1. Report Privately</p>
                  <p className="text-gray-400">
                    Email <a href="mailto:accounts@etanalytics.co.uk" className="text-primary-400">accounts@etanalytics.co.uk</a> with 
                    subject "Security Vulnerability Report". Include:
                  </p>
                  <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 mt-2">
                    <li>Description of the vulnerability</li>
                    <li>Steps to reproduce</li>
                    <li>Potential impact</li>
                    <li>Your contact information</li>
                  </ul>
                </div>

                <div>
                  <p className="text-white font-medium mb-2">2. Allow Time to Fix</p>
                  <p className="text-gray-400">
                    Please give us 90 days to address the issue before public disclosure. We'll keep you updated on progress.
                  </p>
                </div>

                <div>
                  <p className="text-white font-medium mb-2">3. Act Responsibly</p>
                  <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                    <li>Don't access or modify client data</li>
                    <li>Don't perform testing that could harm availability</li>
                    <li>Don't use automated scanners without permission</li>
                    <li>Don't publicly disclose vulnerabilities before we've fixed them</li>
                  </ul>
                </div>

                <div>
                  <p className="text-white font-medium mb-2">4. Recognition</p>
                  <p className="text-gray-400">
                    We recognise responsible researchers in our security acknowledgements (with your permission) and may offer 
                    rewards for critical vulnerabilities.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Security Roadmap */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Our Security Roadmap</h2>
            <p className="text-gray-300 mb-6">
              We continuously invest in security. Upcoming initiatives include:
            </p>
            
            <div className="space-y-4">
              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400">Q1</div>
                  Q1 2026
                </h4>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Complete ISO 27001 certification</li>
                  <li>Implement hardware security modules (HSM) for key management</li>
                  <li>Deploy advanced threat detection (machine learning-based)</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-accent-500/20 flex items-center justify-center text-xs font-bold text-accent-400">Q2</div>
                  Q2 2026
                </h4>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Enhanced audit logging and SIEM integration</li>
                  <li>Customer-managed encryption keys (CMEK) option for Enterprise</li>
                  <li>Security Operations Centre (SOC) partnership</li>
                </ul>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400">H2</div>
                  H2 2026
                </h4>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4 text-sm">
                  <li>Bug bounty programme launch</li>
                  <li>Advanced DLP (Data Loss Prevention) controls</li>
                  <li>Cyber insurance coverage expansion</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Questions */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Frequently Asked Security Questions</h2>
            
            <div className="space-y-4">
              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Q: Where is our data stored?</h4>
                <p className="text-gray-400 text-sm">
                  <strong>A:</strong> All client data is stored in EU data centres (primarily Ireland and Germany). We do not store 
                  data outside the European Economic Area except where you explicitly consent or we use Standard Contractual Clauses.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Q: Who can access our share register data?</h4>
                <p className="text-gray-400 text-sm">
                  <strong>A:</strong> Only authorised ETAnalytics personnel with a legitimate need (e.g., analysts performing your 
                  analysis). Access is logged and audited. We never share your data with third parties except as required to perform 
                  Services (e.g., sending disclosure requests to custodians).
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Q: What happens if you experience a data breach?</h4>
                <p className="text-gray-400 text-sm">
                  <strong>A:</strong> We notify you within 24 hours with details of what happened, what data was affected, and steps 
                  we're taking. We assist you in determining whether supervisory authority notification is required. See our 
                  <Link to="/legal/gdpr" className="text-primary-400 hover:text-primary-300 ml-1">GDPR page</Link> for full breach 
                  notification procedures.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Q: Can we audit your security controls?</h4>
                <p className="text-gray-400 text-sm">
                  <strong>A:</strong> Yes. Professional and Enterprise clients may conduct security audits annually (or as required 
                  by your own compliance obligations). We provide audit questionnaires, certifications, and can facilitate on-site 
                  or remote audits with reasonable notice.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Q: Do you have cyber insurance?</h4>
                <p className="text-gray-400 text-sm">
                  <strong>A:</strong> Yes. We maintain cyber liability insurance coverage including data breach response, business 
                  interruption, and professional liability. Coverage limits available upon request.
                </p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h4 className="font-semibold mb-2">Q: What about data residency requirements?</h4>
                <p className="text-gray-400 text-sm">
                  <strong>A:</strong> We can accommodate specific data residency requirements for Enterprise clients (e.g., data must 
                  stay in Ireland only). Contact us to discuss custom deployment options.
                </p>
              </div>
            </div>
          </section>

          {/* Security Contacts */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Security Contacts</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-8 bg-red-500/10 border-red-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <h3 className="text-xl font-semibold">Report a Security Issue</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  If you discover a security vulnerability or incident:
                </p>
                <p className="text-red-400 font-medium">
                  <Mail className="w-4 h-4 inline mr-2" />
                  <a href="mailto:accounts@etanalytics.co.uk?subject=URGENT: Security Issue">accounts@etanalytics.co.uk</a>
                </p>
                <p className="text-sm text-gray-400 mt-2">Subject: URGENT: Security Issue</p>
                <p className="text-sm text-gray-400 mt-4">
                  We respond to security reports within 24 hours, typically much faster.
                </p>
              </div>

              <div className="card-glass rounded-xl p-8 bg-primary-500/10 border-primary-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-primary-400" />
                  <h3 className="text-xl font-semibold">Request Security Documentation</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  For security questionnaires, certifications, or compliance documentation:
                </p>
                <p className="text-primary-400 font-medium">
                  <Mail className="w-4 h-4 inline mr-2" />
                  <a href="mailto:accounts@etanalytics.co.uk?subject=Security Documentation Request">accounts@etanalytics.co.uk</a>
                </p>
                <p className="text-sm text-gray-400 mt-2">Subject: Security Documentation Request</p>
                <p className="text-sm text-gray-400 mt-4">
                  We provide: SOC 2 reports, penetration test summaries, security architecture diagrams, DPA templates.
                </p>
              </div>
            </div>
          </section>

          {/* Trust Centre */}
          <section className="mt-12">
            <div className="card-glass rounded-2xl p-12 text-center border border-primary-500/20">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Security is a Partnership</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                We build the infrastructure. You control access. Together, we protect your data.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup" className="btn-primary px-8 py-4">
                  Get Started Securely
                </Link>
                <a 
                  href="mailto:accounts@etanalytics.co.uk?subject=Security Questions" 
                  className="btn-secondary px-8 py-4"
                >
                  Ask Security Questions
                </a>
              </div>
            </div>
          </section>

          {/* Legal Disclaimer */}
          <div className="card-glass rounded-xl p-6 mt-12 bg-yellow-500/10 border-yellow-500/20">
            <p className="text-sm text-gray-300">
              <strong>Disclaimer:</strong> This security page describes current practices and planned initiatives. 
              Security measures may change as technology and threats evolve. For the most current information or specific 
              security requirements, please contact our security team.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Security

