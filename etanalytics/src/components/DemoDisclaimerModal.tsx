import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'

const DemoDisclaimerModal = () => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Show disclaimer on first visit to any portal (per session)
    const hasSeenDisclaimer = sessionStorage.getItem('eta_demo_disclaimer_seen') === 'true'
    
    if (!hasSeenDisclaimer) {
      // Small delay so modal appears after portal loads
      setTimeout(() => setIsOpen(true), 500)
    }
  }, [])

  const handleClose = () => {
    sessionStorage.setItem('eta_demo_disclaimer_seen', 'true')
    setIsOpen(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-lg"
          >
            <div className="card-glass rounded-2xl p-8 relative">
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-accent-500/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-accent-400" />
                </div>
              </div>

              {/* Content */}
              <h2 className="text-2xl font-bold text-white text-center mb-4">
                Important Notice
              </h2>
              
              <div className="space-y-4 text-gray-300 text-center">
                <p className="text-lg">
                  Although the <span className="text-white font-semibold">clients shown are real organisations</span>, 
                  all share register data, shareholdings, and ownership analytics displayed are <span className="text-accent-400 font-semibold">completely fabricated for demonstration purposes</span>.
                </p>
                
                <div className="p-4 bg-dark-800/50 rounded-xl border border-accent-500/20">
                  <p className="text-sm text-gray-400">
                    This platform showcases our capabilities using simulated data that reflects realistic patterns and structures. 
                    For production access with actual register data, please contact our team.
                  </p>
                </div>
              </div>

              {/* Button */}
              <button
                onClick={handleClose}
                className="w-full mt-6 py-3 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-400 hover:to-accent-500 text-white font-medium rounded-xl transition-all"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default DemoDisclaimerModal


