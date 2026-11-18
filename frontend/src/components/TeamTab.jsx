import React, { useState, useEffect } from 'react'
import { Users, AlertTriangle, CheckCircle, FileText, Activity } from '../icons'

export function TeamTab() {
  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(false)

  // Fetch list of all teams
  useEffect(() => {
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => {
        setTeams(data || [])
        if (data && data.length > 0) {
          setSelectedTeamId(data[0].team_id)
        }
      })
      .catch((err) => console.error("Error loading teams:", err))
  }, [])

  // Fetch specific team detail when selectedTeamId changes
  useEffect(() => {
    if (!selectedTeamId) return
    setLoading(true)
    fetch(`/api/teams/${selectedTeamId}`)
      .then((res) => res.json())
      .then((data) => {
        setTeamData(data)
      })
      .catch((err) => console.error("Error loading team detail:", err))
      .finally(() => setLoading(false))
  }, [selectedTeamId])

  const summary = teamData?.summary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Team Selector Header */}
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
            <Users style={{ width: '1.25rem', height: '1.25rem' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Team Deep Dive & Paperwork Gap Analysis
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Select a field-service business to audit its dispute rate, win rate, and operational hygiene.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Pick Team ID:</label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
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
            {teams.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.team_id} — {t.profession} ({t.state}, {t.dispute_count} disputes)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading team profile...
        </div>
      )}

      {!loading && summary && (
        <>
          {/* Team Profile & KPI row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Profession & State</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem', textTransform: 'capitalize' }}>
                {summary.profession}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{summary.state} • Team Size {summary.team_size}</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Volume & Jobs</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                ${(summary.total_volume_usd || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{summary.payment_count} payments</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Dispute Rate</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: summary.dispute_rate > 2.0 ? '#dc2626' : '#0f172a', marginTop: '0.2rem' }}>
                {summary.dispute_rate?.toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{summary.dispute_count} disputes</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Win Rate</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: summary.win_rate > 50 ? '#059669' : '#d97706', marginTop: '0.2rem' }}>
                {summary.win_rate?.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Won with bank evidence</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Total Dollars Lost</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.2rem' }}>
                ${(summary.total_dollars_lost || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Fees + Disputed charge</div>
            </div>
          </div>

          {/* Main Paperwork Gaps Alert Box */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle style={{ width: '1.1rem', height: '1.1rem', color: '#d97706' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                Main Documentation Gaps & Risk Drivers for {summary.team_id}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {summary.main_gaps?.map((gap, i) => (
                <div key={i} style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.375rem',
                  backgroundColor: gap.includes('Strong') ? '#ecfdf5' : '#fff7ed',
                  border: `1px solid ${gap.includes('Strong') ? '#a7f3d0' : '#fed7aa'}`,
                  color: gap.includes('Strong') ? '#065f46' : '#9a3412',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {gap.includes('Strong') ? (
                    <CheckCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  )}
                  <span>{gap}</span>
                </div>
              ))}
            </div>

            {/* Hygiene Progress Bars */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9'
            }}>
              {[
                { label: "Address Present", val: summary.address_present_pct },
                { label: "Completion Signature", val: summary.completion_sig_pct },
                { label: "Signed Estimate", val: summary.signed_estimate_pct },
                { label: "Tech GPS Check-in", val: summary.tech_gps_checkin_pct },
                { label: "Keyed Card Usage", val: summary.keyed_method_pct, isWarning: summary.keyed_method_pct > 20 }
              ].map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', marginBottom: '0.25rem' }}>
                    <span>{item.label}</span>
                    <strong style={{ color: item.isWarning ? '#dc2626' : '#0f172a' }}>{item.val?.toFixed(1)}%</strong>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, item.val || 0)}%`,
                      backgroundColor: item.isWarning ? '#ef4444' : (item.val > 70 ? '#10b981' : '#f59e0b')
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Disputes Table */}
          {teamData?.disputes && teamData.disputes.length > 0 && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                  Disputes Raised on {summary.team_id} ({teamData.disputes.length})
                </h4>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.65rem 1rem' }}>Dispute ID</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Reason</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Amount</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Evidence Submitted</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Win Probability</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Recommendation</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamData.disputes.map((d) => (
                      <tr key={d.dispute_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{d.dispute_id}</td>
                        <td style={{ padding: '0.65rem 1rem', textTransform: 'capitalize' }}>{d.reason?.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>${(d.amount_usd || 0).toFixed(2)}</td>
                        <td style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>
                          {d.evidence_submitted ? d.evidence_submitted.split(';').join(', ') : 'None'}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: d.win_prob > 0.5 ? '#059669' : '#dc2626' }}>
                          {((d.win_prob || 0) * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: d.recommendation === 'fight' ? '#ecfdf5' : '#fef2f2',
                            color: d.recommendation === 'fight' ? '#065f46' : '#991b1b',
                            textTransform: 'uppercase'
                          }}>
                            {d.recommendation}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', textTransform: 'capitalize', fontWeight: 500 }}>
                          {d.actual_outcome || "Pending"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
