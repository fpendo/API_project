import { useState, useEffect, useCallback } from 'react'
import { Link, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Eye,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Shield,
  Zap,
  Search,
  Filter,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  Globe,
  Calendar,
  Download,
  Trash2,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  TrendingUp
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
  num_etfs?: number
  additional_notes?: string
  status: string
  created_at: string
  updated_at: string
  documents?: Document[]
}

interface PipelineStats {
  by_status: Record<string, number>
  by_plan: Record<string, number>
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'New', color: 'blue', icon: FileText },
  contract_sent: { label: 'Contract Sent', color: 'yellow', icon: Shield },
  contract_signed: { label: 'Contract Signed', color: 'purple', icon: CheckCircle },
  docs_pending: { label: 'Docs Pending', color: 'orange', icon: FileText },
  payment_pending: { label: 'Payment Pending', color: 'pink', icon: CreditCard },
  active: { label: 'Active', color: 'green', icon: Zap },
  rejected: { label: 'Rejected', color: 'red', icon: AlertCircle }
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'text-blue-400 bg-blue-500/20',
  professional: 'text-purple-400 bg-purple-500/20',
  enterprise: 'text-yellow-400 bg-yellow-500/20'
}

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

// Main Client Services Portal
const ClientServices = () => {
  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-900 border-r border-white/5 flex flex-col">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 p-6 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">ET Analytics</span>
        </Link>

        {/* Portal Badge */}
        <div className="p-4 mx-4 mt-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Client Services</div>
              <div className="text-xs text-gray-500">Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/client-services"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-500/20 text-primary-400"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/client-services/applications"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <FileText className="w-5 h-5" />
            <span>Applications</span>
          </Link>
        </nav>

        {/* Switch Portal */}
        <div className="p-4 border-t border-white/5">
          <Link
            to="/analysis"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <Building2 className="w-5 h-5" />
            <span>Switch to Analyst</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="applications" element={<ApplicationsList />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
        </Routes>
      </main>
    </div>
  )
}

// Dashboard with pipeline stats
const Dashboard = () => {
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [recentApps, setRecentApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, appsRes] = await Promise.all([
          fetch('/api/applications/pipeline/stats', { credentials: 'include' }),
          fetch('/api/applications', { credentials: 'include' })
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }

        if (appsRes.ok) {
          const appsData = await appsRes.json()
          setRecentApps(appsData.applications.slice(0, 5))
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Client Services Dashboard</h1>
        <p className="text-gray-400">Manage applications, contracts, and onboarding</p>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = stats?.by_status[status] || 0
          const Icon = config.icon

          return (
            <div
              key={status}
              className="card-glass rounded-xl p-4 cursor-pointer hover:border-white/20 transition-all"
              onClick={() => navigate(`/client-services/applications?status=${status}`)}
            >
              <div className={`w-10 h-10 rounded-lg bg-${config.color}-500/20 flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 text-${config.color}-400`} />
              </div>
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-gray-500">{config.label}</div>
            </div>
          )
        })}
      </div>

      {/* Plan Breakdown */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {['starter', 'professional', 'enterprise'].map((plan) => {
          const count = stats?.by_plan[plan] || 0

          return (
            <div key={plan} className="card-glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${PLAN_COLORS[plan]}`}>
                  {plan}
                </span>
                <TrendingUp className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{count}</div>
              <div className="text-gray-500 text-sm">applications</div>
            </div>
          )
        })}
      </div>

      {/* Recent Applications */}
      <div className="card-glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Recent Applications</h2>
          <Link to="/client-services/applications" className="text-primary-400 text-sm hover:underline">
            View All →
          </Link>
        </div>

        {recentApps.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No applications yet</p>
        ) : (
          <div className="space-y-3">
            {recentApps.map((app) => {
              const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.new
              const Icon = statusConfig.icon

              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-4 bg-dark-800 rounded-xl cursor-pointer hover:bg-dark-700 transition-colors"
                  onClick={() => navigate(`/client-services/applications/${app.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-${statusConfig.color}-500/20 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${statusConfig.color}-400`} />
                    </div>
                    <div>
                      <div className="text-white font-medium">{app.company_name}</div>
                      <div className="text-gray-500 text-sm">{app.contact_email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${PLAN_COLORS[app.selected_plan]}`}>
                      {app.selected_plan}
                    </span>
                    <div className="text-gray-500 text-xs mt-1">{formatDate(app.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Applications List
const ApplicationsList = () => {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const navigate = useNavigate()

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    try {
      const url = statusFilter !== 'all'
        ? `/api/applications?status=${statusFilter}`
        : '/api/applications'
      
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications)
      }
    } catch (err) {
      console.error('Failed to fetch applications')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const filteredApps = applications.filter(app =>
    app.company_name.toLowerCase().includes(search.toLowerCase()) ||
    app.contact_email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Applications</h1>
          <p className="text-gray-400">Manage all signup applications</p>
        </div>
        <button
          onClick={fetchApplications}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company or email..."
            className="w-full bg-dark-800 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="card-glass rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No applications found</p>
        </div>
      ) : (
        <div className="card-glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Company</th>
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Contact</th>
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Plan</th>
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Status</th>
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => {
                const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.new

                return (
                  <tr
                    key={app.id}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => navigate(`/client-services/applications/${app.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{app.company_name}</div>
                      <div className="text-gray-500 text-sm">{app.registration_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">{app.contact_name}</div>
                      <div className="text-gray-500 text-sm">{app.contact_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm capitalize ${PLAN_COLORS[app.selected_plan]}`}>
                        {app.selected_plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm bg-${statusConfig.color}-500/20 text-${statusConfig.color}-400`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Application Detail
const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const navigate = useNavigate()

  const fetchApplication = useCallback(async () => {
    if (!id) return
    
    try {
      const response = await fetch(`/api/applications/${id}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setApplication(data)
      }
    } catch (err) {
      console.error('Failed to fetch application')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchApplication()
  }, [fetchApplication])

  const updateStatus = async (newStatus: string) => {
    if (!id) return
    
    setUpdating(true)
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        await fetchApplication()
      }
    } catch (err) {
      console.error('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Application not found</p>
          <button
            onClick={() => navigate('/client-services/applications')}
            className="mt-4 text-primary-400 hover:underline"
          >
            ← Back to Applications
          </button>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.new

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/client-services/applications')}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{application.company_name}</h1>
          <p className="text-gray-400">Application ID: {application.id}</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium bg-${statusConfig.color}-500/20 text-${statusConfig.color}-400`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Details */}
          <div className="card-glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Company Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-sm">Company Name</p>
                  <p className="text-white">{application.company_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-sm">Registration Number</p>
                  <p className="text-white">{application.registration_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-sm">Country</p>
                  <p className="text-white">{application.country}</p>
                </div>
              </div>
              {application.num_etfs && (
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-gray-500 text-sm">Number of ETFs</p>
                    <p className="text-white">{application.num_etfs}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="card-glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-sm">Contact Name</p>
                  <p className="text-white">{application.contact_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-sm">Email</p>
                  <a href={`mailto:${application.contact_email}`} className="text-primary-400 hover:underline">
                    {application.contact_email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-sm">Phone</p>
                  <p className="text-white">{application.contact_phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="card-glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Documents</h2>
            {!application.documents || application.documents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No documents uploaded yet</p>
            ) : (
              <div className="space-y-3">
                {application.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-white">{doc.original_filename}</p>
                        <p className="text-gray-500 text-sm">
                          {doc.doc_type.replace('_', ' ')} • {formatFileSize(doc.file_size)} • {formatDate(doc.upload_date)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Download className="w-5 h-5 text-gray-400" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {application.additional_notes && (
            <div className="card-glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Additional Notes</h2>
              <p className="text-gray-300">{application.additional_notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Plan Info */}
          <div className="card-glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Selected Plan</h2>
            <div className={`inline-block px-4 py-2 rounded-full text-lg font-semibold capitalize ${PLAN_COLORS[application.selected_plan]}`}>
              {application.selected_plan}
            </div>
            <div className="mt-4 text-2xl font-bold text-white">
              {application.selected_plan === 'starter' && '£80,000/year'}
              {application.selected_plan === 'professional' && '£150,000/year'}
              {application.selected_plan === 'enterprise' && 'Custom Pricing'}
            </div>
          </div>

          {/* Dates */}
          <div className="card-glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-sm">Submitted</p>
                  <p className="text-white">{formatDate(application.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-sm">Last Updated</p>
                  <p className="text-white">{formatDate(application.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Update */}
          <div className="card-glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Update Status</h2>
            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => updateStatus(status)}
                  disabled={updating || application.status === status}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    application.status === status
                      ? `bg-${config.color}-500/20 text-${config.color}-400`
                      : 'bg-dark-800 text-gray-400 hover:bg-dark-700 hover:text-white'
                  }`}
                >
                  <config.icon className="w-5 h-5" />
                  <span>{config.label}</span>
                  {application.status === status && (
                    <CheckCircle className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientServices



