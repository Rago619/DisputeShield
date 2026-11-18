import React, { useState, useEffect } from 'react'
import { Activity, Shield, CheckCircle, AlertTriangle } from '../icons'

export function ReasonsTab() {
  const [reasons, setReasons] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch("/api/reasons")
      .then((res) => res.json())
      .then((data) => setReasons(data || []))
      .catch((err) => console.error("Error fetching dispute reasons:", err))
      .finally(() => setLoading(false))
  }, [])

  const totalDisputes = reasons.reduce((acc, r) => acc + (r.dispute_count || 0), 0)
  const totalLost = reasons.reduce((acc, r) => acc + (r.dollars_lost_usd || 0), 0)

  const reasonPlaybooks = {
    fraud: {
      title: "Card Fraud / Unauthorized Charge",
      defense: "Enforce EMV chip & contactless tap. Never key-in high-value cards without signed authorization and full AVS zip code match. Chip & PIN shifts chargeback liability to the issuing bank.",
      keyEvidence: "AVS/CVV Match, EMV Cryptogram, Photo ID / Signed Work Order"
    },
    service_not_provided: {
      title: "Service Not Provided / Incomplete",
      defense: "Capture digital technician GPS check-in upon arrival and require on-site customer signature at job completion. This eliminates 80%+ of false non-delivery claims.",
      keyEvidence: "Completion Signature, Tech GPS Geotag, Dispatch Log"
    },
    not_as_described: {
      title: "Not as Described / Quality of Work",
      defense: "Capture high-resolution before & after photos via the technician app. Provide detailed line-item descriptions and obtain signed estimate approval prior to commencing work.",
      keyEvidence: "Before/After Photos, Signed Estimate, Itemized Scope"
    },
    duplicate: {
      title: "Duplicate Billing",
      defense: "Send instant automated itemized SMS/email receipts with unique transaction reference numbers. Automatically flag duplicate charges submitted within 10 minutes.",
      keyEvidence: "Separate Invoice IDs, Timestamped Receipts, Clear Descriptors"
    },
    credit_not_processed: {
      title: "Credit / Refund Not Processed",
      defense: "Maintain transparent refund audit logs. Provide customer with bank ARN (Acquirer Reference Number) for all processed refunds to verify funds return.",
      keyEvidence: "Refund ARN, Cancellation Policy, Written Communications"
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.5rem',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            backgroundColor: '#fff7ed',
            color: '#ea580c',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity style={{ width: '1.25rem', height: '1.25rem' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Across All Teams: Dispute Reasons & Win Rates
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Aggregate analysis of chargeback drivers, win rates, and total dollar losses across all 200 field-service businesses.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: '#64748b' }}>Total Disputes:</span>{' '}
            <strong style={{ color: '#0f172a' }}>{totalDisputes}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Total Losses:</span>{' '}
            <strong style={{ color: '#b91c1c' }}>${totalLost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading dispute reason analytics...
        </div>
      ) : (
        <>
          {/* Reason Breakdown Table */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Dispute Reason</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Disputes Count</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Share of Total</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Disputed Volume</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Win Rate (%)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Dollars Lost (USD)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Merchant Response %</th>
                  </tr>
                </thead>
                <tbody>
                  {reasons.map((r) => {
                    const share = totalDisputes > 0 ? (r.dispute_count / totalDisputes) * 100 : 0
                    return (
                      <tr key={r.reason} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>
                          {r.reason.replace(/_/g, ' ')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                          {r.dispute_count}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '60px', height: '6px', borderRadius: '3px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                              <div style={{ width: `${share}%`, height: '100%', backgroundColor: '#2563eb' }}></div>
                            </div>
                            <span>{share.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: '#334155' }}>
                          ${(r.total_amount_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            fontWeight: 700,
                            color: r.win_rate > 55 ? '#059669' : (r.win_rate > 35 ? '#d97706' : '#dc2626')
                          }}>
                            {r.win_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#b91c1c' }}>
                          ${(r.dollars_lost_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                          {r.merchant_responded_pct.toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Playbook Cards per Dispute Reason */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>
              Dispute Shield Defensibility Strategies by Reason
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem'
            }}>
              {reasons.map((r) => {
                const pb = reasonPlaybooks[r.reason] || {
                  title: r.reason,
                  defense: "Ensure comprehensive documentation and respond before bank deadlines.",
                  keyEvidence: "Invoices, Receipts, Signatures"
                }
                return (
                  <div key={r.reason} style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0.5rem',
                    padding: '1.25rem',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{pb.title}</span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '0.25rem',
                          backgroundColor: '#f1f5f9',
                          color: '#475569'
                        }}>
                          {r.dispute_count} cases
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45, marginBottom: '0.5rem' }}>
                        {pb.defense}
                      </p>
                    </div>
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #f1f5f9',
                      fontSize: '0.75rem',
                      color: '#64748b'
                    }}>
                      <strong style={{ color: '#334155' }}>Key Evidence:</strong> {pb.keyEvidence}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
