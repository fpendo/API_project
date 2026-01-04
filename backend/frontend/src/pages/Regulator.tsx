import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell, Section } from '../components/layout'
import { Button, Card, Badge, getStatusVariant, Modal, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui'
import { StatCard, StatsGrid, NotificationBanner } from '../components/domain'
import { formatCredits, formatTonnage } from '../lib/utils'

const API_BASE_URL = 'http://localhost:8000'

// Types - matches API response for /regulator/submissions
interface Submission {
  id: number
  submitter_account_id: number
  scheme_name: string
  catchment: string
  location: string
  land_parcel_number: string
  unit_type: string
  total_tonnage: number
  file_path: string
  status: string
  created_at: string
}

// Approved schemes from /regulator/schemes
interface Scheme {
  id: number
  nft_token_id: number
  name: string
  catchment: string
  location: string
  unit_type: string
  original_tonnage: number
  remaining_tonnage: number
  created_at: string
}

// Scheme detail from /regulator/schemes/{id}
interface SchemeDetail extends Scheme {
  submission_id?: number
  submission_file_path?: string
  land_parcel_number?: string
  ipfs_cid?: string
  sha256_hash?: string
}

// Analytics types from /regulator/archive
interface SchemeCapacity {
  id: number
  nft_token_id: number
  name: string
  location: string
  unit_type: string
  original_tonnage: number
  remaining_tonnage: number
  capacity_percent: number
  locked_credits: number
  burned_credits: number
  status: 'active' | 'depleted'
}

interface CatchmentCapacity {
  catchment: string
  schemes: SchemeCapacity[]
  total_original: number
  total_remaining: number
  total_capacity_percent: number
  total_locked_credits: number
  total_burned_credits: number
}

interface ArchiveData {
  catchments: CatchmentCapacity[]
  grand_total_original: number
  grand_total_remaining: number
  grand_total_capacity_percent: number
  grand_total_locked_credits: number
  grand_total_burned_credits: number
}

function Regulator() {
  const [activeTab, setActiveTab] = useState('inbox')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [archiveData, setArchiveData] = useState<ArchiveData | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Detail modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)
  
  // Expanded schemes
  const [expandedSchemes, setExpandedSchemes] = useState<Set<number>>(new Set())
  const [schemeDetails, setSchemeDetails] = useState<Record<number, SchemeDetail>>({})
  
  // Analytics: expanded catchments
  const [expandedCatchments, setExpandedCatchments] = useState<Set<string>>(new Set())

  // Fetch submissions (pending review)
  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/regulator/submissions`)
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data)
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
    }
  }

  // Fetch approved schemes
  const fetchSchemes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/regulator/schemes`)
      if (res.ok) {
        const data = await res.json()
        setSchemes(data)
      }
    } catch (err) {
      console.error('Failed to fetch schemes:', err)
    }
  }

  // Fetch scheme details
  const fetchSchemeDetail = async (schemeId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/regulator/schemes/${schemeId}`)
      if (res.ok) {
        const data = await res.json()
        setSchemeDetails(prev => ({ ...prev, [schemeId]: data }))
      }
    } catch (err) {
      console.error('Failed to fetch scheme details:', err)
    }
  }

  // Toggle scheme expansion
  const toggleScheme = async (schemeId: number) => {
    const newExpanded = new Set(expandedSchemes)
    if (newExpanded.has(schemeId)) {
      newExpanded.delete(schemeId)
    } else {
      newExpanded.add(schemeId)
      // Fetch details if not already loaded
      if (!schemeDetails[schemeId]) {
        await fetchSchemeDetail(schemeId)
      }
    }
    setExpandedSchemes(newExpanded)
  }

  // Fetch archive/analytics data
  const fetchArchive = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/regulator/archive`)
      if (res.ok) {
        const data = await res.json()
        setArchiveData(data)
      }
    } catch (err) {
      console.error('Failed to fetch archive:', err)
    }
  }

  // Toggle catchment expansion
  const toggleCatchment = (catchment: string) => {
    setExpandedCatchments(prev => {
      const next = new Set(prev)
      if (next.has(catchment)) {
        next.delete(catchment)
      } else {
        next.add(catchment)
      }
      return next
    })
  }

  useEffect(() => {
    fetchSubmissions()
    fetchSchemes()
    fetchArchive()
    const interval = setInterval(() => {
      fetchSubmissions()
      fetchSchemes()
      fetchArchive()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Actions
  const handleApprove = async (submission: Submission) => {
    try {
      setProcessing(true)
      const res = await fetch(`${API_BASE_URL}/regulator/submissions/${submission.id}/approve`, {
        method: 'POST',
      })
      if (res.ok) {
        setMessage({ type: 'success', text: `Scheme "${submission.scheme_name}" approved! Digital Certificate issued.` })
        fetchSubmissions()
        fetchSchemes()
        setShowDetailModal(false)
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Approval failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) return
    
    try {
      setProcessing(true)
      const res = await fetch(`${API_BASE_URL}/regulator/submissions/${selectedSubmission.id}/decline`, {
        method: 'POST',
      })
      if (res.ok) {
        setMessage({ type: 'success', text: `Submission "${selectedSubmission.scheme_name}" declined` })
        fetchSubmissions()
        setShowRejectModal(false)
        setShowDetailModal(false)
        setRejectionReason('')
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Rejection failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  // Filter submissions
  const pendingSubmissions = submissions.filter(s => s.status === 'PENDING' || s.status === 'PENDING_REVIEW')
  const declinedSubmissions = submissions.filter(s => s.status === 'DECLINED')
  
  const totalTonnes = schemes.reduce((sum, s) => sum + s.original_tonnage, 0)

  return (
    <AppShell
      title="Regulator Dashboard"
      subtitle="Review and approve offset schemes"
    >
      {/* Notification */}
      <AnimatePresence>
        {message && (
          <div className="mb-6">
            <NotificationBanner
              type={message.type}
              message={message.text}
              onDismiss={() => setMessage(null)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <StatsGrid columns={4}>
        <StatCard label="Pending Review" value={pendingSubmissions.length} variant="warning" />
        <StatCard label="Approved Schemes" value={schemes.length} variant="success" />
        <StatCard label="Declined" value={declinedSubmissions.length} variant="error" />
        <StatCard label="Total Approved Tonnage" value={totalTonnes} format="tonnage" variant="primary" />
      </StatsGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="underline">
          <TabsTrigger value="inbox" variant="underline">
            Inbox ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="approved" variant="underline">
            Approved ({schemes.length})
          </TabsTrigger>
          <TabsTrigger value="declined" variant="underline">
            Declined ({declinedSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" variant="underline">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <Section title="Pending Submissions" description="Submissions awaiting your review">
            {pendingSubmissions.length === 0 ? (
              <Card>
                <div className="text-center py-12 text-[var(--color-text-muted)]">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No submissions pending review</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingSubmissions.map((submission) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      hover
                      className="h-full"
                      onClick={() => {
                        setSelectedSubmission(submission)
                        setShowDetailModal(true)
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant="pending" dot>{submission.status.replace('_', ' ')}</Badge>
                        <span className="text-sm text-[var(--color-text-muted)]">
                          {new Date(submission.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                        {submission.scheme_name}
                      </h3>
                      
                      <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                        <div className="flex justify-between">
                          <span className="text-[var(--color-text-muted)]">Catchment</span>
                          <Badge variant="info" size="sm">{submission.catchment}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-text-muted)]">Type</span>
                          <span className="capitalize">{submission.unit_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-text-muted)]">Capacity</span>
                          <span className="font-mono">{formatTonnage(submission.total_tonnage)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-text-muted)]">Land Parcel</span>
                          <span>{submission.land_parcel_number}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApprove(submission)
                          }}
                          loading={processing}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedSubmission(submission)
                            setShowRejectModal(true)
                          }}
                        >
                          Decline
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="approved">
          <Section title="Approved Schemes" description="Click a scheme to view details including IPFS CID and document hash">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Catchment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead align="right">Tonnage</TableHead>
                    <TableHead align="right">Credits</TableHead>
                    <TableHead>Certificate ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemes.length === 0 ? (
                    <TableEmpty title="No approved schemes yet" />
                  ) : (
                    schemes.map((scheme) => {
                      const isExpanded = expandedSchemes.has(scheme.id)
                      const detail = schemeDetails[scheme.id]
                      
                      return (
                        <>
                          <TableRow 
                            key={scheme.id}
                            className="cursor-pointer hover:bg-[var(--color-background-elevated)]"
                            onClick={() => toggleScheme(scheme.id)}
                          >
                            <TableCell className="w-10">
                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </motion.div>
                            </TableCell>
                            <TableCell className="font-medium">{scheme.name}</TableCell>
                            <TableCell><Badge variant="info">{scheme.catchment}</Badge></TableCell>
                            <TableCell className="capitalize">{scheme.unit_type}</TableCell>
                            <TableCell align="right" mono>{formatTonnage(scheme.original_tonnage)}</TableCell>
                            <TableCell align="right" mono className="text-[var(--color-accent-primary)]">
                              {formatCredits(scheme.original_tonnage * 100000)}
                            </TableCell>
                            <TableCell mono className="text-[var(--color-text-muted)]">
                              #{scheme.nft_token_id}
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Detail Section */}
                          <AnimatePresence>
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="p-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden bg-[var(--color-background-elevated)]/50 border-t border-[var(--color-border)]"
                                  >
                                    <div className="p-6">
                                      {!detail ? (
                                        <div className="text-center py-4 text-[var(--color-text-muted)]">
                                          Loading scheme details...
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                          {/* Left Column - Scheme Info */}
                                          <div className="space-y-4">
                                            <h4 className="font-semibold text-[var(--color-text-primary)]">
                                              Scheme Information
                                            </h4>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                              <div>
                                                <p className="text-[var(--color-text-muted)]">Location</p>
                                                <p className="font-medium">{detail.location || 'Not specified'}</p>
                                              </div>
                                              <div>
                                                <p className="text-[var(--color-text-muted)]">Land Parcel</p>
                                                <p className="font-medium">{detail.land_parcel_number || 'Not specified'}</p>
                                              </div>
                                              <div>
                                                <p className="text-[var(--color-text-muted)]">Original Tonnage</p>
                                                <p className="font-mono">{formatTonnage(detail.original_tonnage)}</p>
                                              </div>
                                              <div>
                                                <p className="text-[var(--color-text-muted)]">Remaining Tonnage</p>
                                                <p className="font-mono text-[var(--color-accent-primary)]">
                                                  {formatTonnage(detail.remaining_tonnage)}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-[var(--color-text-muted)]">Created</p>
                                                <p>{detail.created_at ? new Date(detail.created_at).toLocaleDateString() : '—'}</p>
                                              </div>
                                              <div>
                                                <p className="text-[var(--color-text-muted)]">Certificate ID</p>
                                                <p className="font-mono">#{detail.nft_token_id}</p>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Right Column - Document & Verification */}
                                          <div className="space-y-4">
                                            <h4 className="font-semibold text-[var(--color-text-primary)]">
                                              Document Verification
                                            </h4>
                                            
                                            <div className="space-y-3">
                                              {/* IPFS CID */}
                                              <div className="p-3 bg-[var(--color-background-surface)] rounded-lg">
                                                <p className="text-xs text-[var(--color-text-muted)] mb-1">IPFS CID</p>
                                                {detail.ipfs_cid ? (
                                                  <div className="flex items-center gap-2">
                                                    <code className="text-xs font-mono text-[var(--color-accent-primary)] break-all flex-1">
                                                      {detail.ipfs_cid}
                                                    </code>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigator.clipboard.writeText(detail.ipfs_cid!)
                                                        setMessage({ type: 'success', text: 'CID copied!' })
                                                      }}
                                                    >
                                                      Copy
                                                    </Button>
                                                  </div>
                                                ) : (
                                                  <span className="text-sm text-[var(--color-text-muted)]">Not available</span>
                                                )}
                                              </div>
                                              
                                              {/* SHA256 Hash */}
                                              <div className="p-3 bg-[var(--color-background-surface)] rounded-lg">
                                                <p className="text-xs text-[var(--color-text-muted)] mb-1">SHA256 Hash</p>
                                                {detail.sha256_hash ? (
                                                  <div className="flex items-center gap-2">
                                                    <code className="text-xs font-mono text-[var(--color-text-secondary)] break-all flex-1">
                                                      {detail.sha256_hash}
                                                    </code>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigator.clipboard.writeText(detail.sha256_hash!)
                                                        setMessage({ type: 'success', text: 'Hash copied!' })
                                                      }}
                                                    >
                                                      Copy
                                                    </Button>
                                                  </div>
                                                ) : (
                                                  <span className="text-sm text-[var(--color-text-muted)]">Not available</span>
                                                )}
                                              </div>
                                              
                                              {/* Download Link */}
                                              {detail.submission_file_path && (
                                                <a
                                                  href={`${API_BASE_URL}/${detail.submission_file_path}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="flex items-center gap-2 p-3 bg-[var(--color-background-surface)] rounded-lg hover:bg-[var(--color-background-elevated)] transition-colors"
                                                >
                                                  <svg className="w-5 h-5 text-[var(--color-accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                  </svg>
                                                  <span className="text-sm text-[var(--color-accent-primary)]">
                                                    Download Submission Document
                                                  </span>
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </Section>
        </TabsContent>

        <TabsContent value="declined">
          <Section title="Declined Submissions">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Catchment</TableHead>
                    <TableHead>Tonnage</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declinedSubmissions.length === 0 ? (
                    <TableEmpty title="No declined submissions" />
                  ) : (
                    declinedSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.scheme_name}</TableCell>
                        <TableCell><Badge variant="info">{submission.catchment}</Badge></TableCell>
                        <TableCell mono>{formatTonnage(submission.total_tonnage)}</TableCell>
                        <TableCell className="text-[var(--color-text-muted)] text-sm">
                          {new Date(submission.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </Section>
        </TabsContent>

        <TabsContent value="analytics">
          <Section 
            title="Capacity Analytics" 
            description="View offset capacity by catchment and scheme"
          >
            {/* Grand Totals */}
            {archiveData && (
              <div className="mb-6">
                <StatsGrid columns={4}>
                  <StatCard 
                    label="Total Original Capacity" 
                    value={archiveData.grand_total_original} 
                    format="tonnage" 
                  />
                  <StatCard 
                    label="Total Remaining" 
                    value={archiveData.grand_total_remaining} 
                    format="tonnage"
                    variant="success" 
                  />
                  <StatCard 
                    label="Capacity Remaining" 
                    value={`${archiveData.grand_total_capacity_percent}%`}
                    variant={archiveData.grand_total_capacity_percent > 50 ? 'success' : archiveData.grand_total_capacity_percent > 20 ? 'warning' : 'error'}
                  />
                  <StatCard 
                    label="Credits Burned" 
                    value={archiveData.grand_total_burned_credits} 
                    format="credits"
                    variant="primary" 
                  />
                </StatsGrid>
              </div>
            )}

            {/* Catchment Breakdown */}
            {archiveData?.catchments.length === 0 ? (
              <Card>
                <div className="text-center py-12 text-[var(--color-text-muted)]">
                  <p>No approved schemes yet</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {archiveData?.catchments.map((catchmentData) => {
                  const isExpanded = expandedCatchments.has(catchmentData.catchment)
                  const capacityColor = catchmentData.total_capacity_percent > 50 
                    ? 'var(--color-status-success)' 
                    : catchmentData.total_capacity_percent > 20 
                      ? 'var(--color-status-warning)' 
                      : 'var(--color-status-error)'
                  
                  return (
                    <Card key={catchmentData.catchment} padding="none">
                      {/* Catchment Header - Clickable */}
                      <button
                        className="w-full p-4 flex items-center justify-between hover:bg-[var(--color-background-elevated)] transition-colors"
                        onClick={() => toggleCatchment(catchmentData.catchment)}
                      >
                        <div className="flex items-center gap-4">
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </motion.div>
                          <Badge variant="info">{catchmentData.catchment}</Badge>
                          <span className="text-[var(--color-text-muted)]">
                            {catchmentData.schemes.length} scheme{catchmentData.schemes.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-[var(--color-text-muted)]">Remaining</p>
                            <p className="font-mono font-semibold">
                              {formatTonnage(catchmentData.total_remaining)} / {formatTonnage(catchmentData.total_original)}
                            </p>
                          </div>
                          
                          {/* Capacity Bar */}
                          <div className="w-32">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[var(--color-text-muted)]">Capacity</span>
                              <span style={{ color: capacityColor }} className="font-semibold">
                                {catchmentData.total_capacity_percent}%
                              </span>
                            </div>
                            <div className="h-2 bg-[var(--color-background-deep)] rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: capacityColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${catchmentData.total_capacity_percent}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                          
                          <div className="text-right w-24">
                            <p className="text-xs text-[var(--color-text-muted)]">Burned</p>
                            <p className="font-mono text-[var(--color-status-error)]">
                              {formatCredits(catchmentData.total_burned_credits)}
                            </p>
                          </div>
                        </div>
                      </button>
                      
                      {/* Expanded Schemes Table */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-[var(--color-border)]"
                          >
                            <Table compact>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Scheme</TableHead>
                                  <TableHead>Location</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead align="right">Original</TableHead>
                                  <TableHead align="right">Remaining</TableHead>
                                  <TableHead align="center">Capacity</TableHead>
                                  <TableHead align="right">Locked</TableHead>
                                  <TableHead align="right">Burned</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {catchmentData.schemes.map((scheme) => {
                                  const schemeCapacityColor = scheme.capacity_percent > 50 
                                    ? 'var(--color-status-success)' 
                                    : scheme.capacity_percent > 20 
                                      ? 'var(--color-status-warning)' 
                                      : 'var(--color-status-error)'
                                  
                                  return (
                                    <TableRow key={scheme.id}>
                                      <TableCell className="font-medium">{scheme.name}</TableCell>
                                      <TableCell className="text-[var(--color-text-muted)]">{scheme.location}</TableCell>
                                      <TableCell className="capitalize">{scheme.unit_type}</TableCell>
                                      <TableCell align="right" mono>{formatTonnage(scheme.original_tonnage)}</TableCell>
                                      <TableCell align="right" mono className="text-[var(--color-accent-primary)]">
                                        {formatTonnage(scheme.remaining_tonnage)}
                                      </TableCell>
                                      <TableCell align="center">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 h-1.5 bg-[var(--color-background-deep)] rounded-full overflow-hidden">
                                            <div
                                              className="h-full rounded-full"
                                              style={{ 
                                                backgroundColor: schemeCapacityColor,
                                                width: `${scheme.capacity_percent}%`
                                              }}
                                            />
                                          </div>
                                          <span className="text-xs font-mono" style={{ color: schemeCapacityColor }}>
                                            {scheme.capacity_percent}%
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell align="right" mono className="text-[var(--color-status-info)]">
                                        {formatCredits(scheme.locked_credits)}
                                      </TableCell>
                                      <TableCell align="right" mono className="text-[var(--color-status-error)]">
                                        {formatCredits(scheme.burned_credits)}
                                      </TableCell>
                                      <TableCell>
                                        <Badge 
                                          variant={scheme.status === 'active' ? 'success' : 'error'} 
                                          size="sm"
                                        >
                                          {scheme.status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  )
                })}
              </div>
            )}
          </Section>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedSubmission(null)
        }}
        title={selectedSubmission?.scheme_name}
        size="lg"
        footer={
          selectedSubmission?.status.includes('PENDING') ? (
            <>
              <Button
                variant="danger"
                onClick={() => {
                  setShowRejectModal(true)
                }}
              >
                Decline
              </Button>
              <Button
                onClick={() => selectedSubmission && handleApprove(selectedSubmission)}
                loading={processing}
              >
                Approve & Issue Certificate
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedSubmission && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Catchment</p>
                <p className="font-medium"><Badge variant="info">{selectedSubmission.catchment}</Badge></p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Unit Type</p>
                <p className="font-medium capitalize">{selectedSubmission.unit_type}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Tonnage Capacity</p>
                <p className="font-mono text-lg text-[var(--color-accent-primary)]">{formatTonnage(selectedSubmission.total_tonnage)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Credits to Mint</p>
                <p className="font-mono text-lg">{formatCredits(selectedSubmission.total_tonnage * 100000)}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-[var(--color-text-muted)] mb-1">Location</p>
              <p className="text-[var(--color-text-secondary)]">{selectedSubmission.location || 'Not specified'}</p>
            </div>
            
            <div>
              <p className="text-sm text-[var(--color-text-muted)] mb-1">Land Parcel Number</p>
              <p className="text-[var(--color-text-secondary)]">{selectedSubmission.land_parcel_number}</p>
            </div>
            
            <div>
              <p className="text-sm text-[var(--color-text-muted)] mb-1">Submitted</p>
              <p className="text-[var(--color-text-secondary)]">
                {new Date(selectedSubmission.created_at).toLocaleString()}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-[var(--color-text-muted)] mb-1">Status</p>
              <Badge variant={getStatusVariant(selectedSubmission.status)}>
                {selectedSubmission.status.replace('_', ' ')}
              </Badge>
            </div>
            
            {selectedSubmission.file_path && (
              <div>
                <p className="text-sm text-[var(--color-text-muted)] mb-1">Supporting Document</p>
                <a
                  href={`${API_BASE_URL}/${selectedSubmission.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[var(--color-accent-primary)] hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setRejectionReason('')
        }}
        title="Decline Submission"
        description={`Provide a reason for declining "${selectedSubmission?.scheme_name}"`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              loading={processing}
              disabled={!rejectionReason.trim()}
            >
              Confirm Decline
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Explain why this submission is being declined..."
        />
      </Modal>
    </AppShell>
  )
}

export default Regulator
