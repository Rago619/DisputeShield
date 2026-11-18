import React, { useState, useEffect } from 'react'
import { Search, Filter, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from '../icons'

export function PaymentsTab() {
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [tier, setTier] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        tier,
        search
      })
      const res = await fetch(`/api/payments?${params.toString()}`)
      const data = await res.json()
      setPayments(data.payments || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
    } catch (err) {
      console.error("Failed to fetch payments:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [page, pageSize, tier, search])

  const getTierBadge = (t) => {
    switch (t) {
      case 'low':
        return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', label: 'Low Risk' }
      case 'medium':
        return { bg: '#fef3c7', text: '#92400e', border: '#fde68a', label: 'Medium Risk' }
      case 'high':
        return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', label: 'High Risk' }
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', label: t }
    }
  }

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '0.5rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      overflow: 'hidden'
    }}>
      {/* Table Controls */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            padding: '0.45rem 0.75rem',
            minWidth: '240px',
            maxWidth: '360px',
            flex: 1
          }}>
            <Search style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search Payment ID, Team ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.85rem',
                width: '100%',
                color: '#1e293b'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Risk Tier:</span>
            <select
              value={tier}
              onChange={(e) => {
                setTier(e.target.value)
                setPage(1)
              }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                padding: '0.45rem 0.75rem',
                fontSize: '0.85rem',
                color: '#334155'
              }}
            >
              <option value="">All Tiers</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Showing <strong>{payments.length}</strong> of <strong>{total}</strong> scored payments
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Payment ID</th>
              <th style={{ padding: '0.75rem 1rem' }}>Team & Method</th>
              <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
              <th style={{ padding: '0.75rem 1rem' }}>Dispute Risk</th>
              <th style={{ padding: '0.75rem 1rem' }}>Invoice Win %</th>
              <th style={{ padding: '0.75rem 1rem' }}>Payment Win %</th>
              <th style={{ padding: '0.75rem 1rem' }}>Expected Loss</th>
              <th style={{ padding: '0.75rem 1rem' }}>Action Recommended for Team</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading predictions...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No payments found matching criteria.
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                const badge = getTierBadge(p.dispute_risk_tier)
                return (
                  <tr key={p.payment_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
                      {p.payment_id}
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'inherit' }}>
                        {p.collected_at ? p.collected_at.split(' ')[0] : ''}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 500, color: '#334155' }}>{p.team_id}</div>
                      <span style={{
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '0.2rem',
                        backgroundColor: '#f1f5f9',
                        color: '#475569'
                      }}>
                        {p.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      ${(p.amount_usd || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`
                      }}>
                        {badge.label}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Score: {((p.dispute_risk_score || 0) * 100).toFixed(1)}%
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 500 }}>
                      {((p.invoice_win_prob || 0) * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 600 }}>
                      {((p.payment_win_prob || 0) * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: p.expected_loss_usd > 15 ? '#b91c1c' : '#059669' }}>
                      ${(p.expected_loss_usd || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        backgroundColor: p.recommended_action?.startsWith('Action') ? '#fef2f2' : (p.recommended_action?.startsWith('Important') ? '#fff7ed' : '#f8fafc'),
                        color: p.recommended_action?.startsWith('Action') ? '#991b1b' : (p.recommended_action?.startsWith('Important') ? '#9a3412' : '#334155'),
                        border: '1px solid #e2e8f0',
                        display: 'inline-block',
                        maxWidth: '280px',
                        lineHeight: 1.3
                      }}>
                        {p.recommended_action}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{
        padding: '0.85rem 1.25rem',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Page {page} of {totalPages}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              backgroundColor: page <= 1 ? '#f8fafc' : '#ffffff',
              color: page <= 1 ? '#cbd5e1' : '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8rem'
            }}
          >
            <ChevronLeft style={{ width: '0.85rem', height: '0.85rem' }} />
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              backgroundColor: page >= totalPages ? '#f8fafc' : '#ffffff',
              color: page >= totalPages ? '#cbd5e1' : '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8rem'
            }}
          >
            Next
            <ChevronRight style={{ width: '0.85rem', height: '0.85rem' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
