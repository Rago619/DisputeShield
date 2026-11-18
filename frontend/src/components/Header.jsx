import React from 'react'
import { Shield, RefreshCw, Upload, Activity } from '../icons'

export function Header({ kpis, onReset, onOpenUpload, loading }) {
  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '1rem 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield style={{ width: '1.75rem', height: '1.75rem' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em' }}>
                DisputeShield
              </h1>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '0.15rem 0.45rem',
                borderRadius: '0.25rem',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe'
              }}>
                v2.0 Tri-Stage
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Payment Risk Assessment & Autonomous Dispute Protection
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: kpis?.is_custom_data ? '#fef3c7' : '#f1f5f9',
            color: kpis?.is_custom_data ? '#92400e' : '#475569',
            border: `1px solid ${kpis?.is_custom_data ? '#fde68a' : '#e2e8f0'}`
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: kpis?.is_custom_data ? '#d97706' : '#10b981'
            }}></span>
            <span style={{ fontWeight: 500 }}>
              {kpis?.data_source_name || "Baseline Data"}
            </span>
          </div>

          <button
            onClick={onOpenUpload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 0.9rem',
              borderRadius: '0.375rem',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            <Upload style={{ width: '1rem', height: '1rem' }} />
            Upload Data
          </button>

          {kpis?.is_custom_data && (
            <button
              onClick={onReset}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 0.8rem',
                borderRadius: '0.375rem',
                fontSize: '0.85rem',
                fontWeight: 500
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              <RefreshCw style={{ width: '0.9rem', height: '0.9rem' }} />
              Reset
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
