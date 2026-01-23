import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Eye,
  FileText,
  CheckCircle,
  Clock,
  CreditCard,
  Shield,
  Zap,
  Upload,
  Download,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
  File
} from 'lucide-react'

interface Document {
  id: string
  application_id: string
  doc_type: string
  filename: string
  original_filename: string
  upload_date: string
  file_size: number
}

interface Application {
  id: string
  company_name: string
  registration_number: string
  contact_name: string
  contact_email: string
  contact_phone: string
  country: string
  selected_plan: string
  status: string
  created_at: string
  updated_at: string
  access_token: string
  documents: Document[]
}

const STATUS_STEPS = [
  { id: 'new', label: 'Application Submitted', icon: FileText },
  { id: 'contract_sent', label: 'Contract Sent', icon: Shield },
  { id: 'contract_signed', label: 'Contract Signed', icon: CheckCircle },
  { id: 'docs_pending', label: 'Documents Pending', icon: FileText },
  { id: 'payment_pending', label: 'Payment Pending', icon: CreditCard },
  { id: 'active', label: 'Portal Access Granted', icon: Zap }
]

const REQUIRED_DOCS = [
  {
    type: 'articles_of_association',
    label: 'Articles of Association',
    description: 'Official company registration document'
  },
  {
    type: 'permission_letter',
    label: 'Permission Letter',
    description: 'Signed authorization for disclosure requests'
  }
]

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const ApplicationStatus = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')

  const fetchApplication = useCallback(async () => {
    if (!token) {
      setError('No access token provided')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/applications/status/${token}`)
      if (!response.ok) {
        throw new Error('Application not found')
      }
      const data = await response.json()
      setApplication(data)
    } catch (err) {
      setError('Could not load application. Please check your access link.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchApplication()
  }, [fetchApplication])

  const handleFileUpload = async (docType: string, file: File) => {
    if (!application || !token) return

    setUploading(docType)
    setUploadError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('doc_type', docType)
    formData.append('token', token)

    try {
      const response = await fetch(`/api/applications/${application.id}/documents`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Upload failed')
      }

      // Refresh application data
      await fetchApplication()
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file')
    } finally {
      setUploading(null)
    }
  }

  const getUploadedDoc = (docType: string) => {
    return application?.documents.find(d => d.doc_type === docType)
  }

  const getCurrentStepIndex = () => {
    if (!application) return 0
    const index = STATUS_STEPS.findIndex(s => s.id === application.status)
    return index >= 0 ? index : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading application...</p>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Not Found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link to="/" className="btn-primary px-6 py-3">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  const currentStepIndex = getCurrentStepIndex()
  const isActive = application.status === 'active'

  return (
    <div className="min-h-screen bg-dark-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 mesh-gradient opacity-50" />
      <div className="absolute inset-0 grid-bg" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">ET Analytics</span>
          </Link>
          
          <button
            onClick={fetchApplication}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Application Header */}
        <div className="card-glass rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{application.company_name}</h1>
              <p className="text-gray-400">Application ID: {application.id.slice(0, 8)}...</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              isActive
                ? 'bg-accent-500/20 text-accent-400'
                : application.status === 'rejected'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {isActive ? 'Active' : application.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
            <div>
              <p className="text-gray-500 text-sm">Plan</p>
              <p className="text-white font-medium capitalize">{application.selected_plan}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Submitted</p>
              <p className="text-white font-medium">{formatDate(application.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Last Updated</p>
              <p className="text-white font-medium">{formatDate(application.updated_at)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Contact</p>
              <p className="text-white font-medium">{application.contact_email}</p>
            </div>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="card-glass rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">Application Progress</h2>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-dark-700" />
            <div 
              className="absolute left-5 top-0 w-0.5 bg-gradient-to-b from-accent-500 to-primary-500 transition-all duration-500"
              style={{ height: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
            />

            <div className="space-y-6">
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index < currentStepIndex
                const isCurrent = index === currentStepIndex
                const StepIcon = step.icon

                return (
                  <div key={step.id} className="flex gap-4">
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-accent-500 text-white'
                        : isCurrent
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-800 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className={`font-medium ${
                        isCompleted || isCurrent ? 'text-white' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </div>
                      {isCurrent && !isActive && (
                        <div className="flex items-center gap-2 text-yellow-400 text-sm mt-1">
                          <Clock className="w-4 h-4" />
                          Current Step
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Document Upload Section - Show when docs are needed */}
        {['contract_signed', 'docs_pending'].includes(application.status) && (
          <div className="card-glass rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-2">Required Documents</h2>
            <p className="text-gray-400 text-sm mb-6">
              Please upload the following documents to proceed with your application.
            </p>

            {/* Permission Letter Template Download */}
            <div className="bg-dark-800 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-primary-400" />
                  <div>
                    <p className="text-white font-medium">Permission Letter Template</p>
                    <p className="text-gray-500 text-sm">Download, complete, sign, and upload</p>
                  </div>
                </div>
                <a
                  href="/api/templates/permission-letter"
                  className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {uploadError}
              </div>
            )}

            <div className="space-y-4">
              {REQUIRED_DOCS.map((doc) => {
                const uploadedDoc = getUploadedDoc(doc.type)
                const isUploading = uploading === doc.type

                return (
                  <div key={doc.type} className="bg-dark-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          uploadedDoc ? 'bg-accent-500/20 text-accent-400' : 'bg-dark-700 text-gray-500'
                        }`}>
                          {uploadedDoc ? <CheckCircle className="w-5 h-5" /> : <File className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-white font-medium">{doc.label}</p>
                          <p className="text-gray-500 text-sm">
                            {uploadedDoc 
                              ? `${uploadedDoc.original_filename} (${formatFileSize(uploadedDoc.file_size)})`
                              : doc.description
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        {uploadedDoc ? (
                          <span className="text-accent-400 text-sm font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Uploaded
                          </span>
                        ) : (
                          <label className="btn-primary px-4 py-2 text-sm cursor-pointer flex items-center gap-2">
                            {isUploading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Upload
                              </>
                            )}
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileUpload(doc.type, file)
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Payment Section - Show when payment is needed */}
        {application.status === 'payment_pending' && (
          <div className="card-glass rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-2">Payment Required</h2>
            <p className="text-gray-400 text-sm mb-6">
              Your documents have been received. Please complete payment to activate your portal.
            </p>

            <div className="bg-dark-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Payment for {application.selected_plan} plan</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {application.selected_plan === 'starter' && '£80,000'}
                    {application.selected_plan === 'professional' && '£150,000'}
                    {application.selected_plan === 'enterprise' && 'Custom'}
                  </p>
                </div>
                <a
                  href="mailto:billing@etanalytics.co.uk?subject=Payment%20for%20ET%20Analytics"
                  className="btn-primary px-6 py-3 flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Contact Billing
                </a>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Contact our billing team to arrange payment via bank transfer or invoice.
              </p>
            </div>
          </div>
        )}

        {/* Active Portal Access */}
        {isActive && (
          <div className="card-glass rounded-2xl p-6 mb-8 border-2 border-accent-500/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-accent-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-accent-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Your Portal is Ready!</h2>
                <p className="text-gray-400">Access your dedicated Issuer Dashboard</p>
              </div>
            </div>

            <Link
              to="/issuer"
              className="btn-primary w-full py-4 flex items-center justify-center gap-2"
            >
              Go to Issuer Portal <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Help Section */}
        <div className="text-center text-gray-500 text-sm">
          <p>
            Need help? Contact us at{' '}
            <a href="mailto:accounts@etanalytics.co.uk" className="text-primary-400 hover:underline">
              accounts@etanalytics.co.uk
            </a>
          </p>
          <p className="mt-4">
            <Link to="/" className="hover:text-white transition-colors">
              ← Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ApplicationStatus

