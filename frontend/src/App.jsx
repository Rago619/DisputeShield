import React, { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { OverviewCards } from './components/OverviewCards'
import { ExportBar } from './components/ExportBar'
import { UploadModal } from './components/UploadModal'
import { PaymentsTab } from './components/PaymentsTab'
import { TeamTab } from './components/TeamTab'
import { ReasonsTab } from './components/ReasonsTab'
import { WhatIfTab } from './components/WhatIfTab'
import { Shield, FileText, Users, Activity, Sliders } from './icons'

export default function App() {
  const [activeTab, setActiveTab] = useState('payments')
  const [kpis, setKpis] = useState(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/overview")
      const data = await res.json()
      setKpis(data)
    } catch (err) {
      console.error("Failed to load overview KPIs:", err)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [refreshKey])

  const handleReset = async () => {
    if (!window.confirm("Reset dataset back to baseline historical data (Months 1–22)?")) {
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/reset", { method: "POST" })
      const data = await res.json()
      setKpis(data.kpis)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      console.error("Reset failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = (updatedKpis) => {
    if (updatedKpis) {
      setKpis(updatedKpis)
    }
    setRefreshKey((k) => k + 1)
  }

  const tabs = [
    { id: 'payments', label: 'Per Payment', icon: FileText, desc: 'Predictions & Actions' },
    { id: 'teams', label: 'By Team', icon: Users, desc: 'Team Health & Gaps' },
    { id: 'reasons', label: 'Across All Teams', icon: Activity, desc: 'Dispute Reasons & Win Rate' },
    { id: 'whatif', label: 'What-If Policies', icon: Sliders, desc: 'Policy Simulator & Ranges' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        kpis={kpis}
        onReset={handleReset}
        onOpenUpload={() => setIsUploadOpen(true)}
        loading={loading}
      />

      <main style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '1.5rem', flex: 1 }}>
        {/* KPI Summary Cards */}
        <OverviewCards kpis={kpis} />

        {/* 3 CSV Submission Exports Bar */}
        <ExportBar />

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem 0.5rem 0 0',
          padding: '0.25rem 0.5rem 0 0.5rem',
          overflowX: 'auto',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 1.25rem',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: isActive ? '#2563eb' : '#64748b',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon style={{ width: '1rem', height: '1rem' }} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div key={refreshKey}>
          {activeTab === 'payments' && <PaymentsTab />}
          {activeTab === 'teams' && <TeamTab />}
          {activeTab === 'reasons' && <ReasonsTab />}
          {activeTab === 'whatif' && <WhatIfTab />}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        marginTop: '2rem',
        fontSize: '0.8rem',
        color: '#64748b',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <strong>DisputeShield</strong> — Autonomous Chargeback Risk Engine & Decision Support
          </div>
          <div>
            Models calibrated on months 1–22 • Render 7-day deployment ready
          </div>
        </div>
      </footer>

      {/* Upload Wizard Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}
