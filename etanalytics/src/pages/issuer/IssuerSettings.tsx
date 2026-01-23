/**
 * Issuer Settings Component
 * Settings panel for issuer configuration (Demo Portal)
 */
import { useState } from 'react'
import { Settings, Bell, Building2, Save, Lock, Shield, Play, Upload, FileText } from 'lucide-react'

const IssuerSettings = () => {
  const [settings, setSettings] = useState({
    // Notification settings
    notifyOnUpload: true,
    notifyOnAnalysis: true,
    notifyOnReport: true,
    emailDigest: 'weekly',
    
    // Company info (demo)
    companyName: 'Demo Issuer',
    contactEmail: 'demo@example.com',
    
    // Display preferences
    defaultCurrency: 'EUR',
    dateFormat: 'DD/MM/YYYY'
  })

  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security'>('general')

  const handleSave = () => {
    localStorage.setItem('issuer_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleChange = (key: keyof typeof settings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
          <p className="text-gray-400">Manage your demo account preferences</p>
        </div>
        <button 
          onClick={handleSave}
          className={`btn-primary flex items-center gap-2 ${saved ? 'bg-accent-500' : ''}`}
        >
          {saved ? 'Saved!' : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        {[
          { id: 'general', label: 'General', icon: Settings },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'security', label: 'Security', icon: Shield }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === tab.id 
                ? 'bg-primary-500/20 text-primary-400' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Demo Mode Info */}
          <div className="card-glass rounded-xl p-6 border border-primary-500/30 bg-primary-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Demo Mode Active</h3>
                <p className="text-sm text-gray-400">Explore all features with simulated data</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-dark-800/50 rounded-lg">
                <Upload className="w-5 h-5 text-accent-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Upload Test Registers</p>
                  <p className="text-sm text-gray-400">
                    Try uploading a CSV share register to see the complete analysis workflow. 
                    The demo will simulate entity matching and generate a sample report.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-dark-800/50 rounded-lg">
                <FileText className="w-5 h-5 text-accent-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Sample Register Format</p>
                  <p className="text-sm text-gray-400">
                    Your CSV should include: Account Name, Account Number, and share quantities for each ETF (ISIN columns).
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-gray-500">
                Ready for real insights? <a href="/signup" className="text-primary-400 hover:text-primary-300 underline">Sign up for a live account</a> to 
                analyze your actual share registers.
              </p>
            </div>
          </div>

          {/* Demo Company Info */}
          <div className="card-glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Demo Company Profile</h3>
                <p className="text-sm text-gray-400">Customize your demo experience</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Company Name</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Your Company Name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email (for demo)</label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="you@company.com"
                />
              </div>
            </div>
          </div>

          {/* Display Preferences */}
          <div className="card-glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Display Preferences</h3>
                <p className="text-sm text-gray-400">Customize your dashboard view</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Currency</label>
                <select
                  value={settings.defaultCurrency}
                  onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Date Format</label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => handleChange('dateFormat', e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <div className="card-glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>
              <p className="text-sm text-gray-400">These would apply in the live version</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { key: 'notifyOnUpload', label: 'Register Upload Confirmation', desc: 'When a new register is uploaded' },
              { key: 'notifyOnAnalysis', label: 'Analysis Complete', desc: 'When analysis is finished' },
              { key: 'notifyOnReport', label: 'Report Available', desc: 'When a new report is ready' }
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg cursor-pointer">
                <div>
                  <span className="text-gray-300">{item.label}</span>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
                <button
                  onClick={() => handleChange(item.key as keyof typeof settings, !settings[item.key as keyof typeof settings])}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings[item.key as keyof typeof settings] ? 'bg-primary-500' : 'bg-dark-700'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings[item.key as keyof typeof settings] ? 'translate-x-6' : ''
                  }`} />
                </button>
              </label>
            ))}
            
            <div className="pt-4 border-t border-white/10">
              <label className="block text-sm text-gray-400 mb-2">Email Digest Frequency</label>
              <select
                value={settings.emailDigest}
                onChange={(e) => handleChange('emailDigest', e.target.value)}
                className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-2 text-white"
              >
                <option value="instant">Instant</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
                <option value="never">Never</option>
              </select>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              In demo mode, notifications are simulated. Sign up for a live account to receive real email alerts.
            </p>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="card-glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Demo Session</h3>
                <p className="text-sm text-gray-400">Your demo access information</p>
              </div>
            </div>
            
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2 py-1 rounded bg-primary-500/20 text-primary-400 text-xs font-medium">DEMO MODE</span>
                <span className="text-sm text-gray-400">No login required</span>
              </div>
              <p className="text-gray-300 mb-1">Session</p>
              <p className="text-sm text-gray-500">
                Demo sessions don't require authentication. Your settings are stored locally in your browser
                and will persist until you clear your browser data.
              </p>
            </div>
          </div>

          <div className="card-glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Data Privacy</h3>
                <p className="text-sm text-gray-400">How your demo data is handled</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-gray-400">
              <p>• All demo data is stored locally in your browser</p>
              <p>• Uploaded registers are processed client-side only</p>
              <p>• No data is sent to external servers in demo mode</p>
              <p>• Clearing browser data removes all demo information</p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500">
                Live accounts use enterprise-grade security with encrypted data storage. 
                <a href="/signup" className="text-primary-400 hover:text-primary-300 ml-1">Learn more →</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IssuerSettings
