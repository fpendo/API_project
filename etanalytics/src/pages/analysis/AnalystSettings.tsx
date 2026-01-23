/**
 * Analyst Settings Component
 * Settings panel for analyst configuration (Demo Portal)
 */
import { useState } from 'react'
import { Settings, Bell, Save, Lock, RefreshCw, Play, Upload } from 'lucide-react'

const AnalystSettings = () => {
  const [settings, setSettings] = useState({
    notifyNewRegisters: true,
    notifyMatchComplete: true,
    autoRefreshQueue: true,
    refreshInterval: 30,
    defaultConfidenceThreshold: 80,
    autoStartMatching: false
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('analyst_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleChange = (key: keyof typeof settings, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
          <p className="text-gray-400">Configure your analyst dashboard preferences</p>
        </div>
        <button 
          onClick={handleSave}
          className={`btn-primary flex items-center gap-2 ${saved ? 'bg-accent-500' : ''}`}
        >
          {saved ? (
            <>
              <span className="w-4 h-4 rounded-full bg-white" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Settings
            </>
          )}
        </button>
      </div>

      {/* Demo Mode Info */}
      <div className="card-glass rounded-xl p-6 border border-primary-500/30 bg-primary-500/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Demo Mode Active</h3>
            <p className="text-sm text-gray-400">You're exploring the platform with simulated data</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-dark-800/50 rounded-lg">
            <Upload className="w-5 h-5 text-accent-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Register Uploads Work!</p>
              <p className="text-sm text-gray-400">
                Upload sample registers to see the full analysis workflow. The system will process 
                them using simulated entity matching and disclosure responses.
              </p>
            </div>
          </div>
          
          <p className="text-xs text-gray-500">
            Want real data? <a href="/signup" className="text-primary-400 hover:text-primary-300 underline">Sign up for a live account</a> to 
            connect your actual share registers and get real ownership insights.
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className="card-glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <p className="text-sm text-gray-400">Configure alert preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg cursor-pointer">
            <div>
              <span className="text-gray-300">New Register Alerts</span>
              <p className="text-xs text-gray-500 mt-1">Get notified when new registers arrive</p>
            </div>
            <button
              onClick={() => handleChange('notifyNewRegisters', !settings.notifyNewRegisters)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.notifyNewRegisters ? 'bg-primary-500' : 'bg-dark-700'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.notifyNewRegisters ? 'translate-x-6' : ''
              }`} />
            </button>
          </label>

          <label className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg cursor-pointer">
            <div>
              <span className="text-gray-300">Match Complete Alerts</span>
              <p className="text-xs text-gray-500 mt-1">Get notified when entity matching completes</p>
            </div>
            <button
              onClick={() => handleChange('notifyMatchComplete', !settings.notifyMatchComplete)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.notifyMatchComplete ? 'bg-primary-500' : 'bg-dark-700'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.notifyMatchComplete ? 'translate-x-6' : ''
              }`} />
            </button>
          </label>
        </div>
      </div>

      {/* Queue Settings */}
      <div className="card-glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Queue Settings</h3>
            <p className="text-sm text-gray-400">Configure analysis queue behaviour</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg cursor-pointer">
            <div>
              <span className="text-gray-300">Auto-refresh Queue</span>
              <p className="text-xs text-gray-500 mt-1">Automatically refresh queue data</p>
            </div>
            <button
              onClick={() => handleChange('autoRefreshQueue', !settings.autoRefreshQueue)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.autoRefreshQueue ? 'bg-primary-500' : 'bg-dark-700'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.autoRefreshQueue ? 'translate-x-6' : ''
              }`} />
            </button>
          </label>

          {settings.autoRefreshQueue && (
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Refresh Interval</span>
                <span className="text-white font-medium">{settings.refreshInterval}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={settings.refreshInterval}
                onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          <div className="p-4 bg-dark-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Confidence Threshold</span>
              <span className="text-white font-medium">{settings.defaultConfidenceThreshold}%</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">Minimum confidence for auto-matching</p>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={settings.defaultConfidenceThreshold}
              onChange={(e) => handleChange('defaultConfidenceThreshold', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Demo Session */}
      <div className="card-glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Demo Session</h3>
            <p className="text-sm text-gray-400">Your demo access details</p>
          </div>
        </div>

        <div className="p-4 bg-dark-800/50 rounded-lg">
          <p className="text-gray-300 mb-2">Session Type</p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-primary-500/20 text-primary-400 text-xs font-medium">DEMO</span>
            <span className="text-sm text-gray-400">No account required</span>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Demo sessions use simulated data. Your settings are saved locally in your browser.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AnalystSettings
