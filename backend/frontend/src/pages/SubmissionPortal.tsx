import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AppShell } from '../components/layout'
import { Button, Card, CardHeader, Input, Select } from '../components/ui'
import { NotificationBanner } from '../components/domain'
import { API_BASE_URL } from '../api/config'
const MOCK_LANDOWNER_ACCOUNT_ID = 1

const CATCHMENTS = ['SOLENT', 'THAMES', 'SEVERN', 'HUMBER', 'MERSEY', 'TEES', 'TYNE', 'WESSEX']
const UNIT_TYPES = ['nitrate', 'phosphate']

function SubmissionPortal() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [schemeName, setSchemeName] = useState('')
  const [catchment, setCatchment] = useState('')
  const [unitType, setUnitType] = useState('')
  const [tonnes, setTonnes] = useState('')
  const [location, setLocation] = useState('')
  const [landParcelNumber, setLandParcelNumber] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!schemeName || !catchment || !unitType || !tonnes || !location || !landParcelNumber) {
      setMessage({ type: 'error', text: 'Please fill all required fields' })
      return
    }
    
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please upload a supporting document (PDF)' })
      return
    }
    
    const tonnesNum = parseFloat(tonnes)
    if (isNaN(tonnesNum) || tonnesNum <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid tonnage' })
      return
    }
    
    try {
      setSubmitting(true)
      
      // Use FormData for multipart file upload
      const formData = new FormData()
      formData.append('submitter_account_id', MOCK_LANDOWNER_ACCOUNT_ID.toString())
      formData.append('scheme_name', schemeName)
      formData.append('catchment', catchment)
      formData.append('unit_type', unitType)
      formData.append('total_tonnage', tonnesNum.toString())
      formData.append('location', location)
      formData.append('land_parcel_number', landParcelNumber)
      formData.append('file', selectedFile)
      
      const res = await fetch(`${API_BASE_URL}/submissions/`, {
        method: 'POST',
        body: formData,
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Scheme submitted successfully! Awaiting regulator approval.' })
        setTimeout(() => navigate('/landowner'), 2000)
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Submission failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell
      title="Submit New Scheme"
      subtitle="Register your offset scheme for regulatory approval"
      maxWidth="lg"
    >
      {/* Notification */}
      {message && (
        <div className="mb-6">
          <NotificationBanner
            type={message.type}
            message={message.text}
            onDismiss={() => setMessage(null)}
          />
        </div>
      )}

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader
            title="Scheme Details"
            description="Provide information about your offset scheme"
          />
          
          <div className="space-y-6">
            <Input
              label="Scheme Name *"
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              placeholder="e.g., North Field Wetland Restoration"
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Catchment Area *"
                value={catchment}
                onChange={(e) => setCatchment(e.target.value)}
                options={CATCHMENTS.map(c => ({ value: c, label: c }))}
                placeholder="Select catchment"
              />
              
              <Select
                label="Unit Type *"
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
                options={UNIT_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                placeholder="Select type"
              />
            </div>
            
            <Input
              label="Offset Capacity (Tonnes) *"
              type="number"
              value={tonnes}
              onChange={(e) => setTonnes(e.target.value)}
              placeholder="Enter total tonnage"
              hint="This will be converted to 100,000 credits per tonne"
            />
            
            <Input
              label="Location Description *"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Grid Ref: SU 123 456, Southampton"
            />
            
            <Input
              label="Land Parcel Number *"
              value={landParcelNumber}
              onChange={(e) => setLandParcelNumber(e.target.value)}
              placeholder="e.g., LP-2024-001"
            />
            
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Supporting Document (PDF) *
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--color-accent-primary)] transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="text-[var(--color-accent-primary)]">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-[var(--color-text-muted)]">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p>Click to upload or drag and drop</p>
                    <p className="text-sm">PDF files only</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-4 pt-4 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/landowner')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                className="flex-1"
              >
                Submit for Approval
              </Button>
            </div>
          </div>
        </Card>
      </motion.form>
      
      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card variant="glass" padding="sm">
          <div className="text-2xl mb-2">📋</div>
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Submit</h3>
          <p className="text-sm text-[var(--color-text-muted)]">Fill out scheme details and upload supporting docs</p>
        </Card>
        <Card variant="glass" padding="sm">
          <div className="text-2xl mb-2">⚖️</div>
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Review</h3>
          <p className="text-sm text-[var(--color-text-muted)]">Regulator reviews and approves your scheme</p>
        </Card>
        <Card variant="glass" padding="sm">
          <div className="text-2xl mb-2">🌱</div>
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Mint</h3>
          <p className="text-sm text-[var(--color-text-muted)]">Credits are minted on-chain and ready for trading</p>
        </Card>
      </div>
    </AppShell>
  )
}

export default SubmissionPortal
