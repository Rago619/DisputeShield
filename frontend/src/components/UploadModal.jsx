import React, { useState } from 'react'
import { Upload, CheckCircle, AlertTriangle, FileText, Download } from '../icons'

export function UploadModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null

  const [activeStep, setActiveStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  // Step 1 files
  const [invoicesFile, setInvoicesFile] = useState(null)
  const [paymentsFile, setPaymentsFile] = useState(null)
  const [photosFile, setPhotosFile] = useState(null)

  // Step 2 file
  const [disputesFile, setDisputesFile] = useState(null)

  const handleStep1Submit = async (e) => {
    e.preventDefault()
    if (!invoicesFile || !paymentsFile) {
      setError("Please select both invoices.csv and payments.csv")
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    const formData = new FormData()
    formData.append("invoices", invoicesFile)
    formData.append("payments", paymentsFile)
    if (photosFile) {
      formData.append("photos", photosFile)
    }

    try {
      const res = await fetch("/api/upload/step1", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload Step 1 files")
      }
      setMessage(`Step 1 Complete: ${data.paymentsCount} payments scored! Proceed to Step 2 if you have disputes.`)
      onSuccess(data.kpis)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Submit = async (e) => {
    e.preventDefault()
    if (!disputesFile) {
      setError("Please select disputes.csv")
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    const formData = new FormData()
    formData.append("disputes", disputesFile)

    try {
      const res = await fetch("/api/upload/step2", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload disputes")
      }
      setMessage(`Step 2 Complete: ${data.disputesCount} disputes scored and recommendations calibrated!`)
      onSuccess(data.kpis)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper to load sample files from server directly
  const loadSampleStep1 = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const [invRes, pmtRes, phtRes] = await Promise.all([
        fetch("/api/sample/invoices.csv"),
        fetch("/api/sample/payments.csv"),
        fetch("/api/sample/photos.csv")
      ])
      const [invBlob, pmtBlob, phtBlob] = await Promise.all([
        invRes.blob(),
        pmtRes.blob(),
        phtRes.blob()
      ])

      const formData = new FormData()
      formData.append("invoices", invBlob, "invoices.csv")
      formData.append("payments", pmtBlob, "payments.csv")
      formData.append("photos", phtBlob, "photos.csv")

      const res = await fetch("/api/upload/step1", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage(`Loaded sample Step 1: ${data.paymentsCount} payments scored!`)
      onSuccess(data.kpis)
    } catch (err) {
      setError("Failed to load sample Step 1 files: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSampleStep2 = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const dispRes = await fetch("/api/sample/disputes.csv")
      const dispBlob = await dispRes.blob()

      const formData = new FormData()
      formData.append("disputes", dispBlob, "disputes.csv")

      const res = await fetch("/api/upload/step2", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage(`Loaded sample Step 2: ${data.disputesCount} disputes scored!`)
      onSuccess(data.kpis)
    } catch (err) {
      setError("Failed to load sample Step 2 file: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.75rem',
        maxWidth: '680px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }} className="animate-fade-in">
        
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
              Upload Evaluation Datasets
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Upload new CSV data to replace active dataset and recalibrate all predictions.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Step Selector Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <button
            onClick={() => setActiveStep(1)}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              border: 'none',
              borderBottom: activeStep === 1 ? '2px solid #2563eb' : '2px solid transparent',
              color: activeStep === 1 ? '#2563eb' : '#64748b',
              fontWeight: activeStep === 1 ? 600 : 500,
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: activeStep === 1 ? '#2563eb' : '#e2e8f0',
              color: activeStep === 1 ? '#ffffff' : '#64748b',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>1</span>
            Step 1: Payments & Evidence
          </button>
          <button
            onClick={() => setActiveStep(2)}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              border: 'none',
              borderBottom: activeStep === 2 ? '2px solid #2563eb' : '2px solid transparent',
              color: activeStep === 2 ? '#2563eb' : '#64748b',
              fontWeight: activeStep === 2 ? 600 : 500,
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: activeStep === 2 ? '#2563eb' : '#e2e8f0',
              color: activeStep === 2 ? '#ffffff' : '#64748b',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>2</span>
            Step 2: Disputes (No Outcomes)
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {message && (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <CheckCircle style={{ width: '1.1rem', height: '1.1rem', flexShrink: 0 }} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <AlertTriangle style={{ width: '1.1rem', height: '1.1rem', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {activeStep === 1 && (
            <form onSubmit={handleStep1Submit}>
              <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.5 }}>
                Upload <strong>invoices.csv</strong>, <strong>payments.csv</strong>, and optional <strong>photos.csv</strong> (e.g. Months 23 & 24). The app will score every payment using models pre-trained on months 1–22.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    1. invoices.csv *
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setInvoicesFile(e.target.files[0])}
                    style={{
                      display: 'block',
                      width: '100%',
                      fontSize: '0.85rem',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    2. payments.csv *
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setPaymentsFile(e.target.files[0])}
                    style={{
                      display: 'block',
                      width: '100%',
                      fontSize: '0.85rem',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    3. photos.csv (optional)
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setPhotosFile(e.target.files[0])}
                    style={{
                      display: 'block',
                      width: '100%',
                      fontSize: '0.85rem',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={loadSampleStep1}
                  disabled={loading}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: 500
                  }}
                >
                  ⚡ Load Sample Months 23–24 Files
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.5rem 1.25rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    {loading ? "Processing..." : "Score Step 1"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeStep === 2 && (
            <form onSubmit={handleStep2Submit}>
              <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.5 }}>
                Upload <strong>disputes.csv</strong> raised on those payments (without outcome or closed_at). The app will predict win probabilities given submitted evidence and output a <strong>fight</strong> or <strong>accept</strong> recommendation.
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  disputes.csv *
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setDisputesFile(e.target.files[0])}
                  style={{
                    display: 'block',
                    width: '100%',
                    fontSize: '0.85rem',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={loadSampleStep2}
                  disabled={loading}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: 500
                  }}
                >
                  ⚡ Load Sample Months 23–24 Disputes
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.5rem 1.25rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    {loading ? "Processing..." : "Score Step 2"}
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
