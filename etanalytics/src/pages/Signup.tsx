import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  FileText,
  CheckCircle,
  Clock,
  CreditCard,
  Shield,
  Zap,
  Check
} from 'lucide-react'

// Plan details matching landing page
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '£80,000',
    period: '/year',
    description: 'For emerging issuers',
    features: [
      'Up to 10 ETF products',
      'Quarterly full analysis',
      'Daily tracking (known entities)',
      'Entity database access',
      'Standard support'
    ],
    etfLimit: 10
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '£150,000',
    period: '/year',
    description: 'For established issuers',
    features: [
      'Up to 50 ETF products',
      'Monthly full analysis',
      'Daily tracking (known entities)',
      'Custom entity tagging',
      'API access',
      'Priority support'
    ],
    highlighted: true,
    etfLimit: 50
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For global leaders',
    features: [
      'Unlimited ETF products',
      'On-demand analysis',
      'Real-time tracking',
      'Custom integrations',
      'Dedicated account team',
      'SLA guarantee'
    ],
    etfLimit: null
  }
]

// Onboarding timeline steps
const TIMELINE_STEPS = [
  {
    id: 1,
    title: 'Application Submitted',
    description: 'Your application has been received and is being reviewed.',
    icon: FileText
  },
  {
    id: 2,
    title: 'Contract Negotiation',
    description: 'We\'ll send you a contract for review. Negotiate terms if needed.',
    icon: Shield
  },
  {
    id: 3,
    title: 'Contract Signed',
    description: 'Both parties sign the agreement.',
    icon: CheckCircle
  },
  {
    id: 4,
    title: 'Documents Received',
    description: 'Submit Articles of Association and signed Permission Letter.',
    icon: FileText
  },
  {
    id: 5,
    title: 'Payment Confirmed',
    description: 'Complete payment to activate your account.',
    icon: CreditCard
  },
  {
    id: 6,
    title: 'Portal Access Granted',
    description: 'Your dedicated Issuer Portal is ready to use!',
    icon: Zap
  }
]

const COUNTRIES = [
  'Ireland', 'United Kingdom', 'Luxembourg', 'Germany', 'France', 
  'Netherlands', 'Switzerland', 'Belgium', 'Italy', 'Spain',
  'Sweden', 'Denmark', 'Norway', 'Finland', 'Austria',
  'United States', 'Canada', 'Other'
]

const Signup = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  
  // Form data
  const [formData, setFormData] = useState({
    company_name: '',
    registration_number: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    country: '',
    selected_plan: searchParams.get('plan') || 'professional',
    num_etfs: '',
    additional_notes: ''
  })

  // Pre-select plan from URL param
  useEffect(() => {
    const planParam = searchParams.get('plan')
    if (planParam && ['starter', 'professional', 'enterprise'].includes(planParam)) {
      setFormData(prev => ({ ...prev, selected_plan: planParam }))
    }
  }, [searchParams])

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const validateStep1 = () => {
    if (!formData.company_name.trim()) return 'Company name is required'
    if (!formData.registration_number.trim()) return 'Registration number is required'
    if (!formData.contact_name.trim()) return 'Contact name is required'
    if (!formData.contact_email.trim()) return 'Email is required'
    if (!formData.contact_email.includes('@')) return 'Please enter a valid email'
    if (!formData.contact_phone.trim()) return 'Phone number is required'
    if (!formData.country) return 'Please select a country'
    return null
  }

  const handleNext = () => {
    if (step === 1) {
      const validationError = validateStep1()
      if (validationError) {
        setError(validationError)
        return
      }
    }
    setStep(prev => Math.min(prev + 1, 3))
  }

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          num_etfs: formData.num_etfs ? parseInt(formData.num_etfs) : null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit application')
      }

      const data = await response.json()
      setAccessToken(data.access_token)
      setSubmitSuccess(true)
    } catch (err) {
      setError('Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success screen after submission
  if (submitSuccess && accessToken) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute inset-0 grid-bg" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-lg text-center"
        >
          <div className="card-glass rounded-2xl p-8">
            <div className="w-20 h-20 rounded-full bg-accent-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-accent-400" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-4">Application Submitted!</h1>
            <p className="text-gray-400 mb-4">
              Thank you for applying to ET Analytics. We'll review your application and send you a contract within 2 business days.
            </p>
            
            <p className="text-sm text-gray-500 mb-8">
              Questions? Contact us at{' '}
              <a href="mailto:accounts@etanalytics.co.uk" className="text-primary-400 hover:text-primary-300 underline">
                accounts@etanalytics.co.uk
              </a>
            </p>

            <div className="bg-dark-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-400 mb-2">Your application tracking link:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-accent-400 bg-dark-900 px-3 py-2 rounded-lg overflow-hidden text-ellipsis">
                  /application-status?token={accessToken}
                </code>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Save this link to check your application status and upload documents.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to={`/application-status?token=${accessToken}`}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                View Application Status <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-4xl">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-semibold text-white">ET Analytics</span>
        </Link>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step >= s
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white'
                    : 'bg-dark-800 text-gray-500'
                }`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 rounded-full ${step > s ? 'bg-accent-500' : 'bg-dark-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-center gap-12 mb-8 text-sm">
          <span className={step === 1 ? 'text-white font-medium' : 'text-gray-500'}>Company Details</span>
          <span className={step === 2 ? 'text-white font-medium' : 'text-gray-500'}>Select Plan</span>
          <span className={step === 3 ? 'text-white font-medium' : 'text-gray-500'}>Review & Submit</span>
        </div>

        {/* Form Card */}
        <div className="card-glass rounded-2xl p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Company Details */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">Company Details</h2>
                <p className="text-gray-400 mb-8">Tell us about your organisation</p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Company Name *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => updateForm('company_name', e.target.value)}
                        placeholder="Acme Asset Management"
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Registration Number *
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        value={formData.registration_number}
                        onChange={(e) => updateForm('registration_number', e.target.value)}
                        placeholder="IE123456"
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Contact Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        value={formData.contact_name}
                        onChange={(e) => updateForm('contact_name', e.target.value)}
                        placeholder="John Smith"
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => updateForm('contact_email', e.target.value)}
                        placeholder="john@acme.com"
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => updateForm('contact_phone', e.target.value)}
                        placeholder="+353 1 234 5678"
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Country *
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <select
                        value={formData.country}
                        onChange={(e) => updateForm('country', e.target.value)}
                        className="w-full bg-dark-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none"
                      >
                        <option value="">Select country...</option>
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Number of ETF Products (optional)
                  </label>
                  <input
                    type="number"
                    value={formData.num_etfs}
                    onChange={(e) => updateForm('num_etfs', e.target.value)}
                    placeholder="How many ETFs do you currently manage?"
                    className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Select Plan */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">Select Your Plan</h2>
                <p className="text-gray-400 mb-8">Choose the plan that fits your needs</p>

                <div className="grid md:grid-cols-3 gap-6">
                  {PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => updateForm('selected_plan', plan.id)}
                      className={`rounded-2xl p-6 cursor-pointer transition-all ${
                        formData.selected_plan === plan.id
                          ? 'bg-gradient-to-b from-primary-500/20 to-dark-800 border-2 border-primary-500'
                          : 'bg-dark-800 border-2 border-transparent hover:border-white/20'
                      }`}
                    >
                      {plan.highlighted && (
                        <div className="text-xs font-medium text-primary-400 mb-2">Most Popular</div>
                      )}
                      
                      <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                      <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                      
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-white">{plan.price}</span>
                        <span className="text-gray-500">{plan.period}</span>
                      </div>

                      <ul className="space-y-2 mb-4">
                        {plan.features.slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                            <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {formData.selected_plan === plan.id && (
                        <div className="flex items-center gap-2 text-primary-400 text-sm font-medium">
                          <Check className="w-4 h-4" />
                          Selected
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Review & Timeline */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">Review & Submit</h2>
                <p className="text-gray-400 mb-8">Review your application and understand the onboarding process</p>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Summary */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Application Summary</h3>
                    <div className="bg-dark-800 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Company</span>
                        <span className="text-white font-medium">{formData.company_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Registration</span>
                        <span className="text-white">{formData.registration_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Contact</span>
                        <span className="text-white">{formData.contact_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email</span>
                        <span className="text-white">{formData.contact_email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Country</span>
                        <span className="text-white">{formData.country}</span>
                      </div>
                      <div className="h-px bg-white/10 my-2" />
                      <div className="flex justify-between">
                        <span className="text-gray-400">Selected Plan</span>
                        <span className="text-primary-400 font-semibold">
                          {PLANS.find(p => p.id === formData.selected_plan)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price</span>
                        <span className="text-white font-semibold">
                          {PLANS.find(p => p.id === formData.selected_plan)?.price}
                          {PLANS.find(p => p.id === formData.selected_plan)?.period}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Additional Notes (optional)
                      </label>
                      <textarea
                        value={formData.additional_notes}
                        onChange={(e) => updateForm('additional_notes', e.target.value)}
                        placeholder="Any specific requirements or questions?"
                        rows={3}
                        className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Onboarding Timeline</h3>
                    <div className="space-y-4">
                      {TIMELINE_STEPS.map((timelineStep, index) => (
                        <div key={timelineStep.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              index === 0 ? 'bg-accent-500/20 text-accent-400' : 'bg-dark-800 text-gray-500'
                            }`}>
                              <timelineStep.icon className="w-5 h-5" />
                            </div>
                            {index < TIMELINE_STEPS.length - 1 && (
                              <div className="w-px h-full bg-dark-700 my-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className={`font-medium ${index === 0 ? 'text-white' : 'text-gray-400'}`}>
                              {timelineStep.title}
                            </div>
                            <div className="text-sm text-gray-500">{timelineStep.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                step === 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="btn-primary px-8 py-3 flex items-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary px-8 py-3 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Back to Home */}
        <p className="text-center text-gray-500 mt-6">
          <Link to="/" className="hover:text-white transition-colors">
            ← Back to Home
          </Link>
          <span className="mx-3">|</span>
          <Link to="/demo-login" className="hover:text-white transition-colors">
            Try Demo Instead
          </Link>
        </p>
        
        {/* Help Contact */}
        <p className="text-center text-gray-500 text-sm mt-4">
          Need help? Email{' '}
          <a href="mailto:accounts@etanalytics.co.uk" className="text-primary-400 hover:text-primary-300 underline">
            accounts@etanalytics.co.uk
          </a>
        </p>
      </div>
    </div>
  )
}

export default Signup

