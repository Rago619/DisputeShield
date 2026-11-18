import React from 'react'
import { Download, FileText } from '../icons'

export function ExportBar() {
  const exports = [
    {
      name: "payment_predictions.csv",
      title: "Payment Predictions",
      desc: "One row per uploaded payment with invoice & payment win probabilities, risk tier, and expected loss.",
      url: "/api/export/payments"
    },
    {
      name: "dispute_predictions.csv",
      title: "Dispute Predictions",
      desc: "One row per uploaded dispute with win probability given evidence and fight/accept recommendation.",
      url: "/api/export/disputes"
    },
    {
      name: "whatif_results.csv",
      title: "What-If Results",
      desc: "Simulated policy changes across disputes, disputes lost, and dollars lost with 95% confidence ranges.",
      url: "/api/export/whatif"
    }
  ]

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '0.5rem',
      padding: '1.25rem',
      border: '1px solid #e2e8f0',
      marginBottom: '1.5rem',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
            Required Submission Exports
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Download predictions and policy evaluation results in the exact CSV formats specified in the brief.
          </p>
        </div>
        <span style={{
          fontSize: '0.75rem',
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          padding: '0.2rem 0.6rem',
          borderRadius: '9999px',
          fontWeight: 600,
          border: '1px solid #bfdbfe'
        }}>
          3 Formats Ready
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem'
      }}>
        {exports.map((exp, idx) => (
          <div key={idx} style={{
            padding: '1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <FileText style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{exp.title}</span>
              </div>
              <code style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                {exp.name}
              </code>
              <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                {exp.desc}
              </p>
            </div>
            <a
              href={exp.url}
              download={exp.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                backgroundColor: '#ffffff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '0.45rem 0.8rem',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.color = '#2563eb'
              }}
            >
              <Download style={{ width: '0.85rem', height: '0.85rem' }} />
              Export {exp.name}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
