import React, { useState, useEffect } from 'react'
import { Sliders, AlertTriangle, CheckCircle, Download } from '../icons'

export function WhatIfTab() {
  const [data, setData] = useState({ results: [], summaries: [] })
  const [selectedPolicyId, setSelectedPolicyId] = useState("address_mandatory")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch("/api/whatif")
      .then((res) => res.json())
      .then((d) => {
        setData(d || { results: [], summaries: [] })
        if (d?.summaries && d.summaries.length > 0) {
          setSelectedPolicyId(d.summaries[0].policy_id)
        }
      })
      .catch((err) => console.error("Error loading whatif data:", err))
      .finally(() => setLoading(false))
  }, [])

  const selectedPolicy = data.summaries.find((s) => s.policy_id === selectedPolicyId) || data.summaries[0]

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
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sliders style={{ width: '1.25rem', height: '1.25rem' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Strategic Policy What-If Simulator
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Estimate the financial and operational impact of product policies with statistical confidence intervals.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Select Policy:</label>
          <select
            value={selectedPolicyId}
            onChange={(e) => setSelectedPolicyId(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#1e293b'
            }}
          >
            {data.summaries.map((s) => (
              <option key={s.policy_id} value={s.policy_id}>
                {s.policy_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Running policy simulations...
        </div>
      )}

      {!loading && selectedPolicy && (
        <>
          {/* Policy Detail Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  {selectedPolicy.policy_name}
                </h3>
                <code style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', backgroundColor: '#f1f5f9', borderRadius: '0.2rem', color: '#475569' }}>
                  {selectedPolicy.policy_id}
                </code>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                {selectedPolicy.description}
              </p>
            </div>

            {/* Impact Metric Cards (The 3 metrics from brief: disputes, disputes_lost, usd_lost) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              {selectedPolicy.metrics?.map((m) => {
                const isUSD = m.metric === 'usd_lost'
                const formatVal = (v) => {
                  const prefix = v > 0 ? "+" : ""
                  if (isUSD) {
                    return `${prefix}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                  return `${prefix}${Math.round(v)}`
                }

                return (
                  <div key={m.metric} style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.5rem',
                    padding: '1.25rem',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      Estimated Change in {m.metric.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#059669', margin: '0.5rem 0' }}>
                      {formatVal(m.estimated_change)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      <strong>95% Range:</strong>{' '}
                      <span style={{ color: '#059669', fontWeight: 600 }}>
                        [{formatVal(m.low)}, {formatVal(m.high)}]
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Strategy Considerations Matrix */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              backgroundColor: '#f8fafc',
              padding: '1.25rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
                  📌 Business Assumptions
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                  {selectedPolicy.assumptions}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
                  ⚖️ Side Effects & Trade-offs
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                  {selectedPolicy.side_effects_tradeoff}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
                  🎯 Confidence & Card Scheme Rationale
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                  {selectedPolicy.confidence_rationale}
                </p>
              </div>
            </div>
          </div>

          {/* All Policies Side-by-Side Comparison Table */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                All Policies Benchmark Matrix (Months 1–22)
              </h4>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Policy Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Δ Disputes</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Δ Disputes Lost</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Δ USD Lost</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summaries.map((pol) => {
                    const dispMetric = pol.metrics?.find((m) => m.metric === 'disputes')
                    const lostMetric = pol.metrics?.find((m) => m.metric === 'disputes_lost')
                    const usdMetric = pol.metrics?.find((m) => m.metric === 'usd_lost')

                    return (
                      <tr key={pol.policy_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                          {pol.policy_name}
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>
                            {pol.policy_id}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#059669', fontWeight: 600 }}>
                          {dispMetric?.estimated_change} [{dispMetric?.low}, {dispMetric?.high}]
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#059669', fontWeight: 600 }}>
                          {lostMetric?.estimated_change} [{lostMetric?.low}, {lostMetric?.high}]
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#059669', fontWeight: 700 }}>
                          ${Math.abs(usdMetric?.estimated_change || 0).toLocaleString()} [{Math.abs(usdMetric?.low || 0).toLocaleString()}, {Math.abs(usdMetric?.high || 0).toLocaleString()}]
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: '#475569' }}>
                          {pol.confidence_rationale.split(':')[0]}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
